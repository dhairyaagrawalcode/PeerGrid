// Isolated PostgreSQL integration tests. Never reads .env or connects to Supabase.
// PEERGRID_PGLITE_DIR=/absolute/path/node_modules/@electric-sql/pglite node scripts/test-admin-db.mjs
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { hashAdminToken } from "../app/lib/admin-password-crypto.ts";

if (!process.env.PEERGRID_PGLITE_DIR) throw new Error("Set PEERGRID_PGLITE_DIR to an isolated @electric-sql/pglite installation.");
const runtime = pathToFileURL(path.join(process.env.PEERGRID_PGLITE_DIR, "dist/"));
const { PGlite } = await import(new URL("index.js", runtime));
const { citext } = await import(new URL("contrib/citext.js", runtime));
const { pgcrypto } = await import(new URL("contrib/pgcrypto.js", runtime));
const { pg_trgm } = await import(new URL("contrib/pg_trgm.js", runtime));
const db = new PGlite({ extensions: { citext, pgcrypto, pg_trgm } });
const admin = "10000000-0000-4000-8000-000000000001", alice = "10000000-0000-4000-8000-000000000002", bob = "10000000-0000-4000-8000-000000000003";
let checks = 0;
async function check(label, run) { await run(); checks++; console.log("PASS", label); }
async function scalar(sql, params = []) { return Object.values((await db.query(sql, params)).rows[0])[0]; }
async function asUser(user, role = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user || ""]);
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
  await db.exec(`set role ${role}`);
}
async function denied(sql, params = []) { await assert.rejects(db.query(sql, params), /ADMIN_REQUIRED|permission denied|PEERGRID_ACCESS_RESTRICTED|row-level security/); }

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create role supabase_auth_admin; create role authenticator;
    create schema auth; create schema storage; create schema extensions;
    grant usage on schema public,auth,storage,extensions to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
    create table auth.users(id uuid primary key, email text unique, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
    create publication supabase_realtime;
  `);
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(migrations)).filter(name => name.endsWith(".sql")).sort()) {
    // Validate the first admin migration before checking its password-only replacement below.
    if (name >= "20260902010000_password_admin_sessions.sql") continue;
    if (name.startsWith("20260902")) {
      await db.exec(`insert into auth.users(id,email,email_confirmed_at) values
        ('${admin}','dhairyaagrawalcode@gmail.com',now()),('${alice}','alice@example.test',now()),('${bob}','bob@example.test',now());
        update public.student_approvals set status='approved';
        update public.profiles set is_verified=true,full_name=case id when '${admin}' then 'Owner' when '${alice}' then 'Alice' else 'Bob' end;
      `);
    }
    try { await db.exec(await readFile(new URL(name, migrations), "utf8")); console.log("MIGRATION", name); }
    catch (error) { throw new Error(`${name}: ${error.message} (position ${error.position || error.internalPosition})`); }
  }
  await check("only the allowlisted confirmed account is admin", async () => {
    await asUser(admin); assert.equal(await scalar("select public.is_peergrid_admin()"), true);
    await asUser(alice); assert.equal(await scalar("select public.is_peergrid_admin()"), false);
    await denied("select * from peergrid_private.admin_allowlist");
    await denied("insert into peergrid_private.admin_allowlist(user_id,email) values($1,'alice@example.test')", [alice]);
    for (const fn of ["admin_overview","admin_list_users","admin_list_issues","admin_audit_events","admin_moderation_reports"]) await denied(`select public.${fn}()`);
    await denied("select public.admin_set_account_status($1,'suspended','forged')", [bob]);
    await denied("select public.admin_set_maintenance(true,'forged','')");
    await denied("select public.admin_update_issue(gen_random_uuid(),'closed','forged')");
    await denied("select * from peergrid_private.admin_audit_log");
    await asUser(null,"anon"); await denied("select public.admin_overview()");
  });
  await check("admin queries run and return bounded aggregate data", async () => {
    await asUser(admin);
    const overview = await scalar("select public.admin_overview()");
    assert.equal(overview.total_users,3); assert.equal(overview.signups.length,30); assert.equal(overview.active_hours.length,24);
    assert.equal((await scalar("select public.admin_list_users('alice')"))[0].id,alice);
    assert.ok(Array.isArray(await scalar("select public.admin_moderation_reports()")));
    await assert.rejects(db.query("select public.admin_set_account_status($1,'suspended','')",[admin]),/CANNOT_CHANGE_ADMIN/);
  });
  await check("issue reporting is owner-bound, private, rate-limited and auditable", async () => {
    await asUser(alice);
    const issue = await scalar("select public.submit_issue_report('bug','Cannot upload','Upload fails every time','/profile?secret=test')");
    assert.equal(await scalar("select source_path from public.issue_reports where id=$1",[issue]),"/profile");
    await denied("update public.issue_reports set status='resolved' where id=$1",[issue]);
    await asUser(bob); assert.equal(Number(await scalar("select count(*) from public.issue_reports")),0);
    await asUser(admin);
    assert.equal((await scalar("select public.admin_list_issues('alice','new','bug')")).length,1);
    await db.query("select public.admin_update_issue($1,'investigating','triaged')",[issue]);
    assert.equal((await scalar("select public.admin_list_issues('','investigating')"))[0].status,"investigating");
    assert.equal((await scalar("select public.admin_audit_events()"))[0].action,"issue_investigating");
    await asUser(alice);
    for(let i=0;i<4;i++) await db.query("select public.submit_issue_report('bug','Another bug','Enough detail here','/feed')");
    await assert.rejects(db.query("select public.submit_issue_report('bug','Rate limit','Enough detail here','/feed')"),/ISSUE_RATE_LIMIT/);
  });
  await check("suspension blocks RLS and old SECURITY DEFINER API calls; restore works", async () => {
    await asUser(alice); assert.equal(await scalar("select public.is_verified_student()"),true);
    await asUser(admin); await db.query("select public.admin_set_account_status($1,'suspended','test')",[alice]);
    await asUser(alice); assert.equal(await scalar("select public.can_use_peergrid()"),false);
    assert.equal(Number(await scalar("select count(*) from public.profiles")),0);
    assert.equal((await db.query("update public.profiles set full_name='Bypass' where id=$1 returning id",[alice])).rows.length,0);
    await denied("insert into storage.objects(bucket_id,name,owner_id) values('avatars',$1,$2)",[alice+"/new.png",alice]);
    await denied("update peergrid_private.account_states set status='active' where user_id=$1",[alice]);
    await db.query("select set_config('request.path','/rpc/refresh_profile_verification',false)");
    await denied("select public.peergrid_check_request()");
    await db.query("select set_config('request.path','/rpc/get_platform_access',false)");
    await db.query("select public.peergrid_check_request()");
    assert.equal((await scalar("select public.get_platform_access()")).account_status,"suspended");
    await denied("select public.record_user_activity()");
    await asUser(admin); await db.query("select public.admin_set_account_status($1,'active','restored')",[alice]);
    await asUser(alice); assert.equal(await scalar("select public.can_use_peergrid()"),true);
    assert.equal(await scalar("select public.is_verified_student()"),true);
  });
  await check("maintenance denies ordinary and anonymous access; admin retains control", async () => {
    await asUser(admin); await db.query("select public.admin_set_maintenance(true,'Test maintenance','deployment')");
    assert.equal(await scalar("select public.can_use_peergrid()"),true);
    assert.equal((await scalar("select public.admin_overview()")).total_users,3);
    await asUser(alice);
    await db.query("select set_config('request.path','/profiles',false)");
    await denied("select public.peergrid_check_request()");
    assert.equal(Number(await scalar("select count(*) from public.profiles")),0);
    await denied("select public.submit_issue_report('bug','Bypass issue','Should be blocked','/feed')");
    await asUser(null,"anon"); assert.equal(await scalar("select public.can_use_peergrid()"),false);
    await asUser(admin); await db.query("select public.admin_set_maintenance(false,'Available','done')");
    await asUser(alice); assert.equal(await scalar("select public.can_use_peergrid()"),true);
  });
  await check("activity writes are throttled and analytics use distinct users", async () => {
    await asUser(alice); assert.equal(await scalar("select public.record_user_activity()"),true);
    assert.equal(await scalar("select public.record_user_activity()"),false);
    await asUser(admin); const overview=await scalar("select public.admin_overview()");
    assert.equal(overview.daily_active,1); assert.equal(overview.weekly_active,1);
    assert.equal(overview.monthly_active,1); assert.equal(overview.recently_active,1);
  });
  await check("clear and mark-read affect only own notifications and preserve records", async () => {
    await db.exec("reset role");
    await db.query("insert into public.notifications(recipient_id,actor_id,type) values($1,$2,'new_follower'),($2,$1,'new_follower')",[alice,bob]);
    await asUser(alice); assert.equal(Number(await scalar("select public.get_unread_notification_count()")),1);
    await db.query("select public.mark_notifications_read(null)");
    assert.equal(Number(await scalar("select public.get_unread_notification_count()")),0);
    assert.equal(Number(await scalar("select count(*) from public.notifications where cleared_at is null")),1);
    await db.query("select public.clear_notifications()");
    assert.equal(Number(await scalar("select count(*) from public.notifications where cleared_at is null")),0);
    await asUser(bob); assert.equal(Number(await scalar("select public.get_unread_notification_count()")),1);
    await db.exec("reset role");
    assert.equal(Number(await scalar("select count(*) from public.notifications")),2);
    await db.query("insert into public.notifications(recipient_id,actor_id,type) values($1,$2,'new_follower')",[alice,admin]);
    await asUser(alice); assert.equal(Number(await scalar("select public.get_unread_notification_count()")),1);
    assert.equal(Number(await scalar("select count(*) from public.notifications where cleared_at is null")),1);
  });
  await check("disabled and removed states preserve contributions but block access", async () => {
    for (const status of ["disabled","removed"]) {
      await asUser(admin); await db.query("select public.admin_set_account_status($1,$2,'account review')",[bob,status]);
      await asUser(bob); assert.equal(await scalar("select public.can_use_peergrid()"),false);
      await denied("select public.clear_notifications()");
      await asUser(admin); assert.equal((await scalar("select public.admin_list_users('bob')"))[0].account_status,status);
    }
    await asUser(admin); await db.query("select public.admin_set_account_status($1,'active','restored')",[bob]);
    await asUser(bob); assert.equal(await scalar("select public.can_use_peergrid()"),true);
  });
  await check("analytics and search remain bounded with 1,000 accounts", async () => {
    await db.exec("reset role");
    await db.exec("insert into auth.users(id,email,email_confirmed_at) select gen_random_uuid(),'scale-'||n||'@example.test',now() from generate_series(1,997) n");
    await asUser(admin);
    const started = performance.now();
    assert.equal((await scalar("select public.admin_overview()")).total_users,1000);
    assert.equal((await scalar("select public.admin_list_users('scale')")).length,31);
    console.log("1,000-user overview + paginated search:",Math.round(performance.now()-started),"ms (isolated runtime)");
  });
  await check("changing the allowlisted account email revokes admin privileges", async () => {
    await db.exec("reset role"); await db.query("update auth.users set email='changed@example.test' where id=$1",[admin]);
    await asUser(admin); assert.equal(await scalar("select public.is_peergrid_admin()"),false);
    await denied("select public.admin_overview()");
  });
  await db.exec("reset role");
  await db.exec(await readFile(new URL("20260902010000_password_admin_sessions.sql",migrations),"utf8"));
  console.log("MIGRATION 20260902010000_password_admin_sessions.sql");
  const token="ab".repeat(32), sessionHash=hashAdminToken(token), fingerprint="cd".repeat(32);
  let sessionId;
  await check("password-only mode denies student JWTs and bare server requests",async () => {
    await asUser(alice);
    assert.equal(await scalar("select public.is_peergrid_admin()"),false);
    await denied("select public.admin_overview()");
    await denied("select public.admin_password_login_attempt()");
    await denied("select public.admin_password_create_session($1,$2)",[sessionHash,fingerprint]);
    await asUser(null,"service_role"); await denied("select public.admin_overview()");
  });
  await check("password login attempts are atomically limited across server instances",async () => {
    for(let i=0;i<10;i++) assert.equal(await scalar("select public.admin_password_login_attempt()"),true);
    assert.equal(await scalar("select public.admin_password_login_attempt()"),false);
    await db.exec("reset role");
    await db.exec("update peergrid_private.password_admin_login_limit set window_start=now()-interval '16 minutes'");
    await asUser(null,"service_role");
    assert.equal(await scalar("select public.admin_password_login_attempt()"),true);
  });
  await check("a valid password session authorizes existing admin RPCs and audit",async () => {
    sessionId=await scalar("select public.admin_password_create_session($1,$2)",[sessionHash,fingerprint]);
    assert.equal(await scalar("select public.admin_password_validate_session($1,$2)",[sessionHash,fingerprint]),sessionId);
    assert.equal(await scalar("select public.admin_password_validate_session($1,$2)",[sessionHash,"ef".repeat(32)]),null);
    await db.query("select set_config('request.headers',$1,false)",[JSON.stringify({"x-peergrid-admin-session":token})]);
    assert.equal(await scalar("select public.is_peergrid_admin()"),true);
    assert.equal((await scalar("select public.admin_overview()")).total_users,1000);
    await db.query("select public.admin_set_account_status($1,'suspended','password-admin test')",[bob]);
    const event=(await scalar("select public.admin_audit_events()"))[0];
    assert.equal(event.admin_id,sessionId); assert.equal(event.admin_email,"Password admin");
  });
  await check("forged session header on an ordinary user cannot confer admin privileges",async () => {
    await asUser(alice);
    assert.equal(await scalar("select public.is_peergrid_admin()"),false);
    await denied("select public.admin_overview()");
    await denied("select * from peergrid_private.password_admin_sessions");
    await denied("select public.admin_password_validate_session($1,$2)",[sessionHash,fingerprint]);
  });
  await check("password administrator can log in and disable maintenance without a student session",async () => {
    await asUser(null,"service_role");
    await db.query("select public.admin_set_maintenance(true,'Maintenance','test')");
    await db.query("select set_config('request.headers','{}',false)");
    await db.query("select set_config('request.path','/rpc/admin_password_login_attempt',false)");
    await db.query("select public.peergrid_check_request()");
    await asUser(alice); await denied("select public.peergrid_check_request()");
    await asUser(null,"service_role");
    await db.query("select set_config('request.headers',$1,false)",[JSON.stringify({"x-peergrid-admin-session":token})]);
    await db.query("select public.admin_set_maintenance(false,'Ready','test')");
    await db.query("select public.admin_set_account_status($1,'active','restored')",[bob]);
  });
  await db.exec("reset role");
  await db.exec(await readFile(new URL("20260902020000_admin_data_consistency_and_live_updates.sql",migrations),"utf8"));
  console.log("MIGRATION 20260902020000_admin_data_consistency_and_live_updates.sql");
  await check("directory distinguishes real Auth accounts from real profile rows",async () => {
    const missing="10000000-0000-4000-8000-000000000004";
    await db.query("insert into auth.users(id,email) values($1,'no-profile@example.test')",[missing]);
    await db.query("delete from public.profiles where id=$1",[missing]);
    await db.query("delete from public.student_approvals where user_id=$1",[missing]);
    const expectedProfiles=Number(await scalar("select count(*) from public.profiles"));
    await asUser(null,"service_role");
    const overview=await scalar("select public.admin_overview_snapshot()");
    const all=await scalar("select public.admin_user_directory()");
    assert.equal(overview.total_users,1001); assert.equal(all.total_accounts,1001);
    assert.equal(overview.profile_count,expectedProfiles); assert.equal(all.profile_count,expectedProfiles);
    assert.equal(all.accounts_without_profile,1); assert.equal(overview.accounts_without_profile,1);
    const profiles=await scalar("select public.admin_user_directory('',0,'profiles')");
    assert.equal(profiles.matching_count,expectedProfiles); assert.ok(profiles.items.every(p=>p.has_profile));
    const onlyMissing=await scalar("select public.admin_user_directory('',0,'without_profile')");
    assert.equal(onlyMissing.matching_count,1); assert.equal(onlyMissing.items[0].id,missing);
    assert.equal(onlyMissing.items[0].approval_status,null); assert.equal(onlyMissing.items[0].profile_created_at,null);
    await assert.rejects(db.query("select public.admin_user_directory('',0,'invalid')"),/INVALID_PROFILE_FILTER/);
  });
  await check("directory fields, counts and pagination match source SQL, including direct edits",async () => {
    await db.exec("reset role");
    await db.query("update public.profiles set full_name='Updated Alice',graduation_year=2031 where id=$1",[alice]);
    await db.query("insert into public.social_posts(author_id,body) values($1,'Built a useful project'),($1,'Built a useful project')",[alice]);
    await db.query("insert into public.follows(follower_id,following_id) values($1,$2) on conflict do nothing",[bob,alice]);
    const expected={
      posts:Number(await scalar("select count(*) from public.social_posts where author_id=$1",[alice])),
      followers:Number(await scalar("select count(*) from public.follows where following_id=$1",[alice])),
      collaborations:Number(await scalar("select count(*) from public.collaboration_posts where author_id=$1",[alice]))
    };
    await asUser(null,"service_role");
    const row=(await scalar("select public.admin_user_directory('Updated Alice')")).items[0];
    assert.equal(row.full_name,'Updated Alice'); assert.equal(row.graduation_year,2031);
    for(const field of Object.keys(expected)) assert.equal(row[field],expected[field]);
    const first=await scalar("select public.admin_user_directory('scale',0,'profiles')");
    const second=await scalar("select public.admin_user_directory('scale',30,'profiles')");
    assert.equal(first.matching_count,997); assert.equal(first.items.length,31);
    assert.equal(second.items[0].id,first.items[30].id);
    assert.ok(!second.items.slice(0,30).some(r=>first.items.slice(0,30).some(p=>p.id===r.id)));
  });
  await check("live revision catches direct writes and deletes, batches once, and rolls back",async () => {
    await db.exec("reset role");
    const revision=()=>scalar("select revision::text from peergrid_private.admin_data_revision");
    const before=BigInt(await revision());
    await db.exec("begin");
    await db.query("update public.profiles set full_name='New Bob' where id=$1",[bob]);
    await db.query("delete from public.social_posts where author_id=$1",[alice]);
    assert.equal(BigInt(await revision()),before+1n);
    await db.exec("rollback"); assert.equal(BigInt(await revision()),before);
    await db.query("delete from public.follows where follower_id=$1 and following_id=$2",[bob,alice]);
    assert.equal(BigInt(await revision()),before+1n);
    // Every dashboard source has a statement trigger; no payload contains source row data.
    const sources=(await db.query("select tgrelid::regclass::text source from pg_trigger where tgname='admin_data_changed' order by 1")).rows;
    assert.equal(sources.length,15);
    assert.equal(Number(await scalar("select count(*) from pg_publication_tables where pubname='supabase_realtime' and schemaname='peergrid_private' and tablename='admin_data_revision'")),1);
    await asUser(null,"service_role");
    const version=await scalar("select public.admin_data_version()");
    assert.equal(version.revision,(before+1n).toString()); assert.equal(typeof version.time_bucket,'string');
    assert.deepEqual(Object.keys(version).sort(),['checked_at','revision','time_bucket']);
  });
  await check("new dashboard data and revision remain inaccessible without a live admin session",async () => {
    for(const role of ['anon','authenticated']) {
      await asUser(alice,role);
      for(const fn of ['admin_data_version','admin_overview_snapshot','admin_user_directory']) await denied(`select public.${fn}()`);
      await denied("select * from peergrid_private.admin_data_revision");
      await denied("update peergrid_private.admin_data_revision set revision=999");
    }
    await asUser(null,'service_role');
    await denied("update peergrid_private.admin_data_revision set revision=999");
    await db.query("select set_config('request.headers','{}',false)");
    for(const fn of ['admin_data_version','admin_overview_snapshot','admin_user_directory']) await denied(`select public.${fn}()`);
    await db.query("select set_config('request.headers',$1,false)",[JSON.stringify({'x-peergrid-admin-session':token})]);
  });
  await check("expired and logged-out admin sessions lose authorization",async () => {
    await db.exec("reset role");
    await db.query("update peergrid_private.password_admin_sessions set expires_at=now()-interval '1 second' where token_hash=$1",[sessionHash]);
    await asUser(null,"service_role");
    assert.equal(await scalar("select public.admin_password_validate_session($1,$2)",[sessionHash,fingerprint]),null);
    await denied("select public.admin_overview()");
    await denied("select public.admin_data_version()");
    await db.exec("reset role");
    await db.query("update peergrid_private.password_admin_sessions set expires_at=now()+interval '1 hour' where token_hash=$1",[sessionHash]);
    await asUser(null,"service_role");
    await db.query("select public.admin_password_end_session($1)",[sessionHash]);
    assert.equal(await scalar("select public.is_peergrid_admin()"),false);
    await denied("select public.admin_overview()");
  });
  console.log(`${checks} integration scenarios passed.`);
} catch (error) {
  console.error("FAIL", error.message, error.detail || "");
  process.exitCode = 1;
} finally { await db.close(); }

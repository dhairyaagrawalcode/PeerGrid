// Executes the product-quality migration against an isolated Postgres-compatible
// runtime. It never reads .env and never connects to Supabase.
// PEERGRID_PGLITE_DIR=/absolute/path/to/@electric-sql/pglite node scripts/test-product-quality-db.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (!process.env.PEERGRID_PGLITE_DIR) throw new Error("Set PEERGRID_PGLITE_DIR to an isolated @electric-sql/pglite installation.");
const runtime = pathToFileURL(path.join(process.env.PEERGRID_PGLITE_DIR, "dist/"));
const { PGlite } = await import(new URL("index.js", runtime));
const db = new PGlite();
const alice = "10000000-0000-4000-8000-000000000001";
const bob = "10000000-0000-4000-8000-000000000002";
const conversation = "20000000-0000-4000-8000-000000000001";
const message = "30000000-0000-4000-8000-000000000001";
let checks = 0;

async function scalar(sql, params = []) { return Object.values((await db.query(sql, params)).rows[0])[0]; }
async function check(label, run) { await run(); checks += 1; console.log("PASS", label); }
async function asUser(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage; create schema peergrid_private;
    grant usage on schema public,auth,storage,peergrid_private to authenticated,service_role;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
    create table auth.users(id uuid primary key,email text,created_at timestamptz default now());
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
    alter table storage.objects enable row level security;
    grant select,insert,delete on storage.objects to authenticated;
    create table public.campuses(id uuid primary key,name text);
    create table public.profiles(id uuid primary key,full_name text,username text,avatar_url text,campus_id uuid,graduation_year integer,created_at timestamptz default now(),is_verified boolean default false);
    create table public.student_approvals(user_id uuid primary key,status text);
    create table public.conversations(id uuid primary key,last_message_at timestamptz);
    create table public.conversation_members(conversation_id uuid,profile_id uuid,primary key(conversation_id,profile_id));
    create table public.messages(id uuid primary key,conversation_id uuid,sender_id uuid,ciphertext text,nonce text,key_envelopes jsonb,encryption_version integer,sender_device_id uuid,signature text,created_at timestamptz default now(),read_at timestamptz);
    alter table public.messages enable row level security;
    grant select on public.conversation_members,public.messages to authenticated;
    create function public.is_verified_student(candidate_profile_id uuid default auth.uid()) returns boolean language sql stable as $$select auth.uid() is not null$$;
    create function public.is_conversation_member(candidate_conversation_id uuid,candidate_profile_id uuid default auth.uid()) returns boolean language sql stable security definer as $$select exists(select 1 from public.conversation_members where conversation_id=candidate_conversation_id and profile_id=candidate_profile_id)$$;
    create policy messages_test_read on public.messages for select to authenticated using(public.is_conversation_member(conversation_id));
    create table public.social_posts(id uuid primary key default gen_random_uuid(),author_id uuid,moderation_status text default 'active');
    create table public.collaboration_posts(id uuid primary key default gen_random_uuid(),author_id uuid);
    create table public.follows(follower_id uuid,following_id uuid);
    create table public.post_reports(id uuid primary key default gen_random_uuid(),reporter_id uuid,post_id uuid);
    create table public.issue_reports(id uuid primary key default gen_random_uuid(),reporter_id uuid,status text default 'new');
    create table peergrid_private.account_states(user_id uuid primary key,status text default 'active');
    create table peergrid_private.user_activity(user_id uuid primary key,last_active_at timestamptz);
    create table peergrid_private.admin_audit_log(id uuid primary key default gen_random_uuid(),admin_id uuid,admin_email text,action text,resource_id uuid,reason text,created_at timestamptz default now());
    create function peergrid_private.assert_admin() returns void language plpgsql as $$begin return; end$$;
    create function public.admin_overview() returns jsonb language sql stable as $$select '{}'::jsonb$$;
  `);
  const migration = new URL("../supabase/migrations/20260905000000_product_quality_pass.sql", import.meta.url);
  await db.exec(await readFile(migration, "utf8"));
  const deletionMigration = new URL("../supabase/migrations/20260908000000_message_deletion.sql", import.meta.url);
  await db.exec(await readFile(deletionMigration, "utf8"));

  await check("private message-media bucket and three member policies exist", async () => {
    const bucket = await scalar("select to_jsonb(bucket) from storage.buckets bucket where id='message-media'");
    assert.equal(bucket.public, false);
    assert.equal(Number(bucket.file_size_limit), 26214432);
    assert.deepEqual(bucket.allowed_mime_types, ["application/octet-stream"]);
    assert.equal(Number(await scalar("select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'message_media_%'")), 3);
  });

  await check("attachment metadata must be complete and path-bound to its message", async () => {
    await db.query("insert into public.conversations(id) values($1)", [conversation]);
    await assert.rejects(db.query("insert into public.messages(id,conversation_id,sender_id,attachment_path) values($1,$2,$3,'invalid.bin')", [message, conversation, alice]), /messages_attachment_/);
    await db.query("insert into public.messages(id,conversation_id,sender_id,attachment_path,attachment_kind,attachment_size) values($1,$2,$3,$4,'image',1024)", [message, conversation, alice, `${alice}/${conversation}/${message}.bin`]);
  });

  await check("only conversation members can upload and read referenced ciphertext", async () => {
    await db.query("insert into public.conversation_members values($1,$2)", [conversation, alice]);
    const objectPath = `${alice}/${conversation}/${message}.bin`;
    await asUser(bob);
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name,owner_id) values('message-media',$1,$2)", [objectPath, bob]), /row-level security/);
    await asUser(alice);
    await db.query("insert into storage.objects(bucket_id,name,owner_id) values('message-media',$1,$2)", [objectPath, alice]);
    assert.equal(Number(await scalar("select count(*) from storage.objects where name=$1", [objectPath])), 1);
    await asUser(bob);
    assert.equal(Number(await scalar("select count(*) from storage.objects where name=$1", [objectPath])), 0);
  });

  await check("only a sender can delete their message and inbox activity is resynchronized", async () => {
    await db.exec("reset role");
    await db.query("insert into public.conversation_members values($1,$2) on conflict do nothing", [conversation, bob]);
    await db.query("update public.conversations set last_message_at=(select max(created_at) from public.messages where conversation_id=$1) where id=$1", [conversation]);
    await asUser(bob);
    await db.query("delete from public.messages where id=$1", [message]);
    await db.exec("reset role");
    assert.equal(Number(await scalar("select count(*) from public.messages where id=$1", [message])), 1);
    await asUser(alice);
    await db.query("delete from public.messages where id=$1", [message]);
    await db.exec("reset role");
    assert.equal(Number(await scalar("select count(*) from public.messages where id=$1", [message])), 0);
    assert.equal(await scalar("select last_message_at from public.conversations where id=$1", [conversation]), null);
  });

  await check("advanced admin filters return source-derived, bounded results", async () => {
    await db.exec("reset role");
    const campus = "40000000-0000-4000-8000-000000000001";
    await db.query("insert into public.campuses values($1,'NST Test')", [campus]);
    await db.query("insert into auth.users(id,email,created_at) values($1,'alice@example.test',now()-interval '2 days'),($2,'bob@example.test',now())", [alice, bob]);
    await db.query("insert into public.profiles(id,full_name,username,campus_id,graduation_year,is_verified) values($1,'Alice','alice',$3,2030,true),($2,'Bob','bob',$3,2031,false)", [alice, bob, campus]);
    await db.query("insert into public.social_posts(author_id) values($1),($1)", [alice]);
    await db.exec("set role service_role");
    const options = await scalar("select public.admin_user_filter_options()");
    assert.deepEqual(options.years, [2030, 2031]);
    const result = await scalar("select public.admin_user_directory('',0,'profiles',null,null,'all','verified',null,null,null,null,'has_posts','most_posts')");
    assert.equal(result.matching_count, 1);
    assert.equal(result.items[0].id, alice);
    assert.equal(result.items[0].posts, 2);
    await assert.rejects(db.query("select public.admin_user_directory('',0,'all',null,null,'all','all',null,null,null,null,'invalid','newest')"), /INVALID_ADMIN_FILTER/);
  });

  console.log(`${checks} product-quality database scenarios passed.`);
} catch (error) {
  console.error("FAIL", error.message, error.detail || "");
  process.exitCode = 1;
} finally {
  await db.close();
}

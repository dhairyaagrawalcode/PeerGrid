// Disposable PostgreSQL benchmark. Does not read .env or connect to a live database.
// PEERGRID_PGLITE_DIR=/path/to/node_modules/@electric-sql/pglite node scripts/benchmark-queries.mjs
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
if (!process.env.PEERGRID_PGLITE_DIR) throw new Error("Set PEERGRID_PGLITE_DIR to an isolated PGlite installation");
const runtime = pathToFileURL(path.join(process.env.PEERGRID_PGLITE_DIR, "dist/"));
const { PGlite } = await import(new URL("index.js", runtime));
const { citext } = await import(new URL("contrib/citext.js", runtime));
const { pgcrypto } = await import(new URL("contrib/pgcrypto.js", runtime));
const { pg_trgm } = await import(new URL("contrib/pg_trgm.js", runtime));
const db = new PGlite({ extensions: { citext, pgcrypto, pg_trgm } });
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
  const migrationDir = new URL('../supabase/migrations/', import.meta.url);
  const migrations = (await readdir(migrationDir)).filter(n=>n.endsWith('.sql')).sort();
  for (const migration of migrations) await db.exec(await readFile(new URL(migration,migrationDir),'utf8'));

  await db.exec(`
    insert into auth.users(id,email,email_confirmed_at)
      select md5('user-'||n)::uuid,'bench-'||n||'@example.test',now() from generate_series(1,1000) n;
    update public.student_approvals set status='approved';
    update public.profiles set is_verified=true, campus_id=(select id from public.campuses order by id limit 1), full_name='Student '||left(id::text,8), username='student_'||left(replace(id::text,'-',''),20);
  `);
  await db.exec(`
    insert into public.social_posts(id,author_id,body,created_at)
      select md5('post-'||n)::uuid, md5('user-'||(1+(n%1000)))::uuid,
        'A unique engineering project update '||n, now()-(n||' minutes')::interval
      from generate_series(1,5000) n;
    insert into public.post_likes(post_id,user_id)
      select md5('post-'||n)::uuid,md5('user-'||(1+((n+k)%1000)))::uuid
      from generate_series(1,5000) n cross join generate_series(1,3) k;
    insert into public.post_comments(post_id,author_id,body)
      select md5('post-'||n)::uuid,md5('user-'||(1+((n+7)%1000)))::uuid,'Useful engineering update '||n
      from generate_series(1,1000) n;
    analyze;
    select set_config('request.jwt.claim.sub',md5('user-1')::uuid::text,false),
      set_config('request.jwt.claim.role','authenticated',false);
    set role authenticated;
  `);
  const queries = [
    ["ranked feed (12 of 5000)", "select * from public.get_ranked_feed(12,0)"],
    ["profile posts", "select id,created_at from public.social_posts where author_id=auth.uid() and moderation_status='published' order by created_at desc limit 13"],
    ["search (31 of 1000)", "select * from public.search_student_profiles('Student',31,0)"],
    ["people recommendations", "select * from public.get_profile_matches(4)"],
    ["notifications", "select id,created_at from public.notifications where recipient_id=auth.uid() and cleared_at is null order by created_at desc limit 8"],
  ];
  for (const [label, sql] of queries) {
    for (let sample=1;sample<=2;sample++) {
      const started=performance.now();
      const result=await db.query(sql);
      console.log(JSON.stringify({label,sample,rows:result.rows.length,ms:Math.round(performance.now()-started)}));
      if(label.startsWith("ranked")) assert.equal(result.rows.length,12);
      if(label.startsWith("search")) assert.equal(result.rows.length,31);
      if(label.startsWith("people")) assert.equal(result.rows.length,4);
    }
    if (process.env.PEERGRID_BENCH_SAMPLE_ONLY !== "1") {
      const plan=await db.query("explain (analyze, buffers, format json) "+sql);
      console.log(JSON.stringify({label,plan:plan.rows[0]["QUERY PLAN"]}));
    }
  }
} catch (error) { console.error(error.message); process.exitCode=1; }
finally { await db.close(); }

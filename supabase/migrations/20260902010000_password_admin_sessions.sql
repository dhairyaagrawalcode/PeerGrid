-- Temporary password-only administration. Apply after private_admin_and_operations.
-- No student account (or email allowlist entry) confers admin access in this mode.
-- The Next.js server verifies a scrypt password hash and issues opaque one-hour sessions.

create table peergrid_private.password_admin_sessions (
  id uuid not null default gen_random_uuid() unique,
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  password_fingerprint text not null check (password_fingerprint ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null default now() + interval '1 hour',
  created_at timestamptz not null default now()
);
create index password_admin_sessions_expiry_idx on peergrid_private.password_admin_sessions(expires_at);
create table peergrid_private.password_admin_login_limit (
  singleton boolean primary key default true check (singleton),
  window_start timestamptz not null default now(),
  attempts integer not null default 0 check (attempts between 0 and 10)
);
insert into peergrid_private.password_admin_login_limit(singleton) values(true);
alter table peergrid_private.password_admin_sessions enable row level security;
alter table peergrid_private.password_admin_login_limit enable row level security;
revoke all on peergrid_private.password_admin_sessions, peergrid_private.password_admin_login_limit from public, anon, authenticated, service_role;

create function peergrid_private.assert_admin_server() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'ADMIN_SERVER_REQUIRED' using errcode='42501'; end if;
end;
$$;

create function peergrid_private.password_admin_session_id() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare bearer text; session_id uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role' then return null; end if;
  bearer := coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb ->> 'x-peergrid-admin-session';
  if bearer is null or bearer !~ '^[a-f0-9]{64}$' then return null; end if;
  select s.id into session_id from peergrid_private.password_admin_sessions s
  where s.token_hash=encode(extensions.digest(bearer,'sha256'),'hex') and s.expires_at > now();
  return session_id;
end;
$$;

create or replace function public.is_peergrid_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select peergrid_private.password_admin_session_id() is not null;
$$;

create function public.admin_password_login_attempt() returns boolean
language plpgsql security definer set search_path = '' as $$
declare state peergrid_private.password_admin_login_limit%rowtype;
begin
  perform peergrid_private.assert_admin_server();
  select * into state from peergrid_private.password_admin_login_limit where singleton for update;
  if state.window_start <= now()-interval '15 minutes' then
    update peergrid_private.password_admin_login_limit set attempts=1,window_start=now() where singleton;
    return true;
  end if;
  if state.attempts >= 10 then return false; end if;
  update peergrid_private.password_admin_login_limit set attempts=attempts+1 where singleton;
  return true;
end;
$$;

create function public.admin_password_create_session(session_hash text, key_fingerprint text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare session_id uuid;
begin
  perform peergrid_private.assert_admin_server();
  -- Only the trusted server calls this, after password verification.
  delete from peergrid_private.password_admin_sessions where expires_at <= now();
  insert into peergrid_private.password_admin_sessions(token_hash,password_fingerprint)
  values(session_hash,key_fingerprint) returning id into session_id;
  insert into peergrid_private.admin_audit_log(admin_id,admin_email,action,resource_id)
  values(session_id,'Password admin','admin_login',session_id::text);
  return session_id;
end;
$$;

create function public.admin_password_validate_session(session_hash text, key_fingerprint text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare session_id uuid;
begin
  perform peergrid_private.assert_admin_server();
  select s.id into session_id from peergrid_private.password_admin_sessions s
  where s.token_hash=session_hash and s.password_fingerprint=key_fingerprint and s.expires_at > now();
  return session_id;
end;
$$;

create function public.admin_password_end_session(session_hash text) returns void
language plpgsql security definer set search_path = '' as $$
declare session_id uuid;
begin
  perform peergrid_private.assert_admin_server();
  delete from peergrid_private.password_admin_sessions where token_hash=session_hash returning id into session_id;
  if session_id is not null then
    insert into peergrid_private.admin_audit_log(admin_id,admin_email,action,resource_id)
    values(session_id,'Password admin','admin_logout',session_id::text);
  end if;
end;
$$;

create or replace function peergrid_private.audit(action_name text, resource text, action_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform peergrid_private.assert_admin();
  insert into peergrid_private.admin_audit_log(admin_id,admin_email,action,resource_id,reason)
  values(peergrid_private.password_admin_session_id(),'Password admin',action_name,resource,nullif(trim(action_reason),''));
end;
$$;

create or replace function public.admin_set_account_status(target_user_id uuid, new_status text, admin_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare old_status text;
begin
  perform peergrid_private.assert_admin();
  if new_status is null or new_status not in ('active','suspended','disabled','removed') or char_length(coalesce(admin_reason,'')) > 500 then
    raise exception 'INVALID_ACCOUNT_ACTION'; end if;
  perform 1 from auth.users where id=target_user_id for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  select status into old_status from peergrid_private.account_states where user_id=target_user_id;
  if coalesce(old_status,'active')=new_status then return; end if;
  insert into peergrid_private.account_states(user_id,status,reason)
  values(target_user_id,new_status,nullif(trim(admin_reason),''))
  on conflict(user_id) do update set status=excluded.status,reason=excluded.reason,updated_at=now();
  perform peergrid_private.audit('account_'||new_status,target_user_id::text,admin_reason);
end;
$$;

create or replace function public.admin_list_users(search_text text default '', result_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform peergrid_private.assert_admin();
  select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) into result from (
    select u.id,u.email,u.created_at,p.full_name,p.username,p.avatar_url,c.name campus,
      p.graduation_year,coalesce(s.status,'active') account_status,a.last_active_at,ap.status::text approval_status,
      (select count(*) from public.social_posts where author_id=u.id) posts,
      (select count(*) from public.collaboration_posts where author_id=u.id) collaborations,
      (select count(*) from public.follows where following_id=u.id) followers,
      (select count(*) from public.follows where follower_id=u.id) following,
      false is_admin
    from auth.users u left join public.profiles p on p.id=u.id
    left join public.campuses c on c.id=p.campus_id
    left join public.student_approvals ap on ap.user_id=u.id
    left join peergrid_private.account_states s on s.user_id=u.id
    left join peergrid_private.user_activity a on a.user_id=u.id
    where coalesce(search_text,'')='' or concat_ws(' ',p.full_name,p.username,u.email,u.id::text,c.name) ilike '%'||left(search_text,120)||'%'
    order by u.created_at desc,u.id limit 31 offset least(greatest(result_offset,0),100000)
  ) rows;
  return result;
end;
$$;

create or replace function public.peergrid_check_request() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if current_setting('request.path',true) in ('/rpc/get_platform_access','/rpc/is_peergrid_admin') then return; end if;
  if auth.role()='service_role' and current_setting('request.path',true) in (
    '/rpc/admin_password_login_attempt','/rpc/admin_password_create_session',
    '/rpc/admin_password_validate_session','/rpc/admin_password_end_session'
  ) then return; end if;
  perform peergrid_private.assert_product_access();
end;
$$;

-- Admin RPCs are now exclusively server-to-server, not callable using a student JWT.
-- Existing admin RPCs still assert a non-expired opaque session in their body.
revoke all on all functions in schema peergrid_private from public,anon,authenticated,service_role;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'admin_%'
  loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end;
$$;
grant execute on function public.is_peergrid_admin(),public.can_use_peergrid(),public.get_platform_access(),public.peergrid_check_request() to service_role;
notify pgrst,'reload schema';

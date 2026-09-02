-- Private administration. Apply before deploying the admin UI.
create schema if not exists peergrid_private;
revoke all on schema peergrid_private from public, anon, authenticated;
create table peergrid_private.admin_allowlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(trim(email))),
  created_at timestamptz not null default now()
);
-- Bind only an already-confirmed account. If absent, use the documented bootstrap SQL later.
insert into peergrid_private.admin_allowlist(user_id, email)
select id, lower(email) from auth.users
where lower(email) = 'dhairyaagrawalcode@gmail.com' and email_confirmed_at is not null
on conflict do nothing;

create table peergrid_private.account_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended','disabled','removed')),
  reason text check (char_length(reason) <= 500),
  updated_at timestamptz not null default now()
);
create table peergrid_private.platform_settings (
  singleton boolean primary key default true check (singleton),
  maintenance_enabled boolean not null default false,
  maintenance_message text not null default 'PeerGrid is being updated. We will be back shortly.'
    check (char_length(maintenance_message) between 1 and 300),
  updated_at timestamptz not null default now()
);
insert into peergrid_private.platform_settings(singleton) values (true);
create table peergrid_private.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  admin_email text not null,
  action text not null,
  resource_id text,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
create index admin_audit_recent_idx on peergrid_private.admin_audit_log(created_at desc);
create table peergrid_private.user_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_active_at timestamptz not null default now()
);
create index user_activity_recent_idx on peergrid_private.user_activity(last_active_at desc);
create table peergrid_private.activity_hours (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_hour timestamptz not null,
  primary key(user_id, activity_hour)
);
create index activity_hours_time_idx on peergrid_private.activity_hours(activity_hour, user_id);
create table public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug','not_working','account','content','suggestion','other')),
  title text not null check (char_length(trim(title)) between 5 and 120),
  description text not null check (char_length(trim(description)) between 10 and 4000),
  source_path text not null check (char_length(source_path) <= 250 and source_path ~ '^/[^?#]*$'),
  status text not null default 'new' check (status in ('new','investigating','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index issue_reports_recent_idx on public.issue_reports(created_at desc);
create index issue_reports_status_idx on public.issue_reports(status, created_at desc);
create index issue_reports_reporter_idx on public.issue_reports(reporter_id, created_at desc);
create index if not exists collaboration_posts_author_idx on public.collaboration_posts(author_id, created_at desc);

alter table peergrid_private.admin_allowlist enable row level security;
alter table peergrid_private.account_states enable row level security;
alter table peergrid_private.platform_settings enable row level security;
alter table peergrid_private.admin_audit_log enable row level security;
alter table peergrid_private.user_activity enable row level security;
alter table peergrid_private.activity_hours enable row level security;
revoke all on all tables in schema peergrid_private from public, anon, authenticated;
revoke all on all sequences in schema peergrid_private from public, anon, authenticated;
alter table public.issue_reports enable row level security;
revoke all on public.issue_reports from public, anon, authenticated;
grant select on public.issue_reports to authenticated;

create function public.is_peergrid_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from peergrid_private.admin_allowlist a join auth.users u on u.id = a.user_id
    where a.user_id = auth.uid() and a.email = lower(u.email) and u.email_confirmed_at is not null
  );
$$;
create function peergrid_private.assert_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_peergrid_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
end;
$$;
create function public.can_use_peergrid() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_peergrid_admin() or (
    not exists (select 1 from peergrid_private.platform_settings where maintenance_enabled)
    and (auth.uid() is null or (
      exists (select 1 from auth.users where id = auth.uid())
      and not exists (select 1 from peergrid_private.account_states where user_id = auth.uid() and status <> 'active')
    ))
  );
$$;
create function peergrid_private.assert_product_access() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_use_peergrid() then raise exception 'PEERGRID_ACCESS_RESTRICTED' using errcode = '42501'; end if;
end;
$$;
create function peergrid_private.audit(action_name text, resource text, action_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform peergrid_private.assert_admin();
  insert into peergrid_private.admin_audit_log(admin_id, admin_email, action, resource_id, reason)
  select auth.uid(), u.email, action_name, resource, nullif(trim(action_reason), '') from auth.users u where u.id = auth.uid();
end;
$$;
create function public.get_platform_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'is_admin', public.is_peergrid_admin(),
    'account_status', case when auth.uid() is not null and not exists(select 1 from auth.users where id = auth.uid()) then 'removed'
      else coalesce((select status from peergrid_private.account_states where user_id = auth.uid()), 'active') end,
    'maintenance_enabled', maintenance_enabled,
    'maintenance_message', maintenance_message
  ) from peergrid_private.platform_settings where singleton;
$$;
create or replace function public.is_verified_student(candidate_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_use_peergrid() and exists (
    select 1 from public.profiles p join public.student_approvals a on a.user_id = p.id
    where p.id = candidate_id and p.is_verified and a.status = 'approved'
      and not exists(select 1 from peergrid_private.account_states s where s.user_id = candidate_id and s.status <> 'active')
  );
$$;
create or replace function public.is_conversation_member(candidate_conversation_id uuid, candidate_profile_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_use_peergrid()
    and not exists(select 1 from peergrid_private.account_states where user_id = candidate_profile_id and status <> 'active')
    and exists(select 1 from public.conversation_members where conversation_id = candidate_conversation_id and profile_id = candidate_profile_id);
$$;

-- RESTRICTIVE policies combine with existing policies: they do not grant new access.
do $$
declare target record;
begin
  for target in select schemaname, tablename from pg_tables
    where schemaname = 'public' and rowsecurity and tablename <> 'issue_reports'
  loop
    execute format('create policy peergrid_platform_access on %I.%I as restrictive for all to anon, authenticated using ((select public.can_use_peergrid())) with check ((select public.can_use_peergrid()))', target.schemaname, target.tablename);
  end loop;
end;
$$;
create policy peergrid_storage_access on storage.objects as restrictive for all to anon, authenticated
using ((select public.can_use_peergrid())) with check ((select public.can_use_peergrid()));
create policy issue_reports_read on public.issue_reports for select to authenticated
using ((select public.can_use_peergrid()) and (reporter_id = (select auth.uid()) or (select public.is_peergrid_admin())));

-- Defense for SECURITY DEFINER RPCs and views as well as direct table calls.
-- PostgREST sets request.path itself; no caller-supplied bypass header is used.
create function public.peergrid_check_request() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if current_setting('request.path', true) in ('/rpc/get_platform_access', '/rpc/is_peergrid_admin') then return; end if;
  perform peergrid_private.assert_product_access();
end;
$$;

create function public.admin_set_account_status(target_user_id uuid, new_status text, admin_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare old_status text;
begin
  perform peergrid_private.assert_admin();
  if new_status not in ('active','suspended','disabled','removed') or char_length(coalesce(admin_reason,'')) > 500 then
    raise exception 'INVALID_ACCOUNT_ACTION'; end if;
  if target_user_id = auth.uid() or exists(select 1 from peergrid_private.admin_allowlist where user_id = target_user_id) then
    raise exception 'CANNOT_CHANGE_ADMIN_ACCOUNT'; end if;
  perform 1 from auth.users where id = target_user_id for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  select status into old_status from peergrid_private.account_states where user_id = target_user_id;
  if coalesce(old_status, 'active') = new_status then return; end if;
  insert into peergrid_private.account_states(user_id, status, reason)
  values(target_user_id, new_status, nullif(trim(admin_reason),''))
  on conflict(user_id) do update set status = excluded.status, reason = excluded.reason, updated_at = now();
  perform peergrid_private.audit('account_' || new_status, target_user_id::text, admin_reason);
end;
$$;

create function public.admin_set_maintenance(enabled boolean, message text, admin_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform peergrid_private.assert_admin();
  if char_length(trim(coalesce(message,''))) not between 1 and 300 or char_length(coalesce(admin_reason,'')) > 500 then
    raise exception 'INVALID_MAINTENANCE_MESSAGE'; end if;
  update peergrid_private.platform_settings set maintenance_enabled = enabled,
    maintenance_message = trim(message), updated_at = now() where singleton;
  perform peergrid_private.audit(case when enabled then 'maintenance_enabled' else 'maintenance_disabled' end, 'platform', admin_reason);
end;
$$;

create function public.submit_issue_report(issue_category text, issue_title text, issue_description text, page_path text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  perform peergrid_private.assert_product_access();
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':issue', 0));
  if (select count(*) from public.issue_reports where reporter_id = auth.uid() and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'ISSUE_RATE_LIMIT'; end if;
  insert into public.issue_reports(reporter_id, category, title, description, source_path)
  values(auth.uid(), issue_category, trim(issue_title), trim(issue_description), left(split_part(split_part(coalesce(page_path,'/'), '?', 1), '#', 1),250))
  returning id into new_id;
  return new_id;
end;
$$;

create function public.admin_update_issue(issue_id uuid, new_status text, admin_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform peergrid_private.assert_admin();
  if new_status not in ('new','investigating','resolved','closed') or char_length(coalesce(admin_reason,'')) > 500 then
    raise exception 'INVALID_ISSUE_STATUS'; end if;
  update public.issue_reports set status = new_status, updated_at = now() where id = issue_id;
  if not found then raise exception 'ISSUE_NOT_FOUND'; end if;
  perform peergrid_private.audit('issue_' || new_status, issue_id::text, admin_reason);
end;
$$;

create function public.record_user_activity() returns boolean
language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  perform peergrid_private.assert_product_access();
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  insert into peergrid_private.user_activity(user_id,last_active_at) values(auth.uid(),now())
  on conflict(user_id) do update set last_active_at = excluded.last_active_at
    where peergrid_private.user_activity.last_active_at < now() - interval '5 minutes';
  get diagnostics affected = row_count;
  if affected = 0 then return false; end if;
  insert into peergrid_private.activity_hours(user_id,activity_hour)
  values(auth.uid(),date_trunc('hour',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') on conflict do nothing;
  return true;
end;
$$;

create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform peergrid_private.assert_admin();
  select jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'signups_today',(select count(*) from auth.users where created_at >= date_trunc('day',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'),
    'signups_week',(select count(*) from auth.users where created_at >= date_trunc('week',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'),
    'signups_month',(select count(*) from auth.users where created_at >= date_trunc('month',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'),
    'daily_active',(select count(*) from peergrid_private.user_activity where last_active_at > now() - interval '24 hours'),
    'weekly_active',(select count(*) from peergrid_private.user_activity where last_active_at > now() - interval '7 days'),
    'monthly_active',(select count(*) from peergrid_private.user_activity where last_active_at > now() - interval '30 days'),
    'recently_active',(select count(*) from peergrid_private.user_activity where last_active_at > now() - interval '15 minutes'),
    'posts',(select count(*) from public.social_posts),
    'collaborations',(select count(*) from public.collaboration_posts),
    'active_collaborations',(select count(*) from public.collaboration_posts where status in ('open','full') and moderation_status = 'published'),
    'messages',(select count(*) from public.messages),
    'reports',(select count(*) from public.post_reports),
    'issues',(select count(*) from public.issue_reports),
    'new_issues',(select count(*) from public.issue_reports where status = 'new'),
    'signups', (select jsonb_agg(jsonb_build_object('label', d.day::date,'count',coalesce(s.n,0)) order by d.day)
      from generate_series((now() at time zone 'Asia/Kolkata')::date-29,(now() at time zone 'Asia/Kolkata')::date,interval '1 day') d(day)
      left join (select (created_at at time zone 'Asia/Kolkata')::date as day,count(*) n from auth.users where created_at > now()-interval '31 days' group by 1) s on s.day=d.day::date),
    'active_days',(select jsonb_agg(jsonb_build_object('label',d.day::date,'count',coalesce(a.n,0)) order by d.day)
      from generate_series((now() at time zone 'Asia/Kolkata')::date-29,(now() at time zone 'Asia/Kolkata')::date,interval '1 day') d(day)
      left join (select (activity_hour at time zone 'Asia/Kolkata')::date as day,count(distinct user_id) n from peergrid_private.activity_hours where activity_hour > now()-interval '31 days' group by 1) a on a.day=d.day::date),
    'active_hours',(select jsonb_agg(jsonb_build_object('label',h.hour,'count',coalesce(a.n,0)) order by h.hour)
      from generate_series((date_trunc('hour',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')-interval '23 hours',date_trunc('hour',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata',interval '1 hour') h(hour)
      left join (select activity_hour,count(*) n from peergrid_private.activity_hours where activity_hour > now()-interval '25 hours' group by 1) a on a.activity_hour=h.hour)
  ) into result;
  return result;
end;
$$;

create function public.admin_list_users(search_text text default '', result_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform peergrid_private.assert_admin();
  select coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb) into result from (
    select u.id, u.email, u.created_at, p.full_name, p.username, p.avatar_url, c.name campus,
      p.graduation_year, coalesce(s.status,'active') account_status, a.last_active_at,
      ap.status::text approval_status,
      (select count(*) from public.social_posts where author_id=u.id) posts,
      (select count(*) from public.collaboration_posts where author_id=u.id) collaborations,
      (select count(*) from public.follows where following_id=u.id) followers,
      (select count(*) from public.follows where follower_id=u.id) following,
      exists(select 1 from peergrid_private.admin_allowlist where user_id=u.id) is_admin
    from auth.users u
    left join public.profiles p on p.id=u.id
    left join public.campuses c on c.id=p.campus_id
    left join public.student_approvals ap on ap.user_id=u.id
    left join peergrid_private.account_states s on s.user_id=u.id
    left join peergrid_private.user_activity a on a.user_id=u.id
    where coalesce(search_text,'')='' or
      concat_ws(' ',p.full_name,p.username,u.email,u.id::text,c.name) ilike '%' || left(search_text,120) || '%'
    order by u.created_at desc, u.id limit 31 offset least(greatest(result_offset,0),100000)
  ) rows;
  return result;
end;
$$;
create function public.admin_list_issues(search_text text default '', status_filter text default '', category_filter text default '',
  since_date date default null, until_date date default null, result_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform peergrid_private.assert_admin();
  select coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb) into result from (
    select i.*, p.username, p.full_name, u.email reporter_email
    from public.issue_reports i join auth.users u on u.id=i.reporter_id left join public.profiles p on p.id=i.reporter_id
    where (status_filter='' or i.status=status_filter) and (category_filter='' or i.category=category_filter)
      and (since_date is null or i.created_at >= since_date::timestamp at time zone 'Asia/Kolkata')
      and (until_date is null or i.created_at < (until_date+1)::timestamp at time zone 'Asia/Kolkata')
      and (search_text='' or concat_ws(' ',i.title,i.description,p.username,p.full_name,u.email,i.reporter_id::text) ilike '%'||left(search_text,120)||'%')
    order by i.created_at desc,i.id limit 31 offset least(greatest(result_offset,0),100000)
  ) rows;
  return result;
end;
$$;
create function public.admin_audit_events(result_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform peergrid_private.assert_admin();
  select coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb) into result from (
    select * from peergrid_private.admin_audit_log order by created_at desc,id desc
    limit 51 offset least(greatest(result_offset,0),100000)
  ) rows;
  return result;
end;
$$;
create function public.admin_moderation_reports(result_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform peergrid_private.assert_admin();
  select coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb) into result from (
    select r.id,r.post_id,r.reason,r.details,r.created_at,p.username reporter, s.body,
      s.moderation_status
    from public.post_reports r join public.social_posts s on s.id=r.post_id
    left join public.profiles p on p.id=r.reporter_id
    order by r.created_at desc limit 31 offset least(greatest(result_offset,0),100000)
  ) rows;
  return result;
end;
$$;

alter table public.notifications add column cleared_at timestamptz;
create index notifications_visible_idx on public.notifications(recipient_id,created_at desc) where cleared_at is null;
create index notifications_visible_unread_idx on public.notifications(recipient_id,created_at desc) where cleared_at is null and read_at is null;
create function public.clear_notifications() returns integer
language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  perform peergrid_private.assert_product_access();
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  update public.notifications set cleared_at=now(),read_at=coalesce(read_at,now())
  where recipient_id=auth.uid() and cleared_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;
create or replace function public.get_unread_notification_count() returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from public.notifications
  where recipient_id=auth.uid() and read_at is null and cleared_at is null and public.can_use_peergrid();
$$;
create or replace function public.mark_notifications_read(notification_ids uuid[] default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  perform peergrid_private.assert_product_access();
  update public.notifications set read_at=now()
  where recipient_id=auth.uid() and read_at is null and cleared_at is null
    and (notification_ids is null or id=any(notification_ids));
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Explicit grants; private tables and helpers remain inaccessible through the API.
revoke all on all functions in schema peergrid_private from public, anon, authenticated;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.proname like 'admin_%' or p.proname in (
      'is_peergrid_admin','can_use_peergrid','get_platform_access','peergrid_check_request',
      'submit_issue_report','record_user_activity','clear_notifications'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to authenticated', f.signature);
  end loop;
end;
$$;
grant execute on function public.get_platform_access(), public.is_peergrid_admin(), public.can_use_peergrid(), public.peergrid_check_request() to anon;

-- Refuse to silently replace another project's API hook.
do $$
declare existing_hook text;
begin
  if exists(select 1 from pg_roles where rolname='authenticator') then
    select split_part(setting,'=',2) into existing_hook from pg_roles, unnest(rolconfig) setting
    where rolname='authenticator' and setting like 'pgrst.db_pre_request=%';
    if existing_hook is not null and existing_hook <> '' and existing_hook <> 'public.peergrid_check_request' then
      raise exception 'Existing db_pre_request hook detected. Merge PeerGrid access checks with the existing hook before applying.';
    end if;
    alter role authenticator set pgrst.db_pre_request = 'public.peergrid_check_request';
  end if;
end;
$$;
notify pgrst, 'reload config';
notify pgrst, 'reload schema';

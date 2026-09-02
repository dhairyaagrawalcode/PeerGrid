-- Dashboard data is queried from source tables, never copied into a second user store.
-- This private row is only an invalidation signal. It contains no user/message data.
create table peergrid_private.admin_data_revision (
  singleton boolean primary key default true check (singleton),
  revision bigint not null default 0,
  transaction_id bigint not null default 0
);
insert into peergrid_private.admin_data_revision(singleton) values (true);
alter table peergrid_private.admin_data_revision enable row level security;
revoke all on peergrid_private.admin_data_revision from public,anon,authenticated,service_role;
grant usage on schema peergrid_private to service_role;
grant select on peergrid_private.admin_data_revision to service_role;

create function peergrid_private.invalidate_admin_data() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- At most one signal per transaction, including multi-row imports/cascades.
  update peergrid_private.admin_data_revision set revision=revision+1,transaction_id=txid_current()
  where singleton and transaction_id<>txid_current();
  return null;
end;
$$;
revoke all on function peergrid_private.invalidate_admin_data() from public,anon,authenticated,service_role;

do $$
declare source text;
begin
  foreach source in array array[
    'auth.users','public.profiles','public.campuses','public.student_approvals',
    'public.social_posts','public.collaboration_posts','public.follows','public.messages',
    'public.post_reports','public.issue_reports','peergrid_private.account_states',
    'peergrid_private.platform_settings','peergrid_private.user_activity',
    'peergrid_private.activity_hours','peergrid_private.admin_audit_log'
  ] loop
    execute format('create trigger admin_data_changed after insert or update or delete or truncate on %s for each statement execute function peergrid_private.invalidate_admin_data()',source::regclass);
  end loop;
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table peergrid_private.admin_data_revision;
  end if;
end;
$$;

create function public.admin_data_version() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform peergrid_private.assert_admin();
  return (select jsonb_build_object('revision',revision::text,'checked_at',now(),
    'time_bucket',floor(extract(epoch from now())/60)::text)
    from peergrid_private.admin_data_revision where singleton);
end;
$$;

create function public.admin_overview_snapshot() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform peergrid_private.assert_admin();
  return public.admin_overview() || jsonb_build_object(
    'profile_count',(select count(*) from public.profiles),
    'accounts_without_profile',(select count(*) from auth.users u where not exists(select 1 from public.profiles p where p.id=u.id)),
    'refreshed_at',now());
end;
$$;

create function public.admin_user_directory(search_text text default '', result_offset integer default 0, profile_filter text default 'all')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform peergrid_private.assert_admin();
  if profile_filter is null or profile_filter not in ('all','profiles','without_profile') then
    raise exception 'INVALID_PROFILE_FILTER';
  end if;
  with accounts as materialized (
    select u.id,u.email,u.created_at,p.full_name,p.username,p.avatar_url,c.name campus,
      p.graduation_year,p.created_at profile_created_at,p.id is not null has_profile,
      p.is_verified,coalesce(s.status,'active') account_status,a.last_active_at,
      ap.status::text approval_status,false is_admin
    from auth.users u left join public.profiles p on p.id=u.id
    left join public.campuses c on c.id=p.campus_id
    left join public.student_approvals ap on ap.user_id=u.id
    left join peergrid_private.account_states s on s.user_id=u.id
    left join peergrid_private.user_activity a on a.user_id=u.id
  ), matching as materialized (
    select * from accounts where (profile_filter='all' or has_profile=(profile_filter='profiles'))
      and (coalesce(search_text,'')='' or
        concat_ws(' ',full_name,username,email,id::text,campus) ilike '%'||left(search_text,120)||'%')
  ), page as (
    select * from matching order by created_at desc,id limit 31 offset least(greatest(result_offset,0),100000)
  ), rows as (
    select page.*,
      (select count(*) from public.social_posts where author_id=page.id) posts,
      (select count(*) from public.collaboration_posts where author_id=page.id) collaborations,
      (select count(*) from public.follows where following_id=page.id) followers,
      (select count(*) from public.follows where follower_id=page.id) following
    from page
  ) select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(rows) order by created_at desc,id) from rows),'[]'::jsonb),
    'total_accounts',(select count(*) from accounts),
    'profile_count',(select count(*) from public.profiles),
    'accounts_without_profile',(select count(*) from accounts where not has_profile),
    'matching_count',(select count(*) from matching),
    'refreshed_at',now()
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_data_version(),public.admin_overview_snapshot(),public.admin_user_directory(text,integer,text) from public,anon,authenticated;
grant execute on function public.admin_data_version(),public.admin_overview_snapshot(),public.admin_user_directory(text,integer,text) to service_role;
notify pgrst,'reload schema';

-- Product-quality pass: private E2EE message attachments and indexed admin filters.

alter table public.messages
  add column if not exists attachment_path text,
  add column if not exists attachment_kind text,
  add column if not exists attachment_size bigint;

alter table public.messages
  drop constraint if exists messages_attachment_kind,
  add constraint messages_attachment_kind check (
    attachment_kind is null or attachment_kind in ('image', 'video', 'document')
  ),
  drop constraint if exists messages_attachment_size,
  add constraint messages_attachment_size check (
    attachment_size is null or attachment_size between 1 and 26214400
  ),
  drop constraint if exists messages_attachment_complete,
  add constraint messages_attachment_complete check (
    (attachment_path is null and attachment_kind is null and attachment_size is null)
    or
    (attachment_path is not null and attachment_kind is not null and attachment_size is not null)
  ),
  drop constraint if exists messages_attachment_path,
  add constraint messages_attachment_path check (
    attachment_path is null
    or attachment_path = sender_id::text || '/' || conversation_id::text || '/' || id::text || '.bin'
  );

create unique index if not exists messages_attachment_path_unique
  on public.messages(attachment_path) where attachment_path is not null;

-- Encrypted files are opaque application/octet-stream objects. Original names,
-- MIME types and decryption keys exist only inside the signed E2EE message.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('message-media', 'message-media', false, 26214432, array['application/octet-stream'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists message_media_insert_member on storage.objects;
create policy message_media_insert_member on storage.objects
for insert to authenticated
with check (
  bucket_id = 'message-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.conversation_members member
    where member.profile_id = (select auth.uid())
      and member.conversation_id::text = (storage.foldername(name))[2]
  )
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.bin$'
);

drop policy if exists message_media_read_member on storage.objects;
create policy message_media_read_member on storage.objects
for select to authenticated
using (
  bucket_id = 'message-media'
  and exists (
    select 1 from public.messages message
    join public.conversation_members member
      on member.conversation_id = message.conversation_id
    where message.attachment_path = name
      and member.profile_id = (select auth.uid())
  )
);

drop policy if exists message_media_delete_owner on storage.objects;
create policy message_media_delete_owner on storage.objects
for delete to authenticated
using (
  bucket_id = 'message-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Admin filters use indexed source data and aggregate each activity table once.
create index if not exists profiles_campus_year_idx on public.profiles(campus_id, graduation_year, id);
create index if not exists account_states_status_idx on peergrid_private.account_states(status, user_id);

drop function if exists public.admin_user_directory(text, integer, text);
create function public.admin_user_directory(
  search_text text default '',
  result_offset integer default 0,
  profile_filter text default 'all',
  campus_filter uuid default null,
  year_filter integer default null,
  status_filter text default 'all',
  verification_filter text default 'all',
  joined_from date default null,
  joined_to date default null,
  active_from date default null,
  active_to date default null,
  activity_filter text default 'all',
  sort_by text default 'newest'
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform peergrid_private.assert_admin();
  if profile_filter not in ('all','profiles','without_profile')
    or status_filter not in ('all','active','suspended','disabled','removed')
    or verification_filter not in ('all','verified','unverified')
    or activity_filter not in ('all','has_posts','has_collaborations','has_post_reports','has_issues')
    or sort_by not in ('newest','oldest','last_active','name','most_posts','most_collaborations')
    or year_filter is not null and year_filter not between 2000 and 2200
  then raise exception 'INVALID_ADMIN_FILTER'; end if;

  with post_counts as materialized (
    select author_id user_id, count(*) posts from public.social_posts group by author_id
  ), collaboration_counts as materialized (
    select author_id user_id, count(*) collaborations from public.collaboration_posts group by author_id
  ), follower_counts as materialized (
    select following_id user_id, count(*) followers from public.follows group by following_id
  ), following_counts as materialized (
    select follower_id user_id, count(*) following from public.follows group by follower_id
  ), post_report_counts as materialized (
    select reporter_id user_id, count(*) post_reports from public.post_reports group by reporter_id
  ), issue_counts as materialized (
    select reporter_id user_id, count(*) issues from public.issue_reports group by reporter_id
  ), accounts as materialized (
    select u.id,u.email,u.created_at,p.full_name,p.username,p.avatar_url,p.campus_id,c.name campus,
      p.graduation_year,p.created_at profile_created_at,p.id is not null has_profile,
      p.is_verified,coalesce(s.status,'active') account_status,a.last_active_at,
      ap.status::text approval_status,false is_admin,
      coalesce(pc.posts,0) posts,coalesce(cc.collaborations,0) collaborations,
      coalesce(fc.followers,0) followers,coalesce(fgc.following,0) following,
      coalesce(prc.post_reports,0) post_reports,coalesce(ic.issues,0) issues
    from auth.users u
    left join public.profiles p on p.id=u.id
    left join public.campuses c on c.id=p.campus_id
    left join public.student_approvals ap on ap.user_id=u.id
    left join peergrid_private.account_states s on s.user_id=u.id
    left join peergrid_private.user_activity a on a.user_id=u.id
    left join post_counts pc on pc.user_id=u.id
    left join collaboration_counts cc on cc.user_id=u.id
    left join follower_counts fc on fc.user_id=u.id
    left join following_counts fgc on fgc.user_id=u.id
    left join post_report_counts prc on prc.user_id=u.id
    left join issue_counts ic on ic.user_id=u.id
  ), matching as materialized (
    select * from accounts where
      (profile_filter='all' or has_profile=(profile_filter='profiles'))
      and (campus_filter is null or campus_id=campus_filter)
      and (year_filter is null or graduation_year=year_filter)
      and (status_filter='all' or account_status=status_filter)
      and (verification_filter='all' or coalesce(is_verified,false)=(verification_filter='verified'))
      and (joined_from is null or (created_at at time zone 'Asia/Kolkata')::date >= joined_from)
      and (joined_to is null or (created_at at time zone 'Asia/Kolkata')::date <= joined_to)
      and (active_from is null or (last_active_at at time zone 'Asia/Kolkata')::date >= active_from)
      and (active_to is null or (last_active_at at time zone 'Asia/Kolkata')::date <= active_to)
      and (activity_filter='all'
        or activity_filter='has_posts' and posts>0
        or activity_filter='has_collaborations' and collaborations>0
        or activity_filter='has_post_reports' and post_reports>0
        or activity_filter='has_issues' and issues>0)
      and (coalesce(search_text,'')='' or
        concat_ws(' ',full_name,username,email,id::text,campus,graduation_year::text) ilike '%'||left(search_text,120)||'%')
  ), page as materialized (
    select * from matching
    order by
      case when sort_by='oldest' then created_at end asc,
      case when sort_by='last_active' then last_active_at end desc nulls last,
      case when sort_by='name' then lower(coalesce(full_name,email)) end asc,
      case when sort_by='most_posts' then posts end desc,
      case when sort_by='most_collaborations' then collaborations end desc,
      created_at desc,id
    limit 31 offset least(greatest(result_offset,0),30000)
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),
    'total_accounts',(select count(*) from accounts),
    'profile_count',(select count(*) from accounts where has_profile),
    'accounts_without_profile',(select count(*) from accounts where not has_profile),
    'matching_count',(select count(*) from matching),
    'refreshed_at',now()
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_user_filter_options()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform peergrid_private.assert_admin();
  return jsonb_build_object(
    'campuses',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.campuses),'[]'::jsonb),
    'years',coalesce((select jsonb_agg(graduation_year_value order by graduation_year_value) from (
      select distinct graduation_year as graduation_year_value
      from public.profiles where graduation_year is not null
    ) valueset),'[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_overview_snapshot() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform peergrid_private.assert_admin();
  return public.admin_overview() || jsonb_build_object(
    'profile_count',(select count(*) from public.profiles),
    'accounts_without_profile',(select count(*) from auth.users u where not exists(select 1 from public.profiles p where p.id=u.id)),
    'unresolved_reports',(
      (select count(*) from public.issue_reports where status in ('new','investigating'))
      + (select count(distinct report.post_id) from public.post_reports report join public.social_posts post on post.id=report.post_id where post.moderation_status in ('pending','held'))
    ),
    'suspended_accounts',(select count(*) from peergrid_private.account_states where status='suspended'),
    'recent_admin_activity',coalesce((select jsonb_agg(to_jsonb(activity) order by activity.created_at desc,activity.id desc) from (
      select id,admin_id,admin_email,action,resource_id,reason,created_at
      from peergrid_private.admin_audit_log order by created_at desc,id desc limit 5
    ) activity),'[]'::jsonb),
    'refreshed_at',now());
end;
$$;

revoke all on function public.admin_user_directory(text,integer,text,uuid,integer,text,text,date,date,date,date,text,text) from public,anon,authenticated;
revoke all on function public.admin_user_filter_options() from public,anon,authenticated;
revoke all on function public.admin_overview_snapshot() from public,anon,authenticated;
grant execute on function public.admin_user_directory(text,integer,text,uuid,integer,text,text,date,date,date,date,text,text) to service_role;
grant execute on function public.admin_user_filter_options() to service_role;
grant execute on function public.admin_overview_snapshot() to service_role;

notify pgrst,'reload schema';

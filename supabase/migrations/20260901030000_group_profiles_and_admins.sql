-- Group profile pictures, member visibility, and owner-only member management.

alter table public.conversations
  add column if not exists avatar_path text;

alter table public.conversations drop constraint if exists conversations_avatar_path_check;
alter table public.conversations add constraint conversations_avatar_path_check check (
  avatar_path is null
  or (
    char_length(avatar_path) between 75 and 80
    and avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-avatars',
  'group-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists group_avatar_upload_own on storage.objects;
drop policy if exists group_avatar_update_own on storage.objects;
drop policy if exists group_avatar_delete_own on storage.objects;

create policy group_avatar_upload_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'group-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_verified_student()
);

create policy group_avatar_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'group-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'group-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_verified_student()
);

create policy group_avatar_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'group-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.is_group_owner(
  candidate_conversation_id uuid,
  candidate_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations conversation
    join public.conversation_members member
      on member.conversation_id = conversation.id
    where conversation.id = candidate_conversation_id
      and conversation.kind = 'group'
      and conversation.created_by = candidate_profile_id
      and member.profile_id = candidate_profile_id
      and member.role = 'owner'
  );
$$;

drop function if exists public.create_group_conversation(text, uuid[]);
drop function if exists public.create_group_conversation(text, uuid[], text);
create function public.create_group_conversation(
  candidate_title text,
  candidate_member_ids uuid[],
  candidate_avatar_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  clean_member_ids uuid[];
  new_group_id uuid;
begin
  if current_user_id is null
    or not public.is_verified_student(current_user_id)
    or char_length(trim(coalesce(candidate_title, ''))) not between 2 and 80
  then
    raise exception 'INVALID_GROUP';
  end if;

  if candidate_avatar_path is not null and (
    split_part(candidate_avatar_path, '/', 1) <> current_user_id::text
    or candidate_avatar_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  ) then
    raise exception 'INVALID_GROUP_AVATAR';
  end if;

  select array_agg(distinct selected_member.profile_id order by selected_member.profile_id)
  into clean_member_ids
  from unnest(coalesce(candidate_member_ids, '{}'::uuid[])) as selected_member(profile_id)
  where selected_member.profile_id is not null
    and selected_member.profile_id <> current_user_id;

  if coalesce(cardinality(clean_member_ids), 0) not between 2 and 9 then
    raise exception 'GROUP_REQUIRES_3_TO_10_MEMBERS';
  end if;

  if (
    select count(*)
    from public.profiles profile
    where profile.id = any(clean_member_ids)
      and profile.is_verified
  ) <> cardinality(clean_member_ids) then
    raise exception 'INVALID_GROUP_MEMBER';
  end if;

  insert into public.conversations(kind, title, avatar_path, created_by)
  values ('group', trim(candidate_title), candidate_avatar_path, current_user_id)
  returning id into new_group_id;

  insert into public.conversation_members(conversation_id, profile_id, role)
  values (new_group_id, current_user_id, 'owner');

  insert into public.conversation_members(conversation_id, profile_id, role)
  select new_group_id, selected_member.profile_id, 'member'
  from unnest(clean_member_ids) as selected_member(profile_id);

  insert into public.conversation_read_state(conversation_id, profile_id)
  select member.conversation_id, member.profile_id
  from public.conversation_members member
  where member.conversation_id = new_group_id;

  insert into public.notifications(recipient_id, actor_id, type, conversation_id)
  select selected_member.profile_id, current_user_id, 'added_to_group', new_group_id
  from unnest(clean_member_ids) as selected_member(profile_id)
  on conflict do nothing;

  return new_group_id;
end;
$$;

create or replace function public.set_group_avatar(
  candidate_conversation_id uuid,
  candidate_avatar_path text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  saved_path text;
begin
  if current_user_id is null
    or not public.is_verified_student(current_user_id)
    or not public.is_group_owner(candidate_conversation_id, current_user_id)
  then
    raise exception 'GROUP_OWNER_REQUIRED';
  end if;

  if candidate_avatar_path is not null and (
    split_part(candidate_avatar_path, '/', 1) <> current_user_id::text
    or candidate_avatar_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  ) then
    raise exception 'INVALID_GROUP_AVATAR';
  end if;

  update public.conversations conversation
  set avatar_path = candidate_avatar_path
  where conversation.id = candidate_conversation_id
    and conversation.kind = 'group'
  returning conversation.avatar_path into saved_path;

  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  return saved_path;
end;
$$;

create or replace function public.remove_group_member(
  candidate_conversation_id uuid,
  candidate_member_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  removed_count integer;
begin
  if current_user_id is null
    or candidate_member_id is null
    or candidate_member_id = current_user_id
    or not public.is_verified_student(current_user_id)
    or not public.is_group_owner(candidate_conversation_id, current_user_id)
  then
    raise exception 'GROUP_OWNER_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.conversation_members member
    where member.conversation_id = candidate_conversation_id
      and member.profile_id = candidate_member_id
      and member.role = 'member'
  ) then
    raise exception 'GROUP_MEMBER_NOT_FOUND';
  end if;

  delete from public.conversation_read_state state
  where state.conversation_id = candidate_conversation_id
    and state.profile_id = candidate_member_id;

  delete from public.conversation_members member
  where member.conversation_id = candidate_conversation_id
    and member.profile_id = candidate_member_id
    and member.role = 'member';

  get diagnostics removed_count = row_count;
  return removed_count = 1;
end;
$$;

drop function if exists public.get_conversation_summaries(integer, integer);
create function public.get_conversation_summaries(result_limit integer default 50, result_offset integer default 0)
returns table (
  conversation_id uuid, other_user_id uuid, other_username text, other_full_name text,
  other_avatar_url text, other_program text, created_at timestamptz, last_activity_at timestamptz,
  last_message_body text, last_message_sender_id uuid, last_message_created_at timestamptz,
  unread_count bigint, is_group boolean, group_title text, group_avatar_path text, member_count bigint
)
language sql stable security definer set search_path = '' as $$
  select conversation.id,
    case when conversation.kind = 'direct' then other_profile.id else null end,
    case when conversation.kind = 'direct' then other_profile.username::text else null end,
    case when conversation.kind = 'direct' then other_profile.full_name else conversation.title end,
    case when conversation.kind = 'direct' then other_profile.avatar_url else null end,
    case when conversation.kind = 'direct' then other_profile.program else null end,
    conversation.created_at, coalesce(conversation.last_message_at, conversation.created_at),
    case when latest.id is null then null else 'Encrypted message' end,
    latest.sender_id, latest.created_at,
    (select count(*) from public.messages unread where unread.conversation_id = conversation.id
      and unread.sender_id <> auth.uid() and unread.created_at > coalesce(read_state.last_read_at, '-infinity'::timestamptz)),
    conversation.kind = 'group', conversation.title, conversation.avatar_path,
    (select count(*) from public.conversation_members group_member where group_member.conversation_id = conversation.id)
  from public.conversation_members viewer_member
  join public.conversations conversation on conversation.id = viewer_member.conversation_id
  left join public.conversation_read_state read_state on read_state.conversation_id = conversation.id and read_state.profile_id = auth.uid()
  left join public.profiles other_profile on other_profile.id = case
    when conversation.kind = 'direct' and conversation.participant_low = auth.uid() then conversation.participant_high
    when conversation.kind = 'direct' then conversation.participant_low else null end
  left join lateral (select message.id, message.sender_id, message.created_at from public.messages message
    where message.conversation_id = conversation.id order by message.created_at desc limit 1) latest on true
  where viewer_member.profile_id = auth.uid() and public.is_verified_student()
  order by coalesce(conversation.last_message_at, conversation.created_at) desc
  limit least(greatest(result_limit, 1), 100) offset least(greatest(result_offset, 0), 5000);
$$;

revoke all on function public.is_group_owner(uuid, uuid) from public, anon;
revoke all on function public.create_group_conversation(text, uuid[], text) from public, anon;
revoke all on function public.set_group_avatar(uuid, text) from public, anon;
revoke all on function public.remove_group_member(uuid, uuid) from public, anon;
revoke all on function public.get_conversation_summaries(integer, integer) from public, anon;

grant execute on function public.is_group_owner(uuid, uuid) to authenticated;
grant execute on function public.create_group_conversation(text, uuid[], text) to authenticated;
grant execute on function public.set_group_avatar(uuid, text) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.get_conversation_summaries(integer, integer) to authenticated;

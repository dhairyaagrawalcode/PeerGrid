-- Allow a group owner to add verified students to an existing group.
create or replace function public.add_group_members(
  candidate_conversation_id uuid,
  candidate_member_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  clean_member_ids uuid[];
  existing_member_count integer;
  added_count integer;
begin
  if current_user_id is null
    or not public.is_verified_student(current_user_id)
    or not public.is_group_owner(candidate_conversation_id, current_user_id)
  then
    raise exception 'GROUP_OWNER_REQUIRED';
  end if;

  -- Serialize membership changes so concurrent additions cannot exceed capacity.
  perform 1
  from public.conversations conversation
  where conversation.id = candidate_conversation_id
    and conversation.kind = 'group'
  for update;

  select array_agg(distinct selected_member.profile_id order by selected_member.profile_id)
  into clean_member_ids
  from unnest(coalesce(candidate_member_ids[1:9], '{}'::uuid[])) as selected_member(profile_id)
  where selected_member.profile_id is not null
    and selected_member.profile_id <> current_user_id
    and not exists (
      select 1
      from public.conversation_members existing_member
      where existing_member.conversation_id = candidate_conversation_id
        and existing_member.profile_id = selected_member.profile_id
    );

  if coalesce(cardinality(clean_member_ids), 0) = 0 then
    raise exception 'NO_NEW_GROUP_MEMBERS';
  end if;

  if (
    select count(*)
    from public.profiles profile
    where profile.id = any(clean_member_ids)
      and profile.is_verified
  ) <> cardinality(clean_member_ids) then
    raise exception 'INVALID_GROUP_MEMBER';
  end if;

  select count(*)::integer
  into existing_member_count
  from public.conversation_members member
  where member.conversation_id = candidate_conversation_id;

  if existing_member_count + cardinality(clean_member_ids) > 10 then
    raise exception 'GROUP_MEMBER_LIMIT';
  end if;

  insert into public.conversation_members(conversation_id, profile_id, role)
  select candidate_conversation_id, selected_member.profile_id, 'member'
  from unnest(clean_member_ids) as selected_member(profile_id)
  on conflict do nothing;

  get diagnostics added_count = row_count;

  insert into public.conversation_read_state(conversation_id, profile_id, last_read_at)
  select candidate_conversation_id, selected_member.profile_id, now()
  from unnest(clean_member_ids) as selected_member(profile_id)
  on conflict do nothing;

  insert into public.notifications(recipient_id, actor_id, type, conversation_id)
  select selected_member.profile_id, current_user_id, 'added_to_group', candidate_conversation_id
  from unnest(clean_member_ids) as selected_member(profile_id)
  on conflict do nothing;

  return added_count;
end;
$$;

revoke all on function public.add_group_members(uuid, uuid[]) from public, anon;
grant execute on function public.add_group_members(uuid, uuid[]) to authenticated;

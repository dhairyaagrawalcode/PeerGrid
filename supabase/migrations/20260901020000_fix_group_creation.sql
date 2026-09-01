-- Fix group creation after the initial groups migration was already applied.
-- The original function used conversation_id for both a PL/pgSQL variable and
-- table columns, which made the read-state insert ambiguous at runtime.

create or replace function public.create_group_conversation(candidate_title text, candidate_member_ids uuid[])
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

  insert into public.conversations(kind, title, created_by)
  values ('group', trim(candidate_title), current_user_id)
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

revoke all on function public.create_group_conversation(text, uuid[]) from public, anon;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;

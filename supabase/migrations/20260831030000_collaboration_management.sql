-- Collaboration management UI support: explicit Full status and an optional
-- proof-of-work outcome. Participant identity is still verified server-side.

alter table public.collaboration_passports
  add column if not exists outcome text
    check (outcome is null or char_length(trim(outcome)) between 1 and 500);

drop function if exists public.complete_collaboration(uuid, text, text[], text, text, jsonb);
create or replace function public.complete_collaboration(
  candidate_collaboration_id uuid,
  creator_role text,
  candidate_skills text[],
  candidate_duration text,
  candidate_project_url text,
  candidate_outcome text,
  participant_entries jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  collaboration_record record;
  new_passport_id uuid;
  entry jsonb;
  participant_id uuid;
  participant_username text;
  participant_role text;
  outcome_decision record;
begin
  if not public.is_verified_student() then raise exception 'NOT_AUTHORIZED'; end if;
  select * into collaboration_record
  from public.collaboration_posts collaboration
  where collaboration.id = candidate_collaboration_id
    and collaboration.author_id = auth.uid()
    and collaboration.moderation_status = 'published'
    and collaboration.status <> 'completed';
  if not found then raise exception 'NOT_AUTHORIZED'; end if;
  if char_length(trim(candidate_duration)) not between 1 and 80
     or char_length(trim(creator_role)) not between 2 and 80
     or coalesce(cardinality(candidate_skills), 0) not between 1 and 20
     or char_length(trim(coalesce(candidate_outcome, ''))) > 500
     or (nullif(trim(candidate_project_url), '') is not null and nullif(trim(candidate_project_url), '') !~ '^https?://')
     or jsonb_typeof(participant_entries) <> 'array'
     or jsonb_array_length(participant_entries) not between 1 and 20 then
    raise exception 'INVALID_COMPLETION_DETAILS';
  end if;
  select * into outcome_decision from public.classify_peergrid_content(candidate_outcome);
  if outcome_decision.status <> 'published' then raise exception 'INVALID_COMPLETION_OUTCOME'; end if;

  insert into public.collaboration_passports (
    collaboration_id, creator_id, project_name, skills_used, duration,
    project_url, outcome, completion_date
  ) values (
    collaboration_record.id, auth.uid(), collaboration_record.title,
    candidate_skills, trim(candidate_duration), nullif(trim(candidate_project_url), ''),
    nullif(trim(candidate_outcome), ''), current_date
  ) returning id into new_passport_id;

  insert into public.collaboration_participants (
    passport_id, profile_id, role, confirmation_status, confirmed_at
  ) values (new_passport_id, auth.uid(), trim(creator_role), 'confirmed', now());

  for entry in select value from jsonb_array_elements(participant_entries)
  loop
    participant_username := lower(trim(coalesce(entry ->> 'username', '')));
    participant_role := trim(coalesce(entry ->> 'role', ''));
    if participant_username = '' or char_length(participant_role) not between 2 and 80 then
      raise exception 'INVALID_PARTICIPANT';
    end if;
    select profile.id into participant_id
    from public.profiles profile
    where lower(profile.username::text) = participant_username
      and profile.is_verified;
    if participant_id is null or participant_id = auth.uid() then raise exception 'INVALID_PARTICIPANT'; end if;
    insert into public.collaboration_participants (passport_id, profile_id, role)
    values (new_passport_id, participant_id, participant_role);
  end loop;

  update public.collaboration_posts set status = 'completed' where id = collaboration_record.id;
  return new_passport_id;
exception
  when unique_violation then raise exception 'DUPLICATE_PARTICIPANT_OR_COMPLETION';
end;
$$;
revoke all on function public.complete_collaboration(uuid, text, text[], text, text, text, jsonb) from public, anon;
grant execute on function public.complete_collaboration(uuid, text, text[], text, text, text, jsonb) to authenticated;

drop function if exists public.get_profile_collaboration_proofs(uuid);
create function public.get_profile_collaboration_proofs(candidate_profile_id uuid)
returns table (
  id uuid,
  project_name text,
  skills_used text[],
  duration text,
  project_url text,
  outcome text,
  completion_date date,
  participants jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    passport.id,
    passport.project_name,
    passport.skills_used,
    passport.duration,
    passport.project_url,
    passport.outcome,
    passport.completion_date,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', profile.id,
        'username', profile.username::text,
        'full_name', profile.full_name,
        'avatar_url', profile.avatar_url,
        'role', participant.role
      ) order by profile.full_name)
      from public.collaboration_participants participant
      join public.profiles profile on profile.id = participant.profile_id
      where participant.passport_id = passport.id and participant.confirmation_status = 'confirmed'
    ), '[]'::jsonb)
  from public.collaboration_passports passport
  join public.collaboration_participants member
    on member.passport_id = passport.id
   and member.profile_id = candidate_profile_id
   and member.confirmation_status = 'confirmed'
  where public.is_verified_student()
    and public.is_verified_student(candidate_profile_id)
    and passport.verified_at is not null
  order by passport.completion_date desc, passport.id;
$$;
revoke all on function public.get_profile_collaboration_proofs(uuid) from public, anon;
grant execute on function public.get_profile_collaboration_proofs(uuid) to authenticated;

create or replace function public.set_collaboration_open_state(
  candidate_collaboration_id uuid,
  candidate_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_verified_student() or candidate_status not in ('open', 'full', 'closed') then
    return false;
  end if;
  update public.collaboration_posts
  set status = candidate_status::public.collaboration_status
  where id = candidate_collaboration_id
    and author_id = auth.uid()
    and status <> 'completed';
  return found;
end;
$$;
revoke all on function public.set_collaboration_open_state(uuid, text) from public, anon;
grant execute on function public.set_collaboration_open_state(uuid, text) to authenticated;

create or replace function public.sync_collaboration_capacity_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('closed', 'completed') then return new; end if;
  if new.team_capacity is not null and new.team_current >= new.team_capacity then
    new.status := 'full';
  elsif tg_op = 'INSERT' then
    new.status := 'open';
  elsif (new.team_current is distinct from old.team_current or new.team_capacity is distinct from old.team_capacity)
    and new.status = 'full' then
    new.status := 'open';
  end if;
  return new;
end;
$$;

-- Final feature pass: collaboration passports, server-enforced moderation,
-- reports, recommendation interaction signals, and replaceable ranking RPCs.

do $$
begin
  create type public.moderation_status as enum ('pending', 'published', 'held', 'rejected');
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.participation_status as enum ('pending', 'confirmed', 'declined');
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.recommendation_entity as enum ('post', 'profile', 'collaboration');
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.recommendation_event_type as enum ('view', 'connect');
exception when duplicate_object then null;
end
$$;

alter type public.collaboration_status add value if not exists 'completed' after 'closed';

alter table public.social_posts
  add column if not exists moderation_status public.moderation_status not null default 'pending',
  add column if not exists moderation_reason text,
  add column if not exists moderation_score smallint not null default 0,
  add column if not exists moderated_at timestamptz;

alter table public.collaboration_posts
  add column if not exists moderation_status public.moderation_status not null default 'pending',
  add column if not exists moderation_reason text,
  add column if not exists moderation_score smallint not null default 0,
  add column if not exists moderated_at timestamptz;

-- Preserve all content created before moderation existed.
update public.social_posts
set moderation_status = 'published', moderated_at = coalesce(moderated_at, created_at)
where moderation_status = 'pending';
update public.collaboration_posts
set moderation_status = 'published', moderated_at = coalesce(moderated_at, created_at)
where moderation_status = 'pending';

alter table public.social_posts
  add constraint social_posts_moderation_score_valid check (moderation_score between 0 and 100) not valid;
alter table public.collaboration_posts
  add constraint collaborations_moderation_score_valid check (moderation_score between 0 and 100) not valid;

create or replace function public.classify_peergrid_content(content text)
returns table (status public.moderation_status, reason text, score smallint)
language plpgsql
stable
set search_path = ''
as $$
declare
  normalized text := lower(regexp_replace(coalesce(content, ''), '\s+', ' ', 'g'));
  link_count integer := coalesce(array_length(regexp_split_to_array(normalized, 'https?://|www\.'), 1), 1) - 1;
begin
  -- Clear threats, slurs, and explicit sexual solicitation are rejected.
  if normalized ~ '(kill yourself|i will kill you|rape you|send nudes|child porn|n[i1]gg[e3]r)' then
    return query select 'rejected'::public.moderation_status, 'Clearly abusive or inappropriate content', 100::smallint;
    return;
  end if;

  -- Ambiguous profanity and suspicious promotion are held for human review.
  if normalized ~ '\m(fuck|bitch|asshole|cunt|porn|nudes)\M' then
    return query select 'held'::public.moderation_status, 'Potentially abusive or inappropriate language', 75::smallint;
    return;
  end if;
  if link_count >= 3
     or normalized ~ '(bit\.ly|tinyurl\.com|t\.me/|wa\.me/|xn--|https?://[0-9]{1,3}(\.[0-9]{1,3}){3})'
     or normalized ~ '(guaranteed returns|double your money|buy followers|free crypto|limited time offer)'
     or normalized ~ '(.)\1{11,}' then
    return query select 'held'::public.moderation_status, 'Possible spam or suspicious link', 65::smallint;
    return;
  end if;

  return query select 'published'::public.moderation_status, null::text, 0::smallint;
end;
$$;

revoke all on function public.classify_peergrid_content(text) from public, anon, authenticated;

create or replace function public.moderate_peergrid_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  combined text;
  decision record;
  duplicate_found boolean := false;
begin
  combined := concat_ws(' ',
    to_jsonb(new) ->> 'title',
    to_jsonb(new) ->> 'description',
    to_jsonb(new) ->> 'body'
  );
  select * into decision from public.classify_peergrid_content(combined);

  if decision.status = 'published' and tg_table_name = 'social_posts' then
    select exists (
      select 1 from public.social_posts existing
      where existing.author_id = new.author_id
        and char_length(trim(new.body)) > 0
        and existing.created_at > now() - interval '24 hours'
        and lower(regexp_replace(existing.body, '\s+', ' ', 'g')) = lower(regexp_replace(new.body, '\s+', ' ', 'g'))
    ) into duplicate_found;
  elsif decision.status = 'published' and tg_table_name = 'collaboration_posts' then
    select exists (
      select 1 from public.collaboration_posts existing
      where existing.author_id = new.author_id
        and existing.created_at > now() - interval '24 hours'
        and lower(trim(existing.title)) = lower(trim(new.title))
        and lower(regexp_replace(existing.description, '\s+', ' ', 'g')) = lower(regexp_replace(new.description, '\s+', ' ', 'g'))
    ) into duplicate_found;
  end if;

  if duplicate_found then
    new.moderation_status := 'held';
    new.moderation_reason := 'Repeated promotional or duplicate content';
    new.moderation_score := 60;
  else
    new.moderation_status := decision.status;
    new.moderation_reason := decision.reason;
    new.moderation_score := decision.score;
  end if;
  new.moderated_at := now();
  return new;
end;
$$;

revoke all on function public.moderate_peergrid_write() from public, anon, authenticated;

drop trigger if exists social_posts_moderation on public.social_posts;
create trigger social_posts_moderation
before insert or update of body on public.social_posts
for each row execute function public.moderate_peergrid_write();

drop trigger if exists collaboration_posts_moderation on public.collaboration_posts;
create trigger collaboration_posts_moderation
before insert or update of title, description on public.collaboration_posts
for each row execute function public.moderate_peergrid_write();

drop policy if exists social_posts_read on public.social_posts;
create policy social_posts_read on public.social_posts
for select to authenticated
using (
  public.is_verified_student()
  and (moderation_status = 'published' or author_id = (select auth.uid()))
);

drop policy if exists collaborations_read on public.collaboration_posts;
create policy collaborations_read on public.collaboration_posts
for select to authenticated
using (
  public.is_verified_student()
  and (moderation_status = 'published' or author_id = (select auth.uid()))
);

-- Column-level grants prevent clients from choosing their own moderation state.
revoke insert on public.social_posts from authenticated;
grant insert (author_id, body, attachment_path, attachment_kind, attachment_name, attachment_mime)
on public.social_posts to authenticated;
revoke insert on public.collaboration_posts from authenticated;
grant insert (
  author_id, campus_id, title, description, tags, collaboration_type,
  required_skills, team_current, team_capacity, commitment
) on public.collaboration_posts to authenticated;

create index if not exists social_posts_moderated_recent_idx
  on public.social_posts (moderation_status, created_at desc);
create index if not exists collaboration_posts_moderated_recent_idx
  on public.collaboration_posts (moderation_status, status, created_at desc);

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam', 'abuse', 'inappropriate', 'misleading', 'other')),
  details text check (details is null or char_length(trim(details)) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

alter table public.post_reports enable row level security;
revoke all on public.post_reports from anon, authenticated;
grant select, insert on public.post_reports to authenticated;
create policy post_reports_read_own on public.post_reports
for select to authenticated using (reporter_id = (select auth.uid()));
create policy post_reports_create_own on public.post_reports
for insert to authenticated with check (
  public.is_verified_student()
  and reporter_id = (select auth.uid())
  and exists (
    select 1 from public.social_posts post
    where post.id = post_id and post.author_id <> (select auth.uid())
  )
);
create index if not exists post_reports_post_recent_idx on public.post_reports (post_id, created_at desc);

create or replace function public.hold_frequently_reported_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.post_reports r where r.post_id = new.post_id) >= 3 then
    update public.social_posts
    set moderation_status = 'held',
        moderation_reason = 'Multiple community reports require review',
        moderation_score = greatest(moderation_score, 70),
        moderated_at = now()
    where id = new.post_id and moderation_status = 'published';
  end if;
  return new;
end;
$$;
revoke all on function public.hold_frequently_reported_post() from public, anon, authenticated;
drop trigger if exists post_reports_hold_content on public.post_reports;
create trigger post_reports_hold_content after insert on public.post_reports
for each row execute function public.hold_frequently_reported_post();

create table if not exists public.collaboration_passports (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null unique references public.collaboration_posts(id) on delete restrict,
  creator_id uuid not null references public.profiles(id) on delete restrict,
  project_name text not null check (char_length(trim(project_name)) between 5 and 100),
  skills_used text[] not null default '{}' check (cardinality(skills_used) between 1 and 20),
  duration text not null check (char_length(trim(duration)) between 1 and 80),
  project_url text check (project_url is null or (char_length(project_url) <= 2048 and project_url ~ '^https?://')),
  completion_date date not null default current_date check (completion_date <= current_date),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table if not exists public.collaboration_participants (
  passport_id uuid not null references public.collaboration_passports(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (char_length(trim(role)) between 2 and 80),
  confirmation_status public.participation_status not null default 'pending',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (passport_id, profile_id)
);

create index if not exists collaboration_passports_verified_idx
  on public.collaboration_passports (verified_at desc) where verified_at is not null;
create index if not exists collaboration_participants_profile_status_idx
  on public.collaboration_participants (profile_id, confirmation_status, created_at desc);

alter table public.collaboration_passports enable row level security;
alter table public.collaboration_participants enable row level security;
revoke all on public.collaboration_passports, public.collaboration_participants from anon, authenticated;
grant select on public.collaboration_passports, public.collaboration_participants to authenticated;

create or replace function public.can_read_collaboration_passport(candidate_passport_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.collaboration_passports passport
    where passport.id = candidate_passport_id
      and (
        passport.verified_at is not null
        or passport.creator_id = auth.uid()
        or exists (
          select 1 from public.collaboration_participants participant
          where participant.passport_id = passport.id and participant.profile_id = auth.uid()
        )
      )
  );
$$;
revoke all on function public.can_read_collaboration_passport(uuid) from public, anon;
grant execute on function public.can_read_collaboration_passport(uuid) to authenticated;

create policy collaboration_passports_read on public.collaboration_passports
for select to authenticated using (
  public.is_verified_student()
  and public.can_read_collaboration_passport(id)
);
create policy collaboration_participants_read on public.collaboration_participants
for select to authenticated using (
  public.is_verified_student()
  and (
    profile_id = (select auth.uid())
    or public.can_read_collaboration_passport(passport_id)
  )
);

create or replace function public.complete_collaboration(
  candidate_collaboration_id uuid,
  creator_role text,
  candidate_skills text[],
  candidate_duration text,
  candidate_project_url text,
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
     or (nullif(trim(candidate_project_url), '') is not null and nullif(trim(candidate_project_url), '') !~ '^https?://')
     or jsonb_typeof(participant_entries) <> 'array'
     or jsonb_array_length(participant_entries) < 1
     or jsonb_array_length(participant_entries) > 20 then
    raise exception 'INVALID_COMPLETION_DETAILS';
  end if;

  insert into public.collaboration_passports (
    collaboration_id, creator_id, project_name, skills_used, duration, project_url, completion_date
  ) values (
    collaboration_record.id, auth.uid(), collaboration_record.title,
    candidate_skills, trim(candidate_duration), nullif(trim(candidate_project_url), ''), current_date
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

  if not exists (
    select 1 from public.collaboration_participants participant
    where participant.passport_id = new_passport_id and participant.confirmation_status <> 'confirmed'
  ) then
    update public.collaboration_passports set verified_at = now() where id = new_passport_id;
  end if;
  update public.collaboration_posts set status = 'completed' where id = collaboration_record.id;
  return new_passport_id;
exception
  when unique_violation then raise exception 'DUPLICATE_PARTICIPANT_OR_COMPLETION';
end;
$$;

create or replace function public.confirm_collaboration_participation(
  candidate_passport_id uuid,
  accept_participation boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  if not public.is_verified_student() then return false; end if;
  update public.collaboration_participants
  set confirmation_status = case when accept_participation then 'confirmed' else 'declined' end,
      confirmed_at = now()
  where passport_id = candidate_passport_id
    and profile_id = auth.uid()
    and confirmation_status = 'pending';
  get diagnostics changed = row_count;
  if changed = 0 then return false; end if;

  update public.collaboration_passports passport
  set verified_at = case
    when not exists (
      select 1 from public.collaboration_participants participant
      where participant.passport_id = passport.id
        and participant.confirmation_status <> 'confirmed'
    ) then now()
    else null
  end
  where passport.id = candidate_passport_id;
  return true;
end;
$$;

revoke all on function public.complete_collaboration(uuid, text, text[], text, text, jsonb) from public, anon;
revoke all on function public.confirm_collaboration_participation(uuid, boolean) from public, anon;
grant execute on function public.complete_collaboration(uuid, text, text[], text, text, jsonb) to authenticated;
grant execute on function public.confirm_collaboration_participation(uuid, boolean) to authenticated;

create or replace function public.get_profile_collaboration_proofs(candidate_profile_id uuid)
returns table (
  id uuid,
  project_name text,
  skills_used text[],
  duration text,
  project_url text,
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

create table if not exists public.recommendation_events (
  id bigint generated by default as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type public.recommendation_entity not null,
  entity_id uuid not null,
  event_type public.recommendation_event_type not null,
  event_day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id, event_type, event_day)
);
alter table public.recommendation_events enable row level security;
revoke all on public.recommendation_events from anon, authenticated;
create index if not exists recommendation_events_user_recent_idx
  on public.recommendation_events (user_id, entity_type, event_type, created_at desc);
create index if not exists recommendation_events_entity_idx
  on public.recommendation_events (entity_type, entity_id, event_type, created_at desc);

create or replace function public.record_recommendation_event(
  candidate_entity_type public.recommendation_entity,
  candidate_entity_id uuid,
  candidate_event_type public.recommendation_event_type
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_verified_student() then return false; end if;
  if candidate_entity_type = 'post' and not exists (
    select 1 from public.social_posts post where post.id = candidate_entity_id and post.moderation_status = 'published'
  ) then return false;
  elsif candidate_entity_type = 'profile' and not public.is_verified_student(candidate_entity_id) then return false;
  elsif candidate_entity_type = 'collaboration' and not exists (
    select 1 from public.collaboration_posts collaboration
    where collaboration.id = candidate_entity_id and collaboration.moderation_status = 'published'
  ) then return false;
  end if;
  insert into public.recommendation_events (user_id, entity_type, entity_id, event_type)
  values (auth.uid(), candidate_entity_type, candidate_entity_id, candidate_event_type)
  on conflict (user_id, entity_type, entity_id, event_type, event_day)
  do update set created_at = now();
  return true;
end;
$$;
revoke all on function public.record_recommendation_event(public.recommendation_entity, uuid, public.recommendation_event_type) from public, anon;
grant execute on function public.record_recommendation_event(public.recommendation_entity, uuid, public.recommendation_event_type) to authenticated;

-- Stable, explainable RPC contract: an ML ranker can replace the score later
-- without changing the application query or returned reason.
create or replace function public.get_ranked_feed(
  result_limit integer default 20,
  result_offset integer default 0
)
returns table (post_id uuid, recommendation_reason text)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (select * from public.profiles where id = auth.uid()),
  candidates as (
    select
      post.id,
      post.author_id,
      post.created_at,
      exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = post.author_id) as follows_author,
      exists (
        select 1 from public.post_likes liked
        join public.social_posts prior on prior.id = liked.post_id
        where liked.user_id = auth.uid() and prior.author_id = post.author_id
      ) as liked_author_before,
      exists (
        select 1 from public.post_comments commented
        join public.social_posts prior on prior.id = commented.post_id
        where commented.author_id = auth.uid() and prior.author_id = post.author_id
      ) as commented_author_before,
      coalesce(author.campus_id = viewer.campus_id, false) as same_campus,
      (select count(*) from public.post_likes likes where likes.post_id = post.id) as likes,
      (select count(*) from public.post_comments comments where comments.post_id = post.id) as comments
    from public.social_posts post
    join public.profiles author on author.id = post.author_id and author.is_verified
    cross join viewer
    where public.is_verified_student() and post.moderation_status = 'published'
  )
  select
    candidate.id,
    case
      when candidate.follows_author then 'From someone you follow'
      when candidate.commented_author_before then 'You have joined this student''s conversations before'
      when candidate.liked_author_before then 'Similar to posts you liked'
      when candidate.same_campus then 'From your NST campus'
      when candidate.likes + candidate.comments >= 5 then 'Students are engaging with this'
      else 'Recent from the verified community'
    end
  from candidates candidate
  order by (
    candidate.follows_author::int * 40
    + candidate.commented_author_before::int * 16
    + candidate.liked_author_before::int * 10
    + candidate.same_campus::int * 5
    + least(candidate.likes, 20)::int
    + least(candidate.comments * 2, 20)::int
    + greatest(0, 48 - extract(epoch from (now() - candidate.created_at)) / 3600)::int
  ) desc, candidate.created_at desc, candidate.id
  limit least(greatest(result_limit, 1), 50)
  offset least(greatest(result_offset, 0), 5000);
$$;

create or replace function public.get_ranked_collaborations(
  result_limit integer default 20,
  result_offset integer default 0
)
returns table (collaboration_id uuid, recommendation_reason text)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (select * from public.profiles where id = auth.uid()),
  candidates as (
    select
      collaboration.id,
      collaboration.author_id,
      collaboration.status,
      collaboration.created_at,
      coalesce(collaboration.campus_id is null or collaboration.campus_id = viewer.campus_id, false) as campus_match,
      coalesce((
        select skill_name
        from unnest(collaboration.required_skills) skill_name
        where exists (
          select 1 from public.profile_skills viewer_skill
          join public.skills skill on skill.id = viewer_skill.skill_id
          where viewer_skill.profile_id = auth.uid() and lower(skill.name::text) = lower(skill_name)
        ) or exists (
          select 1 from public.profile_can_help viewer_help
          join public.skills skill on skill.id = viewer_help.skill_id
          where viewer_help.profile_id = auth.uid() and lower(skill.name::text) = lower(skill_name)
        )
        limit 1
      ), '') as matching_skill,
      exists (
        select 1 from public.recommendation_events event
        where event.user_id = auth.uid() and event.entity_type = 'collaboration'
          and event.entity_id = collaboration.id and event.event_type = 'connect'
      ) as connected_before,
      exists (
        select 1 from public.recommendation_events event
        where event.user_id = auth.uid() and event.entity_type = 'collaboration'
          and event.entity_id = collaboration.id and event.event_type = 'view'
      ) as viewed_before
    from public.collaboration_posts collaboration
    cross join viewer
    where public.is_verified_student() and collaboration.moderation_status = 'published'
  )
  select
    candidate.id,
    case
      when candidate.author_id = auth.uid() then 'Your collaboration'
      when candidate.matching_skill <> '' then 'Matches your ' || candidate.matching_skill || ' skill'
      when candidate.connected_before then 'You previously connected about this'
      when candidate.viewed_before then 'Based on collaborations you viewed'
      when candidate.campus_match then 'Relevant to your campus'
      else 'Open to the NST builder community'
    end
  from candidates candidate
  order by (
    (candidate.status = 'open')::int * 30
    + (candidate.matching_skill <> '')::int * 20
    + candidate.connected_before::int * 8
    + candidate.viewed_before::int * 3
    + candidate.campus_match::int * 5
    + greatest(0, 24 - extract(epoch from (now() - candidate.created_at)) / 3600)::int
  ) desc, candidate.created_at desc, candidate.id
  limit least(greatest(result_limit, 1), 50)
  offset least(greatest(result_offset, 0), 5000);
$$;

revoke all on function public.get_ranked_feed(integer, integer) from public, anon;
revoke all on function public.get_ranked_collaborations(integer, integer) from public, anon;
grant execute on function public.get_ranked_feed(integer, integer) to authenticated;
grant execute on function public.get_ranked_collaborations(integer, integer) to authenticated;

-- Status changes are constrained to Open/Closed through this RPC. Only the
-- completion RPC can set Completed, so a client cannot manufacture proof.
revoke update (status) on public.collaboration_posts from authenticated;
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
  if not public.is_verified_student() or candidate_status not in ('open', 'closed') then
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

create or replace function public.protect_completed_collaboration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'completed' then
    raise exception 'COMPLETED_COLLABORATION_IS_IMMUTABLE';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_completed_collaboration() from public, anon, authenticated;
drop trigger if exists collaboration_completed_immutable on public.collaboration_posts;
create trigger collaboration_completed_immutable
before update on public.collaboration_posts
for each row execute function public.protect_completed_collaboration();

-- Completed projects must not be reopened by capacity changes.
create or replace function public.sync_collaboration_capacity_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status not in ('closed', 'completed') then
    if new.team_capacity is not null and new.team_current >= new.team_capacity then
      new.status := 'full';
    elsif new.status = 'full' then
      new.status := 'open';
    end if;
  end if;
  return new;
end;
$$;

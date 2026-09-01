-- Structured builder profiles, richer collaboration calls, and deterministic
-- people recommendations. Existing profile and collaboration rows keep working
-- through nullable columns and conservative defaults.

alter table public.profiles
  add column if not exists current_status text;

alter table public.profiles
  add constraint profiles_current_status_length
    check (current_status is null or char_length(trim(current_status)) between 1 and 120) not valid;

create table if not exists public.profile_can_help (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_id bigint not null references public.skills(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, skill_id)
);

create table if not exists public.profile_needs_help (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_id bigint not null references public.skills(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, skill_id)
);

create index if not exists profile_can_help_skill_profile_idx
  on public.profile_can_help (skill_id, profile_id);
create index if not exists profile_needs_help_skill_profile_idx
  on public.profile_needs_help (skill_id, profile_id);
create index if not exists profiles_current_status_trgm_idx
  on public.profiles using gin (current_status extensions.gin_trgm_ops)
  where is_verified and current_status is not null;

alter table public.profile_can_help enable row level security;
alter table public.profile_needs_help enable row level security;

revoke all on public.profile_can_help, public.profile_needs_help from anon, authenticated;
grant select, insert, delete on public.profile_can_help, public.profile_needs_help to authenticated;
grant update (current_status) on public.profiles to authenticated;

create policy profile_can_help_read on public.profile_can_help
for select to authenticated
using (
  profile_id = (select auth.uid())
  or (public.is_verified_student() and public.is_verified_student(profile_id))
);
create policy profile_can_help_insert_own on public.profile_can_help
for insert to authenticated
with check (profile_id = (select auth.uid()) and public.is_verified_student());
create policy profile_can_help_delete_own on public.profile_can_help
for delete to authenticated
using (profile_id = (select auth.uid()) and public.is_verified_student());

create policy profile_needs_help_read on public.profile_needs_help
for select to authenticated
using (
  profile_id = (select auth.uid())
  or (public.is_verified_student() and public.is_verified_student(profile_id))
);
create policy profile_needs_help_insert_own on public.profile_needs_help
for insert to authenticated
with check (profile_id = (select auth.uid()) and public.is_verified_student());
create policy profile_needs_help_delete_own on public.profile_needs_help
for delete to authenticated
using (profile_id = (select auth.uid()) and public.is_verified_student());

do $$
begin
  create type public.collaboration_type as enum (
    'project', 'hackathon', 'open_source', 'startup', 'study', 'other'
  );
exception
  when duplicate_object then null;
end
$$;

alter type public.collaboration_status add value if not exists 'full' after 'open';

alter table public.collaboration_posts
  add column if not exists collaboration_type public.collaboration_type not null default 'project',
  add column if not exists required_skills text[] not null default '{}',
  add column if not exists team_current smallint not null default 1,
  add column if not exists team_capacity smallint,
  add column if not exists commitment text;

alter table public.collaboration_posts
  add constraint collaboration_required_skills_count
    check (cardinality(required_skills) <= 12) not valid,
  add constraint collaboration_team_current_valid
    check (team_current between 1 and 50) not valid,
  add constraint collaboration_team_capacity_valid
    check (team_capacity is null or team_capacity between 1 and 50) not valid,
  add constraint collaboration_team_size_valid
    check (team_capacity is null or team_current <= team_capacity) not valid,
  add constraint collaboration_commitment_length
    check (commitment is null or char_length(trim(commitment)) between 1 and 80) not valid;

grant update (
  collaboration_type, required_skills, team_current, team_capacity, commitment
) on public.collaboration_posts to authenticated;

create index if not exists collaboration_posts_type_recent_idx
  on public.collaboration_posts (status, collaboration_type, created_at desc);
create index if not exists collaboration_posts_required_skills_idx
  on public.collaboration_posts using gin (required_skills);

create or replace function public.sync_collaboration_capacity_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'closed' then
    if new.team_capacity is not null and new.team_current >= new.team_capacity then
      new.status := 'full';
    elsif new.status = 'full' then
      new.status := 'open';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists collaboration_capacity_status on public.collaboration_posts;
create trigger collaboration_capacity_status
before insert or update of team_current, team_capacity, status on public.collaboration_posts
for each row execute function public.sync_collaboration_capacity_status();

-- The result shape grows, so this must be recreated rather than replaced.
drop function if exists public.search_student_profiles(text, integer, integer);
create function public.search_student_profiles(
  search_text text default '',
  result_limit integer default 30,
  result_offset integer default 0
)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  campus_id uuid,
  graduation_year smallint,
  program text,
  current_status text,
  is_verified boolean,
  campus jsonb,
  skills jsonb,
  interests jsonb,
  can_help_with jsonb,
  needs_help_with jsonb,
  viewer_follows boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.username::text,
    p.full_name,
    p.avatar_url,
    p.campus_id,
    p.graduation_year,
    p.program,
    p.current_status,
    p.is_verified,
    jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'city', c.city),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name::text) order by s.name::text)
      from public.profile_skills ps join public.skills s on s.id = ps.skill_id
      where ps.profile_id = p.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name::text) order by i.name::text)
      from public.profile_interests pi join public.interests i on i.id = pi.interest_id
      where pi.profile_id = p.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name::text) order by s.name::text)
      from public.profile_can_help ph join public.skills s on s.id = ph.skill_id
      where ph.profile_id = p.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name::text) order by s.name::text)
      from public.profile_needs_help ph join public.skills s on s.id = ph.skill_id
      where ph.profile_id = p.id
    ), '[]'::jsonb),
    exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = p.id
    )
  from public.profiles p
  join public.campuses c on c.id = p.campus_id
  where public.is_verified_student()
    and p.is_verified
    and p.id <> auth.uid()
    and (
      nullif(trim(search_text), '') is null
      or not exists (
        select 1
        from unnest(regexp_split_to_array(lower(trim(search_text)), '[[:space:]]+')) term
        where not (
          lower(coalesce(p.full_name, '')) like '%' || term || '%'
          or lower(coalesce(p.username::text, '')) like '%' || term || '%'
          or lower(coalesce(p.program, '')) like '%' || term || '%'
          or lower(coalesce(p.current_status, '')) like '%' || term || '%'
          or lower(c.name) like '%' || term || '%'
          or lower(c.city) like '%' || term || '%'
          or lower(c.slug) like '%' || term || '%'
          or coalesce(p.graduation_year::text, '') like '%' || term || '%'
          or exists (
            select 1 from public.profile_skills ps join public.skills s on s.id = ps.skill_id
            where ps.profile_id = p.id and lower(s.name::text) like '%' || term || '%'
          )
          or exists (
            select 1 from public.profile_interests pi join public.interests i on i.id = pi.interest_id
            where pi.profile_id = p.id and lower(i.name::text) like '%' || term || '%'
          )
          or exists (
            select 1 from public.profile_can_help ph join public.skills s on s.id = ph.skill_id
            where ph.profile_id = p.id and lower(s.name::text) like '%' || term || '%'
          )
          or exists (
            select 1 from public.profile_needs_help ph join public.skills s on s.id = ph.skill_id
            where ph.profile_id = p.id and lower(s.name::text) like '%' || term || '%'
          )
        )
      )
    )
  order by p.full_name nulls last, p.id
  limit least(greatest(result_limit, 1), 50)
  offset least(greatest(result_offset, 0), 5000);
$$;

revoke all on function public.search_student_profiles(text, integer, integer) from public, anon;
grant execute on function public.search_student_profiles(text, integer, integer) to authenticated;

create or replace function public.get_profile_matches(result_limit integer default 6)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  campus_id uuid,
  graduation_year smallint,
  program text,
  current_status text,
  is_verified boolean,
  campus jsonb,
  skills jsonb,
  interests jsonb,
  can_help_with jsonb,
  needs_help_with jsonb,
  match_reason text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with candidates as (
    select
      p.*,
      c.slug as campus_slug,
      c.name as campus_name,
      c.city as campus_city,
      help_for_viewer.name as help_for_viewer,
      help_from_viewer.name as help_from_viewer,
      shared_interest.name as shared_interest,
      shared_skill.name as shared_skill,
      coalesce(p.campus_id = viewer.campus_id, false) as same_campus,
      coalesce(p.graduation_year is not null and p.graduation_year = viewer.graduation_year, false) as same_year,
      coalesce(
        nullif(lower(trim(p.current_status)), '') = nullif(lower(trim(viewer.current_status)), ''),
        false
      ) as same_status
    from public.profiles p
    join public.campuses c on c.id = p.campus_id
    join public.profiles viewer on viewer.id = auth.uid()
    left join lateral (
      select s.name::text as name
      from public.profile_can_help candidate_help
      join public.profile_needs_help viewer_need
        on viewer_need.profile_id = viewer.id and viewer_need.skill_id = candidate_help.skill_id
      join public.skills s on s.id = candidate_help.skill_id
      where candidate_help.profile_id = p.id
      order by s.name::text limit 1
    ) help_for_viewer on true
    left join lateral (
      select s.name::text as name
      from public.profile_needs_help candidate_need
      join public.profile_can_help viewer_help
        on viewer_help.profile_id = viewer.id and viewer_help.skill_id = candidate_need.skill_id
      join public.skills s on s.id = candidate_need.skill_id
      where candidate_need.profile_id = p.id
      order by s.name::text limit 1
    ) help_from_viewer on true
    left join lateral (
      select i.name::text as name
      from public.profile_interests candidate_interest
      join public.profile_interests viewer_interest
        on viewer_interest.profile_id = viewer.id and viewer_interest.interest_id = candidate_interest.interest_id
      join public.interests i on i.id = candidate_interest.interest_id
      where candidate_interest.profile_id = p.id
      order by i.name::text limit 1
    ) shared_interest on true
    left join lateral (
      select s.name::text as name
      from public.profile_skills candidate_skill
      join public.profile_skills viewer_skill
        on viewer_skill.profile_id = viewer.id and viewer_skill.skill_id = candidate_skill.skill_id
      join public.skills s on s.id = candidate_skill.skill_id
      where candidate_skill.profile_id = p.id
      order by s.name::text limit 1
    ) shared_skill on true
    where public.is_verified_student()
      and p.is_verified
      and p.id <> auth.uid()
      and not exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = p.id
      )
  )
  select
    candidate.id,
    candidate.username::text,
    candidate.full_name,
    candidate.avatar_url,
    candidate.campus_id,
    candidate.graduation_year,
    candidate.program,
    candidate.current_status,
    candidate.is_verified,
    jsonb_build_object(
      'id', candidate.campus_id,
      'slug', candidate.campus_slug,
      'name', candidate.campus_name,
      'city', candidate.campus_city
    ),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name::text) order by s.name::text)
      from public.profile_skills ps join public.skills s on s.id = ps.skill_id
      where ps.profile_id = candidate.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name::text) order by i.name::text)
      from public.profile_interests pi join public.interests i on i.id = pi.interest_id
      where pi.profile_id = candidate.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name::text) order by s.name::text)
      from public.profile_can_help ph join public.skills s on s.id = ph.skill_id
      where ph.profile_id = candidate.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name::text) order by s.name::text)
      from public.profile_needs_help ph join public.skills s on s.id = ph.skill_id
      where ph.profile_id = candidate.id
    ), '[]'::jsonb),
    case
      when candidate.help_for_viewer is not null then 'Can help with ' || candidate.help_for_viewer
      when candidate.help_from_viewer is not null then 'Needs ' || candidate.help_from_viewer || ' — you can help'
      when candidate.shared_interest is not null then 'Also interested in ' || candidate.shared_interest
      when candidate.shared_skill is not null then 'You both know ' || candidate.shared_skill
      when candidate.same_campus then 'Also at ' || candidate.campus_name
      when candidate.same_year then 'Also graduating in ' || candidate.graduation_year::text
      when candidate.same_status then 'Working toward something similar'
      else 'Another verified student builder'
    end
  from candidates candidate
  order by (
    (candidate.help_for_viewer is not null)::int * 5
    + (candidate.help_from_viewer is not null)::int * 5
    + (candidate.shared_interest is not null)::int * 3
    + (candidate.shared_skill is not null)::int * 2
    + candidate.same_campus::int * 2
    + candidate.same_year::int
    + candidate.same_status::int * 2
  ) desc, candidate.full_name nulls last, candidate.id
  limit least(greatest(result_limit, 1), 12);
$$;

revoke all on function public.get_profile_matches(integer) from public, anon;
grant execute on function public.get_profile_matches(integer) to authenticated;

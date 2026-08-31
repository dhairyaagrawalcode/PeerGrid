-- Production-readiness pass for the first ~1,000 PeerGrid users.
-- The indexes below match the application's feed, profile, discovery,
-- collaboration, follow, and direct-message query patterns.

create extension if not exists pg_trgm with schema extensions;

create index if not exists profiles_verified_name_idx
  on public.profiles (is_verified, full_name, id);
create index if not exists profiles_username_trgm_idx
  on public.profiles using gin ((username::text) extensions.gin_trgm_ops);
create index if not exists profiles_full_name_trgm_idx
  on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index if not exists profile_skills_skill_profile_idx
  on public.profile_skills (skill_id, profile_id);
create index if not exists profile_interests_interest_profile_idx
  on public.profile_interests (interest_id, profile_id);
create index if not exists collaboration_posts_author_recent_idx
  on public.collaboration_posts (author_id, created_at desc);
create index if not exists messages_unread_conversation_sender_idx
  on public.messages (conversation_id, sender_id, created_at desc)
  where read_at is null;

alter table public.profiles
  add constraint profiles_full_name_length
    check (full_name is null or char_length(trim(full_name)) between 2 and 80) not valid,
  add constraint profiles_program_length
    check (program is null or char_length(program) <= 100) not valid,
  add constraint profiles_avatar_url_safe
    check (avatar_url is null or (char_length(avatar_url) <= 2048 and avatar_url ~ '^https://')) not valid,
  add constraint profiles_github_url_safe
    check (github_url is null or (char_length(github_url) <= 2048 and github_url ~ '^https?://')) not valid,
  add constraint profiles_linkedin_url_safe
    check (linkedin_url is null or (char_length(linkedin_url) <= 2048 and linkedin_url ~ '^https?://')) not valid,
  add constraint profiles_portfolio_url_safe
    check (portfolio_url is null or (char_length(portfolio_url) <= 2048 and portfolio_url ~ '^https?://')) not valid;

alter table public.skills
  add constraint skills_name_length
    check (char_length(trim(name::text)) between 1 and 40) not valid;
alter table public.interests
  add constraint interests_name_length
    check (char_length(trim(name::text)) between 1 and 40) not valid;
alter table public.collaboration_posts
  add constraint collaboration_tags_count
    check (cardinality(tags) <= 12) not valid;

-- Search stays in Postgres and returns a bounded page. This avoids downloading
-- every profile (and every skill/interest relationship) into the browser.
create or replace function public.search_student_profiles(
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
  is_verified boolean,
  campus jsonb,
  skills jsonb,
  interests jsonb,
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
    p.is_verified,
    jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'city', c.city),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name::text) order by s.name::text)
      from public.profile_skills ps
      join public.skills s on s.id = ps.skill_id
      where ps.profile_id = p.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name::text) order by i.name::text)
      from public.profile_interests pi
      join public.interests i on i.id = pi.interest_id
      where pi.profile_id = p.id
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
          or lower(c.name) like '%' || term || '%'
          or lower(c.city) like '%' || term || '%'
          or lower(c.slug) like '%' || term || '%'
          or coalesce(p.graduation_year::text, '') like '%' || term || '%'
          or exists (
            select 1
            from public.profile_skills ps
            join public.skills s on s.id = ps.skill_id
            where ps.profile_id = p.id and lower(s.name::text) like '%' || term || '%'
          )
          or exists (
            select 1
            from public.profile_interests pi
            join public.interests i on i.id = pi.interest_id
            where pi.profile_id = p.id and lower(i.name::text) like '%' || term || '%'
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

-- A small fixed-window limiter protects write-heavy endpoints even if a caller
-- bypasses the UI and talks to Supabase directly.
create table if not exists public.action_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action_name text not null,
  window_started_at timestamptz not null default now(),
  action_count integer not null default 1 check (action_count > 0),
  primary key (user_id, action_name)
);

alter table public.action_rate_limits enable row level security;
revoke all on public.action_rate_limits from anon, authenticated;

create or replace function public.enforce_peergrid_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  rate_action text;
  max_actions integer;
  window_length interval;
  accepted uuid;
begin
  if current_user_id is null then
    return new;
  end if;

  if tg_table_name = 'messages' then
    rate_action := 'message'; max_actions := 60; window_length := interval '1 minute';
  elsif tg_table_name = 'post_comments' then
    rate_action := 'comment'; max_actions := 30; window_length := interval '1 minute';
  elsif tg_table_name = 'social_posts' then
    rate_action := 'post'; max_actions := 10; window_length := interval '5 minutes';
  elsif tg_table_name = 'collaboration_posts' then
    rate_action := 'collaboration'; max_actions := 10; window_length := interval '10 minutes';
  else
    return new;
  end if;

  insert into public.action_rate_limits as limits (
    user_id, action_name, window_started_at, action_count
  ) values (
    current_user_id, rate_action, now(), 1
  )
  on conflict (user_id, action_name) do update
  set window_started_at = case
        when limits.window_started_at + window_length <= now() then now()
        else limits.window_started_at
      end,
      action_count = case
        when limits.window_started_at + window_length <= now() then 1
        else limits.action_count + 1
      end
  where limits.window_started_at + window_length <= now()
     or limits.action_count < max_actions
  returning limits.user_id into accepted;

  if accepted is null then
    raise exception using errcode = 'P0001', message = 'RATE_LIMIT_EXCEEDED';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_peergrid_rate_limit() from public, anon, authenticated;

drop trigger if exists social_posts_rate_limit on public.social_posts;
create trigger social_posts_rate_limit before insert on public.social_posts
for each row execute function public.enforce_peergrid_rate_limit();
drop trigger if exists post_comments_rate_limit on public.post_comments;
create trigger post_comments_rate_limit before insert on public.post_comments
for each row execute function public.enforce_peergrid_rate_limit();
drop trigger if exists collaboration_posts_rate_limit on public.collaboration_posts;
create trigger collaboration_posts_rate_limit before insert on public.collaboration_posts
for each row execute function public.enforce_peergrid_rate_limit();
drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages
for each row execute function public.enforce_peergrid_rate_limit();

create or replace function public.protect_message_read_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.read_at is null or (old.read_at is not null and new.read_at < old.read_at) then
    raise exception using errcode = '22023', message = 'INVALID_READ_STATE';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_protect_read_state on public.messages;
create trigger messages_protect_read_state
before update of read_at on public.messages
for each row execute function public.protect_message_read_state();

-- Verified students may only read published media, plus their own temporary
-- uploads while a post is being created.
drop policy if exists post_media_read_verified on storage.objects;
create policy post_media_read_verified on storage.objects
for select to authenticated
using (
  bucket_id = 'post-media'
  and public.is_verified_student()
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.social_posts p where p.attachment_path = name)
  )
);

drop policy if exists post_media_delete_own on storage.objects;
create policy post_media_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Conversation summaries are bounded at the database boundary.
drop function if exists public.get_conversation_summaries();
create function public.get_conversation_summaries(
  result_limit integer default 50,
  result_offset integer default 0
)
returns table (
  conversation_id uuid,
  other_user_id uuid,
  other_username text,
  other_full_name text,
  other_avatar_url text,
  other_program text,
  created_at timestamptz,
  last_activity_at timestamptz,
  last_message_body text,
  last_message_sender_id uuid,
  last_message_created_at timestamptz,
  unread_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    other_profile.id,
    other_profile.username::text,
    other_profile.full_name,
    other_profile.avatar_url,
    other_profile.program,
    c.created_at,
    coalesce(c.last_message_at, c.created_at),
    latest.body,
    latest.sender_id,
    latest.created_at,
    (
      select count(*) from public.messages unread
      where unread.conversation_id = c.id
        and unread.sender_id <> auth.uid()
        and unread.read_at is null
    )
  from public.conversations c
  join public.profiles other_profile
    on other_profile.id = case
      when c.participant_low = auth.uid() then c.participant_high
      else c.participant_low
    end
  left join lateral (
    select m.body, m.sender_id, m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) latest on true
  where public.is_verified_student()
    and (c.participant_low = auth.uid() or c.participant_high = auth.uid())
  order by coalesce(c.last_message_at, c.created_at) desc
  limit least(greatest(result_limit, 1), 100)
  offset least(greatest(result_offset, 0), 5000);
$$;

revoke all on function public.get_conversation_summaries(integer, integer) from public, anon;
grant execute on function public.get_conversation_summaries(integer, integer) to authenticated;

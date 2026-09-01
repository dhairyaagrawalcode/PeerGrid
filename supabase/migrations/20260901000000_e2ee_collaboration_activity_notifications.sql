-- PeerGrid E2EE direct messages, collaboration activity, and confirmation notifications.
-- IMPORTANT: the legacy messages table contained plaintext. The project owner approved
-- deleting those rows during this migration; conversation shells are preserved.

create table if not exists public.user_crypto_devices (
  id uuid primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  box_public_key text not null,
  signing_public_key text not null,
  label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint user_crypto_devices_box_key_size check (char_length(box_public_key) between 40 and 96),
  constraint user_crypto_devices_sign_key_size check (char_length(signing_public_key) between 40 and 96),
  constraint user_crypto_devices_label_size check (label is null or char_length(label) <= 80)
);

create index if not exists user_crypto_devices_active_profile_idx
  on public.user_crypto_devices(profile_id, created_at desc)
  where revoked_at is null;

alter table public.user_crypto_devices enable row level security;

revoke all on public.user_crypto_devices from anon, authenticated;
grant select on public.user_crypto_devices to authenticated;

drop policy if exists "Users can read their crypto devices" on public.user_crypto_devices;
create policy "Users can read their crypto devices"
  on public.user_crypto_devices for select
  to authenticated
  using (profile_id = auth.uid());

create or replace function public.register_crypto_device(
  candidate_device_id uuid,
  candidate_box_public_key text,
  candidate_signing_public_key text,
  candidate_label text default null
)
returns table (
  id uuid,
  profile_id uuid,
  box_public_key text,
  signing_public_key text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_device public.user_crypto_devices%rowtype;
begin
  if current_user_id is null or not public.is_verified_student(current_user_id) then
    raise exception 'VERIFIED_USER_REQUIRED';
  end if;
  if candidate_device_id is null
     or char_length(candidate_box_public_key) not between 40 and 96
     or char_length(candidate_signing_public_key) not between 40 and 96
     or char_length(coalesce(candidate_label, '')) > 80 then
    raise exception 'INVALID_CRYPTO_DEVICE';
  end if;

  select * into existing_device
  from public.user_crypto_devices d
  where d.id = candidate_device_id;

  if found then
    if existing_device.profile_id <> current_user_id
       or existing_device.box_public_key <> candidate_box_public_key
       or existing_device.signing_public_key <> candidate_signing_public_key then
      raise exception 'CRYPTO_DEVICE_KEY_MISMATCH';
    end if;
    if existing_device.revoked_at is not null then
      raise exception 'CRYPTO_DEVICE_REVOKED';
    end if;
    update public.user_crypto_devices d
    set last_seen_at = now(), label = coalesce(nullif(candidate_label, ''), d.label)
    where d.id = candidate_device_id;
  else
    if (select count(*) from public.user_crypto_devices d where d.profile_id = current_user_id and d.revoked_at is null) >= 10 then
      update public.user_crypto_devices target
      set revoked_at = now()
      where target.id = (
        select d.id from public.user_crypto_devices d
        where d.profile_id = current_user_id and d.revoked_at is null
        order by d.last_seen_at asc, d.created_at asc
        limit 1
      );
    end if;
    insert into public.user_crypto_devices(id, profile_id, box_public_key, signing_public_key, label)
    values (candidate_device_id, current_user_id, candidate_box_public_key, candidate_signing_public_key, nullif(candidate_label, ''));
  end if;

  return query
  select d.id, d.profile_id, d.box_public_key, d.signing_public_key, d.created_at
  from public.user_crypto_devices d where d.id = candidate_device_id;
end;
$$;

create or replace function public.revoke_crypto_device(candidate_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_crypto_devices
  set revoked_at = coalesce(revoked_at, now())
  where id = candidate_device_id and profile_id = auth.uid();
  if not found then raise exception 'CRYPTO_DEVICE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.get_conversation_crypto_devices(candidate_conversation_id uuid)
returns table (
  device_id uuid,
  profile_id uuid,
  box_public_key text,
  signing_public_key text,
  revoked_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not exists (
    select 1 from public.conversations c
    where c.id = candidate_conversation_id
      and current_user_id in (c.participant_low, c.participant_high)
  ) then
    raise exception 'CONVERSATION_ACCESS_DENIED';
  end if;

  return query
  select d.id, d.profile_id, d.box_public_key, d.signing_public_key, d.revoked_at
  from public.user_crypto_devices d
  join public.conversations c on c.id = candidate_conversation_id
  where d.profile_id in (c.participant_low, c.participant_high)
  order by d.created_at;
end;
$$;

grant execute on function public.register_crypto_device(uuid, text, text, text) to authenticated;
grant execute on function public.revoke_crypto_device(uuid) to authenticated;
grant execute on function public.get_conversation_crypto_devices(uuid) to authenticated;

-- Explicitly approved one-time removal of legacy plaintext messages.
delete from public.messages;
update public.conversations set last_message_at = null;

drop function if exists public.get_conversation_summaries(integer, integer);
drop function if exists public.get_conversation_summaries();
alter table public.messages drop column if exists body;
alter table public.messages
  add column if not exists ciphertext text not null,
  add column if not exists nonce text not null,
  add column if not exists key_envelopes jsonb not null,
  add column if not exists encryption_version smallint not null default 1,
  add column if not exists sender_device_id uuid not null references public.user_crypto_devices(id),
  add column if not exists signature text not null;

alter table public.messages
  drop constraint if exists messages_ciphertext_size,
  add constraint messages_ciphertext_size check (char_length(ciphertext) between 1 and 12000),
  drop constraint if exists messages_nonce_size,
  add constraint messages_nonce_size check (char_length(nonce) between 24 and 80),
  drop constraint if exists messages_signature_size,
  add constraint messages_signature_size check (char_length(signature) between 40 and 180),
  drop constraint if exists messages_encryption_version,
  add constraint messages_encryption_version check (encryption_version = 1),
  drop constraint if exists messages_key_envelopes_object,
  add constraint messages_key_envelopes_object check (
    jsonb_typeof(key_envelopes) = 'object'
    and octet_length(key_envelopes::text) <= 6000
  );

create index if not exists messages_sender_device_idx on public.messages(sender_device_id);

create or replace function public.validate_encrypted_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_ids text[];
  provided_ids text[];
  envelope_count integer;
begin
  if auth.uid() is null or auth.uid() <> new.sender_id then
    raise exception 'MESSAGE_SENDER_MISMATCH';
  end if;
  if not exists (
    select 1 from public.conversations c
    where c.id = new.conversation_id
      and new.sender_id in (c.participant_low, c.participant_high)
  ) then
    raise exception 'CONVERSATION_ACCESS_DENIED';
  end if;
  if not exists (
    select 1 from public.user_crypto_devices d
    where d.id = new.sender_device_id
      and d.profile_id = new.sender_id
      and d.revoked_at is null
  ) then
    raise exception 'INVALID_SENDER_DEVICE';
  end if;

  select count(*) into envelope_count from jsonb_object_keys(new.key_envelopes);
  if envelope_count < 2 or envelope_count > 20 then
    raise exception 'INVALID_KEY_ENVELOPE_COUNT';
  end if;
  if exists (
    select 1 from jsonb_each_text(new.key_envelopes) envelope
    where char_length(envelope.value) not between 80 and 180
  ) then
    raise exception 'INVALID_KEY_ENVELOPE';
  end if;

  select array_agg(d.id::text order by d.id::text) into expected_ids
  from public.user_crypto_devices d
  join public.conversations c on c.id = new.conversation_id
  where d.profile_id in (c.participant_low, c.participant_high)
    and d.revoked_at is null;

  select array_agg(k order by k) into provided_ids
  from jsonb_object_keys(new.key_envelopes) as k;

  if expected_ids is null or provided_ids is distinct from expected_ids then
    raise exception 'INCOMPLETE_KEY_ENVELOPES';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_encrypted_message_trigger on public.messages;
create trigger validate_encrypted_message_trigger
before insert or update of ciphertext, nonce, key_envelopes, sender_device_id, signature, encryption_version
on public.messages
for each row execute function public.validate_encrypted_message();

drop function if exists public.get_conversation_summaries(integer, integer);
create function public.get_conversation_summaries(result_limit integer default 50, result_offset integer default 0)
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
    case when latest.id is null then null else 'Encrypted message' end,
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
    on other_profile.id = case when c.participant_low = auth.uid() then c.participant_high else c.participant_low end
  left join lateral (
    select m.id, m.sender_id, m.created_at from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc limit 1
  ) latest on true
  where public.is_verified_student()
    and auth.uid() in (c.participant_low, c.participant_high)
  order by coalesce(latest.created_at, c.created_at) desc
  limit greatest(1, least(result_limit, 100)) offset greatest(result_offset, 0);
$$;

revoke all on function public.get_conversation_summaries(integer, integer) from public, anon;
grant execute on function public.get_conversation_summaries(integer, integer) to authenticated;

create table if not exists public.collaboration_activity_events (
  id bigint generated always as identity primary key,
  collaboration_id uuid not null references public.collaboration_posts(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('created', 'updated', 'status_changed')),
  created_at timestamptz not null default now()
);

create index if not exists collaboration_activity_events_created_idx
  on public.collaboration_activity_events(created_at desc);
create index if not exists collaboration_activity_events_collaboration_idx
  on public.collaboration_activity_events(collaboration_id, created_at desc);

create table if not exists public.collaboration_activity_seen (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.collaboration_activity_events enable row level security;
alter table public.collaboration_activity_seen enable row level security;

revoke all on public.collaboration_activity_events, public.collaboration_activity_seen from anon, authenticated;
grant select on public.collaboration_activity_events, public.collaboration_activity_seen to authenticated;

drop policy if exists "Verified users can read collaboration activity" on public.collaboration_activity_events;
create policy "Verified users can read collaboration activity"
  on public.collaboration_activity_events for select to authenticated
  using (public.is_verified_student(auth.uid()));

drop policy if exists "Users can read own collaboration seen state" on public.collaboration_activity_seen;
create policy "Users can read own collaboration seen state"
  on public.collaboration_activity_seen for select to authenticated
  using (profile_id = auth.uid());

create or replace function public.capture_collaboration_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kind text;
begin
  if tg_op = 'INSERT' then
    kind := 'created';
  elsif new.status is distinct from old.status then
    kind := 'status_changed';
  elsif row(new.title, new.description, new.required_skills, new.campus_id, new.team_current, new.team_capacity, new.commitment)
     is distinct from
     row(old.title, old.description, old.required_skills, old.campus_id, old.team_current, old.team_capacity, old.commitment) then
    kind := 'updated';
  else
    return new;
  end if;
  insert into public.collaboration_activity_events(collaboration_id, actor_id, event_type)
  values (new.id, new.author_id, kind);
  return new;
end;
$$;

drop trigger if exists collaboration_activity_trigger on public.collaboration_posts;
create trigger collaboration_activity_trigger
after insert or update on public.collaboration_posts
for each row execute function public.capture_collaboration_activity();

create or replace function public.get_unread_collaboration_count()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  with viewer as (
    select p.id, p.campus_id, s.last_seen_at
    from public.profiles p
    left join public.collaboration_activity_seen s on s.profile_id = p.id
    where p.id = auth.uid()
  )
  select case when max(viewer.last_seen_at) is null then 0 else count(distinct e.id) end
  from viewer
  left join public.collaboration_activity_events e on e.created_at > viewer.last_seen_at and e.actor_id <> viewer.id
  left join public.collaboration_posts c on c.id = e.collaboration_id and c.moderation_status = 'published'
  where e.id is null or (
    c.id is not null and (
      (e.event_type = 'created' and c.status = 'open' and (c.campus_id is null or c.campus_id = viewer.campus_id))
      or exists (
        select 1 from public.recommendation_events r
        where r.user_id = viewer.id
          and r.entity_type = 'collaboration'
          and r.entity_id = c.id
          and r.event_type in ('view', 'connect')
      )
    )
  );
$$;

create or replace function public.mark_collaboration_activity_seen()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.collaboration_activity_seen(profile_id, last_seen_at)
  values (auth.uid(), now())
  on conflict (profile_id) do update set last_seen_at = excluded.last_seen_at;
$$;

grant execute on function public.get_unread_collaboration_count() to authenticated;
grant execute on function public.mark_collaboration_activity_seen() to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('collaboration_confirmation_required', 'collaboration_confirmation_confirmed', 'collaboration_confirmation_declined')),
  collaboration_id uuid references public.collaboration_posts(id) on delete cascade,
  passport_id uuid references public.collaboration_passports(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_dedupe unique(recipient_id, type, passport_id, actor_id)
);

create index if not exists notifications_recipient_unread_idx
  on public.notifications(recipient_id, created_at desc) where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
create or replace function public.capture_participation_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator uuid;
  collaboration uuid;
  creator_notification_type text;
begin
  select p.creator_id, p.collaboration_id into creator, collaboration
  from public.collaboration_passports p where p.id = new.passport_id;

  if tg_op = 'INSERT' and new.confirmation_status = 'pending'::public.participation_status then
    insert into public.notifications(recipient_id, actor_id, type, collaboration_id, passport_id)
    values (new.profile_id, creator, 'collaboration_confirmation_required', collaboration, new.passport_id)
    on conflict do nothing;
  elsif tg_op = 'UPDATE'
    and old.confirmation_status = 'pending'::public.participation_status
    and new.confirmation_status in ('confirmed'::public.participation_status, 'declined'::public.participation_status) then
    update public.notifications
    set read_at = coalesce(read_at, now())
    where recipient_id = new.profile_id
      and passport_id = new.passport_id
      and type = 'collaboration_confirmation_required';

    creator_notification_type := case
      when new.confirmation_status = 'confirmed'::public.participation_status
        then 'collaboration_confirmation_confirmed'
      else 'collaboration_confirmation_declined'
    end;
    insert into public.notifications(recipient_id, actor_id, type, collaboration_id, passport_id)
    values (creator, new.profile_id, creator_notification_type, collaboration, new.passport_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists collaboration_participation_notification_trigger on public.collaboration_participants;
create trigger collaboration_participation_notification_trigger
after insert or update of confirmation_status on public.collaboration_participants
for each row execute function public.capture_participation_notification();

insert into public.notifications(recipient_id, actor_id, type, collaboration_id, passport_id)
select cp.profile_id, passport.creator_id, 'collaboration_confirmation_required', passport.collaboration_id, passport.id
from public.collaboration_participants cp
join public.collaboration_passports passport on passport.id = cp.passport_id
where cp.confirmation_status = 'pending'::public.participation_status
on conflict do nothing;

create or replace function public.get_unread_notification_count()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*) from public.notifications n
  where n.recipient_id = auth.uid() and n.read_at is null;
$$;

create or replace function public.mark_notifications_read(notification_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where recipient_id = auth.uid()
    and read_at is null
    and (notification_ids is null or id = any(notification_ids));
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.get_unread_notification_count() to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

create index if not exists collaboration_posts_open_recommendation_idx
  on public.collaboration_posts(moderation_status, status, created_at desc)
  where moderation_status = 'published' and status = 'open';

-- One bounded query supplies feed/sidebar recommendations without N+1 reads.
-- The stable RPC contract can later be backed by a learned ranker.
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
  with viewer as (
    select profile.id, profile.campus_id
    from public.profiles profile
    where profile.id = auth.uid() and profile.is_verified
  ), candidates as (
    select
      collaboration.id,
      collaboration.created_at,
      collaboration.campus_id is null or collaboration.campus_id = viewer.campus_id as campus_match,
      coalesce((
        select required_skill
        from unnest(collaboration.required_skills) required_skill
        where exists (
          select 1 from public.profile_skills viewer_skill
          join public.skills skill on skill.id = viewer_skill.skill_id
          where viewer_skill.profile_id = viewer.id and lower(skill.name::text) = lower(required_skill)
        ) or exists (
          select 1 from public.profile_can_help viewer_help
          join public.skills skill on skill.id = viewer_help.skill_id
          where viewer_help.profile_id = viewer.id and lower(skill.name::text) = lower(required_skill)
        )
        limit 1
      ), '') as matching_skill,
      exists (
        select 1 from public.recommendation_events event
        where event.user_id = viewer.id and event.entity_type = 'collaboration'
          and event.entity_id = collaboration.id and event.event_type = 'connect'
      ) as connected_before,
      exists (
        select 1 from public.recommendation_events event
        where event.user_id = viewer.id and event.entity_type = 'collaboration'
          and event.entity_id = collaboration.id and event.event_type = 'view'
      ) as viewed_before
    from public.collaboration_posts collaboration
    cross join viewer
    where collaboration.moderation_status = 'published'
      and collaboration.status = 'open'
      and collaboration.author_id <> viewer.id
      and (collaboration.team_capacity is null or collaboration.team_current < collaboration.team_capacity)
  )
  select candidate.id,
    case
      when candidate.matching_skill <> '' then 'Matches your ' || candidate.matching_skill || ' skill'
      when candidate.connected_before then 'You previously connected about this'
      when candidate.viewed_before then 'Based on collaborations you viewed'
      when candidate.campus_match then 'Relevant to your campus'
      else 'Open to the NST builder community'
    end
  from candidates candidate
  order by (
    (candidate.matching_skill <> '')::int * 20
    + candidate.connected_before::int * 8
    + candidate.viewed_before::int * 3
    + candidate.campus_match::int * 5
    + greatest(0, 24 - extract(epoch from (now() - candidate.created_at)) / 3600)::int
  ) desc, candidate.created_at desc, candidate.id
  limit least(greatest(result_limit, 1), 50)
  offset least(greatest(result_offset, 0), 5000);
$$;

revoke all on function public.register_crypto_device(uuid, text, text, text) from public, anon;
revoke all on function public.revoke_crypto_device(uuid) from public, anon;
revoke all on function public.get_conversation_crypto_devices(uuid) from public, anon;
revoke all on function public.get_unread_collaboration_count() from public, anon;
revoke all on function public.mark_collaboration_activity_seen() from public, anon;
revoke all on function public.get_unread_notification_count() from public, anon;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
revoke all on function public.get_ranked_collaborations(integer, integer) from public, anon;

grant execute on function public.register_crypto_device(uuid, text, text, text) to authenticated;
grant execute on function public.revoke_crypto_device(uuid) to authenticated;
grant execute on function public.get_conversation_crypto_devices(uuid) to authenticated;
grant execute on function public.get_unread_collaboration_count() to authenticated;
grant execute on function public.mark_collaboration_activity_seen() to authenticated;
grant execute on function public.get_unread_notification_count() to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.get_ranked_collaborations(integer, integer) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'collaboration_activity_events'
  ) then
    alter publication supabase_realtime add table public.collaboration_activity_events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

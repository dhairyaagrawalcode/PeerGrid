-- Group DMs and general social notifications.

-- Generalize notifications while retaining the collaboration confirmation flow.
alter table public.notifications
  add column if not exists post_id uuid references public.social_posts(id) on delete cascade,
  add column if not exists comment_id uuid references public.post_comments(id) on delete cascade,
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'collaboration_confirmation_required', 'collaboration_confirmation_confirmed',
  'collaboration_confirmation_declined', 'new_follower', 'post_from_following',
  'new_collaboration', 'post_liked', 'post_commented', 'added_to_group'
));

create index if not exists notifications_post_idx on public.notifications(post_id) where post_id is not null;
create index if not exists notifications_conversation_idx on public.notifications(conversation_id) where conversation_id is not null;
create unique index if not exists notifications_follower_once_idx
  on public.notifications(recipient_id, actor_id, type) where type = 'new_follower';
create unique index if not exists notifications_post_event_once_idx
  on public.notifications(recipient_id, actor_id, type, post_id)
  where type in ('post_from_following', 'post_liked');
create unique index if not exists notifications_comment_once_idx
  on public.notifications(recipient_id, type, comment_id) where type = 'post_commented';
create unique index if not exists notifications_collaboration_once_idx
  on public.notifications(recipient_id, type, collaboration_id) where type = 'new_collaboration';
create unique index if not exists notifications_group_once_idx
  on public.notifications(recipient_id, type, conversation_id) where type = 'added_to_group';

create or replace function public.notify_new_follower()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(recipient_id, actor_id, type)
  values (new.following_id, new.follower_id, 'new_follower') on conflict do nothing;
  return new;
end;
$$;

create or replace function public.notify_post_like()
returns trigger language plpgsql security definer set search_path = '' as $$
declare post_author uuid;
begin
  select post.author_id into post_author from public.social_posts post where post.id = new.post_id;
  if post_author is not null and post_author <> new.user_id then
    insert into public.notifications(recipient_id, actor_id, type, post_id)
    values (post_author, new.user_id, 'post_liked', new.post_id) on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.notify_post_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare post_author uuid;
begin
  select post.author_id into post_author from public.social_posts post where post.id = new.post_id;
  if post_author is not null and post_author <> new.author_id then
    insert into public.notifications(recipient_id, actor_id, type, post_id, comment_id)
    values (post_author, new.author_id, 'post_commented', new.post_id, new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.notify_followers_about_post()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.moderation_status = 'published' and tg_op = 'INSERT' then
    insert into public.notifications(recipient_id, actor_id, type, post_id)
    select follow.follower_id, new.author_id, 'post_from_following', new.id
    from public.follows follow where follow.following_id = new.author_id on conflict do nothing;
  elsif new.moderation_status = 'published' and old.moderation_status is distinct from new.moderation_status then
    insert into public.notifications(recipient_id, actor_id, type, post_id)
    select follow.follower_id, new.author_id, 'post_from_following', new.id
    from public.follows follow where follow.following_id = new.author_id on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.notify_followers_about_collaboration()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.moderation_status = 'published' and tg_op = 'INSERT' then
    insert into public.notifications(recipient_id, actor_id, type, collaboration_id)
    select follow.follower_id, new.author_id, 'new_collaboration', new.id
    from public.follows follow where follow.following_id = new.author_id on conflict do nothing;
  elsif new.moderation_status = 'published' and old.moderation_status is distinct from new.moderation_status then
    insert into public.notifications(recipient_id, actor_id, type, collaboration_id)
    select follow.follower_id, new.author_id, 'new_collaboration', new.id
    from public.follows follow where follow.following_id = new.author_id on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists follows_notify_recipient on public.follows;
create trigger follows_notify_recipient after insert on public.follows for each row execute function public.notify_new_follower();
drop trigger if exists post_likes_notify_author on public.post_likes;
create trigger post_likes_notify_author after insert on public.post_likes for each row execute function public.notify_post_like();
drop trigger if exists post_comments_notify_author on public.post_comments;
create trigger post_comments_notify_author after insert on public.post_comments for each row execute function public.notify_post_comment();
drop trigger if exists social_posts_notify_followers on public.social_posts;
create trigger social_posts_notify_followers after insert or update of moderation_status on public.social_posts for each row execute function public.notify_followers_about_post();
drop trigger if exists collaboration_posts_notify_followers on public.collaboration_posts;
create trigger collaboration_posts_notify_followers after insert or update of moderation_status on public.collaboration_posts for each row execute function public.notify_followers_about_collaboration();

revoke all on function public.notify_new_follower() from public, anon, authenticated;
revoke all on function public.notify_post_like() from public, anon, authenticated;
revoke all on function public.notify_post_comment() from public, anon, authenticated;
revoke all on function public.notify_followers_about_post() from public, anon, authenticated;
revoke all on function public.notify_followers_about_collaboration() from public, anon, authenticated;

-- Conversation membership supports direct and group conversations uniformly.
alter table public.conversations
  add column if not exists kind text not null default 'direct',
  add column if not exists title text,
  add column if not exists created_by uuid references public.profiles(id) on delete cascade;

alter table public.conversations alter column participant_low drop not null;
alter table public.conversations alter column participant_high drop not null;
update public.conversations set created_by = participant_low where created_by is null and kind = 'direct';

alter table public.conversations drop constraint if exists conversations_kind_check;
alter table public.conversations add constraint conversations_kind_check check (kind in ('direct', 'group'));
alter table public.conversations drop constraint if exists conversations_title_size;
alter table public.conversations add constraint conversations_title_size check (title is null or char_length(trim(title)) between 2 and 80);
alter table public.conversations drop constraint if exists conversations_shape_check;
alter table public.conversations add constraint conversations_shape_check check (
  (kind = 'direct' and participant_low is not null and participant_high is not null)
  or (kind = 'group' and participant_low is null and participant_high is null and title is not null and created_by is not null)
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);
create index if not exists conversation_members_profile_idx on public.conversation_members(profile_id, conversation_id);

insert into public.conversation_members(conversation_id, profile_id, role, joined_at)
select conversation.id, conversation.participant_low,
  case when conversation.created_by = conversation.participant_low then 'owner' else 'member' end,
  conversation.created_at
from public.conversations conversation where conversation.participant_low is not null on conflict do nothing;
insert into public.conversation_members(conversation_id, profile_id, role, joined_at)
select conversation.id, conversation.participant_high,
  case when conversation.created_by = conversation.participant_high then 'owner' else 'member' end,
  conversation.created_at
from public.conversations conversation where conversation.participant_high is not null on conflict do nothing;

create table if not exists public.conversation_read_state (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);
create index if not exists conversation_read_state_profile_idx on public.conversation_read_state(profile_id, conversation_id, last_read_at);

insert into public.conversation_read_state(conversation_id, profile_id, last_read_at)
select member.conversation_id, member.profile_id,
  coalesce((select max(message.created_at) from public.messages message
    where message.conversation_id = member.conversation_id
      and (message.sender_id = member.profile_id or message.read_at is not null)), member.joined_at)
from public.conversation_members member on conflict do nothing;

alter table public.conversation_members enable row level security;
alter table public.conversation_read_state enable row level security;
revoke all on public.conversation_members, public.conversation_read_state from anon, authenticated;
grant select on public.conversation_members, public.conversation_read_state to authenticated;

create or replace function public.is_conversation_member(candidate_conversation_id uuid, candidate_profile_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_members member
    where member.conversation_id = candidate_conversation_id and member.profile_id = candidate_profile_id);
$$;

drop policy if exists conversation_members_read_member on public.conversation_members;
create policy conversation_members_read_member on public.conversation_members for select to authenticated
using (public.is_verified_student() and public.is_conversation_member(conversation_id));
drop policy if exists conversation_read_state_read_own on public.conversation_read_state;
create policy conversation_read_state_read_own on public.conversation_read_state for select to authenticated using (profile_id = auth.uid());
drop policy if exists conversations_read_participant on public.conversations;
create policy conversations_read_participant on public.conversations for select to authenticated
using (public.is_verified_student() and public.is_conversation_member(id));
drop policy if exists messages_read_participant on public.messages;
create policy messages_read_participant on public.messages for select to authenticated
using (public.is_verified_student() and public.is_conversation_member(conversation_id));
drop policy if exists messages_send_as_self on public.messages;
create policy messages_send_as_self on public.messages for insert to authenticated
with check (public.is_verified_student() and sender_id = auth.uid() and public.is_conversation_member(conversation_id));
drop policy if exists messages_mark_received_as_read on public.messages;
revoke update (read_at) on public.messages from authenticated;

create or replace function public.get_or_create_conversation(other_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); low_id uuid; high_id uuid; conversation_id uuid;
begin
  if current_user_id is null or other_user_id is null or other_user_id = current_user_id then raise exception 'INVALID_CONVERSATION_PARTICIPANT'; end if;
  if not public.is_verified_student(current_user_id) or not public.is_verified_student(other_user_id) then raise exception 'VERIFIED_USERS_REQUIRED'; end if;
  if current_user_id::text < other_user_id::text then low_id := current_user_id; high_id := other_user_id;
  else low_id := other_user_id; high_id := current_user_id; end if;
  insert into public.conversations(participant_low, participant_high, kind, created_by)
  values (low_id, high_id, 'direct', current_user_id)
  on conflict (participant_low, participant_high) do nothing returning id into conversation_id;
  if conversation_id is null then select conversation.id into conversation_id from public.conversations conversation
    where conversation.participant_low = low_id and conversation.participant_high = high_id; end if;
  insert into public.conversation_members(conversation_id, profile_id, role)
  values (conversation_id, current_user_id, 'owner'), (conversation_id, other_user_id, 'member') on conflict do nothing;
  insert into public.conversation_read_state(conversation_id, profile_id)
  values (conversation_id, current_user_id), (conversation_id, other_user_id) on conflict do nothing;
  return conversation_id;
end;
$$;

create or replace function public.create_group_conversation(candidate_title text, candidate_member_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); clean_member_ids uuid[]; new_group_id uuid;
begin
  if current_user_id is null or not public.is_verified_student(current_user_id) or char_length(trim(coalesce(candidate_title, ''))) not between 2 and 80 then raise exception 'INVALID_GROUP'; end if;
  select array_agg(distinct selected_member.profile_id order by selected_member.profile_id) into clean_member_ids
  from unnest(coalesce(candidate_member_ids, '{}'::uuid[])) as selected_member(profile_id)
  where selected_member.profile_id is not null and selected_member.profile_id <> current_user_id;
  if coalesce(cardinality(clean_member_ids), 0) not between 2 and 9 then raise exception 'GROUP_REQUIRES_3_TO_10_MEMBERS'; end if;
  if (select count(*) from public.profiles profile where profile.id = any(clean_member_ids) and profile.is_verified) <> cardinality(clean_member_ids) then raise exception 'INVALID_GROUP_MEMBER'; end if;
  insert into public.conversations(kind, title, created_by) values ('group', trim(candidate_title), current_user_id) returning id into new_group_id;
  insert into public.conversation_members(conversation_id, profile_id, role) values (new_group_id, current_user_id, 'owner');
  insert into public.conversation_members(conversation_id, profile_id, role)
    select new_group_id, selected_member.profile_id, 'member' from unnest(clean_member_ids) as selected_member(profile_id);
  insert into public.conversation_read_state(conversation_id, profile_id)
    select member.conversation_id, member.profile_id from public.conversation_members member where member.conversation_id = new_group_id;
  insert into public.notifications(recipient_id, actor_id, type, conversation_id)
    select selected_member.profile_id, current_user_id, 'added_to_group', new_group_id
    from unnest(clean_member_ids) as selected_member(profile_id) on conflict do nothing;
  return new_group_id;
end;
$$;

create or replace function public.mark_conversation_read(candidate_conversation_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare unread integer;
begin
  if not public.is_conversation_member(candidate_conversation_id) then raise exception 'CONVERSATION_ACCESS_DENIED'; end if;
  select count(*)::integer into unread from public.messages message
  left join public.conversation_read_state state on state.conversation_id = message.conversation_id and state.profile_id = auth.uid()
  where message.conversation_id = candidate_conversation_id and message.sender_id <> auth.uid()
    and message.created_at > coalesce(state.last_read_at, '-infinity'::timestamptz);
  insert into public.conversation_read_state(conversation_id, profile_id, last_read_at)
  values (candidate_conversation_id, auth.uid(), now())
  on conflict (conversation_id, profile_id) do update set last_read_at = excluded.last_read_at;
  return unread;
end;
$$;

create or replace function public.get_unread_message_count()
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from public.messages message
  join public.conversation_members member on member.conversation_id = message.conversation_id and member.profile_id = auth.uid()
  left join public.conversation_read_state state on state.conversation_id = message.conversation_id and state.profile_id = auth.uid()
  where public.is_verified_student() and message.sender_id <> auth.uid()
    and message.created_at > coalesce(state.last_read_at, '-infinity'::timestamptz);
$$;

create or replace function public.get_conversation_crypto_devices(candidate_conversation_id uuid)
returns table (device_id uuid, profile_id uuid, box_public_key text, signing_public_key text, revoked_at timestamptz)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_conversation_member(candidate_conversation_id) then raise exception 'CONVERSATION_ACCESS_DENIED'; end if;
  if exists (
    select 1 from public.conversation_members member
    where member.conversation_id = candidate_conversation_id
      and not exists (
        select 1 from public.user_crypto_devices active_device
        where active_device.profile_id = member.profile_id and active_device.revoked_at is null
      )
  ) then raise exception 'CONVERSATION_MEMBER_KEY_MISSING'; end if;
  return query select device.id, device.profile_id, device.box_public_key, device.signing_public_key, device.revoked_at
  from public.user_crypto_devices device join public.conversation_members member on member.profile_id = device.profile_id
  where member.conversation_id = candidate_conversation_id order by device.created_at;
end;
$$;

create or replace function public.validate_encrypted_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare expected_ids text[]; provided_ids text[]; envelope_count integer;
begin
  if auth.uid() is null or auth.uid() <> new.sender_id then raise exception 'MESSAGE_SENDER_MISMATCH'; end if;
  if not public.is_conversation_member(new.conversation_id, new.sender_id) then raise exception 'CONVERSATION_ACCESS_DENIED'; end if;
  if exists (
    select 1 from public.conversation_members member
    where member.conversation_id = new.conversation_id
      and not exists (
        select 1 from public.user_crypto_devices active_device
        where active_device.profile_id = member.profile_id and active_device.revoked_at is null
      )
  ) then raise exception 'CONVERSATION_MEMBER_KEY_MISSING'; end if;
  if not exists (select 1 from public.user_crypto_devices device where device.id = new.sender_device_id and device.profile_id = new.sender_id and device.revoked_at is null) then raise exception 'INVALID_SENDER_DEVICE'; end if;
  select count(*) into envelope_count from jsonb_object_keys(new.key_envelopes);
  if envelope_count < 2 or envelope_count > 100 then raise exception 'INVALID_KEY_ENVELOPE_COUNT'; end if;
  if octet_length(new.key_envelopes::text) > 20000 or exists (select 1 from jsonb_each_text(new.key_envelopes) envelope where char_length(envelope.value) not between 80 and 180) then raise exception 'INVALID_KEY_ENVELOPE'; end if;
  select array_agg(device.id::text order by device.id::text) into expected_ids
  from public.user_crypto_devices device join public.conversation_members member on member.profile_id = device.profile_id
  where member.conversation_id = new.conversation_id and device.revoked_at is null;
  select array_agg(key order by key) into provided_ids from jsonb_object_keys(new.key_envelopes) key;
  if expected_ids is null or provided_ids is distinct from expected_ids then raise exception 'INCOMPLETE_KEY_ENVELOPES'; end if;
  return new;
end;
$$;

alter table public.messages drop constraint if exists messages_key_envelopes_object;
alter table public.messages add constraint messages_key_envelopes_object check (jsonb_typeof(key_envelopes) = 'object' and octet_length(key_envelopes::text) <= 20000);

drop function if exists public.get_conversation_summaries(integer, integer);
create function public.get_conversation_summaries(result_limit integer default 50, result_offset integer default 0)
returns table (
  conversation_id uuid, other_user_id uuid, other_username text, other_full_name text,
  other_avatar_url text, other_program text, created_at timestamptz, last_activity_at timestamptz,
  last_message_body text, last_message_sender_id uuid, last_message_created_at timestamptz,
  unread_count bigint, is_group boolean, group_title text, member_count bigint
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
    conversation.kind = 'group', conversation.title,
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

revoke all on function public.is_conversation_member(uuid, uuid) from public, anon;
revoke all on function public.get_or_create_conversation(uuid) from public, anon;
revoke all on function public.create_group_conversation(text, uuid[]) from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
revoke all on function public.get_unread_message_count() from public, anon;
revoke all on function public.get_conversation_crypto_devices(uuid) from public, anon;
revoke all on function public.get_conversation_summaries(integer, integer) from public, anon;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.get_unread_message_count() to authenticated;
grant execute on function public.get_conversation_crypto_devices(uuid) to authenticated;
grant execute on function public.get_conversation_summaries(integer, integer) to authenticated;

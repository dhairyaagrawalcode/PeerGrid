-- Remove application-level E2EE from new messages while preserving legacy rows.
-- Existing ciphertext/device rows stay intact and read-only; no destructive migration is attempted.

alter table public.social_posts add column if not exists attachment_size bigint;
alter table public.social_posts
  drop constraint if exists social_posts_attachment_size,
  add constraint social_posts_attachment_size check (attachment_size is null or attachment_size between 1 and 26214400);

alter type public.recommendation_event_type add value if not exists 'interested';
alter type public.recommendation_event_type add value if not exists 'not_interested';

drop trigger if exists validate_encrypted_message_trigger on public.messages;

alter table public.messages
  add column if not exists body text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  alter column ciphertext drop not null,
  alter column nonce drop not null,
  alter column key_envelopes drop not null,
  alter column encryption_version drop not null,
  alter column encryption_version drop default,
  alter column sender_device_id drop not null,
  alter column signature drop not null;

alter table public.messages
  drop constraint if exists messages_ciphertext_size,
  add constraint messages_ciphertext_size check (ciphertext is null or char_length(ciphertext) between 1 and 12000),
  drop constraint if exists messages_nonce_size,
  add constraint messages_nonce_size check (nonce is null or char_length(nonce) between 24 and 80),
  drop constraint if exists messages_signature_size,
  add constraint messages_signature_size check (signature is null or char_length(signature) between 40 and 180),
  drop constraint if exists messages_encryption_version,
  add constraint messages_encryption_version check (encryption_version is null or encryption_version = 1),
  drop constraint if exists messages_key_envelopes_object,
  add constraint messages_key_envelopes_object check (
    key_envelopes is null or (jsonb_typeof(key_envelopes) = 'object' and octet_length(key_envelopes::text) <= 20000)
  ),
  drop constraint if exists messages_body_or_legacy,
  add constraint messages_body_or_legacy check (
    (body is not null and char_length(trim(body)) between 1 and 2000)
    or (body is null and attachment_path is not null and ciphertext is null)
    or (body is null and ciphertext is not null)
  ),
  drop constraint if exists messages_attachment_metadata,
  add constraint messages_attachment_metadata check (
    attachment_path is null
    or ciphertext is not null
    or (
      attachment_name is not null and char_length(attachment_name) between 1 and 180
      and attachment_mime is not null and char_length(attachment_mime) between 3 and 120
    )
  );

-- The private bucket remains participant-gated by its existing storage policies.
-- Allow the original MIME type for new, unencrypted files so images/video render normally.
update storage.buckets
set allowed_mime_types = null, file_size_limit = 26214400, public = false
where id = 'message-media';

revoke execute on function public.register_crypto_device(uuid, text, text, text) from authenticated;
revoke execute on function public.revoke_crypto_device(uuid) from authenticated;
revoke execute on function public.get_conversation_crypto_devices(uuid) from authenticated;

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
    case
      when latest.id is null then null
      when latest.body is not null then latest.body
      when latest.attachment_kind = 'image' then 'Photo'
      when latest.attachment_kind = 'video' then 'Video'
      when latest.attachment_kind = 'document' then coalesce(latest.attachment_name, 'Document')
      else 'Legacy encrypted message'
    end,
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
  left join lateral (
    select message.id, message.sender_id, message.body, message.attachment_kind, message.attachment_name, message.created_at
    from public.messages message
    where message.conversation_id = conversation.id order by message.created_at desc limit 1) latest on true
  where viewer_member.profile_id = auth.uid() and public.is_verified_student()
  order by coalesce(conversation.last_message_at, conversation.created_at) desc
  limit least(greatest(result_limit, 1), 100) offset least(greatest(result_offset, 0), 5000);
$$;
revoke all on function public.get_conversation_summaries(integer, integer) from public, anon;
grant execute on function public.get_conversation_summaries(integer, integer) to authenticated;

create or replace function public.get_ranked_feed(result_limit integer default 20, result_offset integer default 0)
returns table (post_id uuid, recommendation_reason text)
language sql stable security definer set search_path = '' as $$
  with viewer as (select * from public.profiles where id = auth.uid()),
  candidates as (
    select post.id, post.author_id, post.created_at,
      exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = post.author_id) as follows_author,
      exists (select 1 from public.post_likes liked join public.social_posts prior on prior.id = liked.post_id where liked.user_id = auth.uid() and prior.author_id = post.author_id) as liked_author_before,
      exists (select 1 from public.post_comments commented join public.social_posts prior on prior.id = commented.post_id where commented.author_id = auth.uid() and prior.author_id = post.author_id) as commented_author_before,
      exists (select 1 from public.recommendation_events event where event.user_id = auth.uid() and event.entity_type = 'post' and event.entity_id = post.id and event.event_type::text = 'interested') as marked_interested,
      exists (
        select 1 from public.recommendation_events event
        join public.social_posts signaled_post on signaled_post.id = event.entity_id
        where event.user_id = auth.uid() and event.entity_type = 'post'
          and event.event_type::text = 'interested' and event.created_at > now() - interval '90 days'
          and signaled_post.author_id = post.author_id
      ) as interested_in_author,
      (
        select count(*) from public.recommendation_events event
        join public.social_posts signaled_post on signaled_post.id = event.entity_id
        where event.user_id = auth.uid() and event.entity_type = 'post'
          and event.event_type::text = 'not_interested' and event.created_at > now() - interval '90 days'
          and signaled_post.author_id = post.author_id
      ) as author_negative_signals,
      coalesce(author.campus_id = viewer.campus_id, false) as same_campus,
      (select count(*) from public.post_likes likes where likes.post_id = post.id) as likes,
      (select count(*) from public.post_comments comments where comments.post_id = post.id) as comments
    from public.social_posts post
    join public.profiles author on author.id = post.author_id and author.is_verified
    cross join viewer
    where public.is_verified_student() and post.moderation_status = 'published'
      and not exists (
        select 1 from public.recommendation_events event
        where event.user_id = auth.uid() and event.entity_type = 'post' and event.entity_id = post.id
          and event.event_type::text = 'not_interested' and event.created_at > now() - interval '90 days'
      )
  )
  select candidate.id,
    case when candidate.marked_interested then 'Because you marked this post as interesting'
      when candidate.interested_in_author then 'Similar to posts you marked interesting'
      when candidate.follows_author then 'From someone you follow'
      when candidate.commented_author_before then 'You have joined this student''s conversations before'
      when candidate.liked_author_before then 'Similar to posts you liked'
      when candidate.same_campus then 'From your NST campus'
      when candidate.likes + candidate.comments >= 5 then 'Students are engaging with this'
      else 'Recent from the verified community' end
  from candidates candidate
  order by (candidate.marked_interested::int * 30 + candidate.interested_in_author::int * 14
    + candidate.follows_author::int * 40
    + candidate.commented_author_before::int * 16 + candidate.liked_author_before::int * 10
    + candidate.same_campus::int * 5 + least(candidate.likes, 20)::int
    + least(candidate.comments * 2, 20)::int
    + greatest(0, 48 - extract(epoch from (now() - candidate.created_at)) / 3600)::int
    - least(candidate.author_negative_signals * 18, 54)::int) desc,
    candidate.created_at desc, candidate.id
  limit least(greatest(result_limit, 1), 50)
  offset least(greatest(result_offset, 0), 5000);
$$;
revoke all on function public.get_ranked_feed(integer, integer) from public, anon;
grant execute on function public.get_ranked_feed(integer, integer) to authenticated;

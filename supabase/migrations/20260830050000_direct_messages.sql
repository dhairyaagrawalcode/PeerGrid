create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_low uuid not null references public.profiles(id) on delete cascade,
  participant_high uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_distinct_participants check (participant_low <> participant_high),
  constraint conversations_canonical_pair check (participant_low::text < participant_high::text),
  unique (participant_low, participant_high)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index conversations_low_activity_idx
on public.conversations(participant_low, last_message_at desc nulls last, created_at desc);

create index conversations_high_activity_idx
on public.conversations(participant_high, last_message_at desc nulls last, created_at desc);

create index messages_conversation_created_idx
on public.messages(conversation_id, created_at asc);

create index messages_unread_idx
on public.messages(conversation_id, created_at desc)
where read_at is null;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations, public.messages from anon, authenticated;
grant select on public.conversations, public.messages to authenticated;
grant insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

create policy conversations_read_participant
on public.conversations
for select to authenticated
using (
  public.is_verified_student()
  and (participant_low = (select auth.uid()) or participant_high = (select auth.uid()))
);

create policy messages_read_participant
on public.messages
for select to authenticated
using (
  public.is_verified_student()
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.participant_low = (select auth.uid()) or c.participant_high = (select auth.uid()))
  )
);

create policy messages_send_as_self
on public.messages
for insert to authenticated
with check (
  public.is_verified_student()
  and sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.participant_low = (select auth.uid()) or c.participant_high = (select auth.uid()))
  )
);

create policy messages_mark_received_as_read
on public.messages
for update to authenticated
using (
  public.is_verified_student()
  and sender_id <> (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.participant_low = (select auth.uid()) or c.participant_high = (select auth.uid()))
  )
)
with check (
  sender_id <> (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.participant_low = (select auth.uid()) or c.participant_high = (select auth.uid()))
  )
);

create or replace function public.get_or_create_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  low_id uuid;
  high_id uuid;
  conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if other_user_id is null or other_user_id = current_user_id then
    raise exception 'Choose another student';
  end if;

  if not public.is_verified_student(current_user_id)
    or not public.is_verified_student(other_user_id) then
    raise exception 'Both students must be verified';
  end if;

  if current_user_id::text < other_user_id::text then
    low_id := current_user_id;
    high_id := other_user_id;
  else
    low_id := other_user_id;
    high_id := current_user_id;
  end if;

  insert into public.conversations (participant_low, participant_high)
  values (low_id, high_id)
  on conflict (participant_low, participant_high) do nothing
  returning id into conversation_id;

  if conversation_id is null then
    select c.id into conversation_id
    from public.conversations c
    where c.participant_low = low_id and c.participant_high = high_id;
  end if;

  return conversation_id;
end;
$$;

create or replace function public.touch_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_after_message();

create or replace function public.get_conversation_summaries()
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
    other_profile.username,
    other_profile.full_name,
    other_profile.avatar_url,
    other_profile.program,
    c.created_at,
    coalesce(c.last_message_at, c.created_at),
    latest.body,
    latest.sender_id,
    latest.created_at,
    (
      select count(*)
      from public.messages unread
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
  order by coalesce(c.last_message_at, c.created_at) desc;
$$;

create or replace function public.get_unread_message_count()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where public.is_verified_student()
    and (c.participant_low = auth.uid() or c.participant_high = auth.uid())
    and m.sender_id <> auth.uid()
    and m.read_at is null;
$$;

revoke all on function public.get_or_create_conversation(uuid) from public, anon;
revoke all on function public.get_conversation_summaries() from public, anon;
revoke all on function public.get_unread_message_count() from public, anon;
revoke all on function public.touch_conversation_after_message() from public, anon, authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;
grant execute on function public.get_conversation_summaries() to authenticated;
grant execute on function public.get_unread_message_count() to authenticated;

alter table public.messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end;
$$;

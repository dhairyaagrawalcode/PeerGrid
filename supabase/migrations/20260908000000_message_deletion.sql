-- Let verified senders delete only their own encrypted messages. Recipients and
-- group owners cannot delete another member's message.

grant delete on public.messages to authenticated;

drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own
on public.messages
for delete to authenticated
using (
  public.is_verified_student()
  and sender_id = (select auth.uid())
  and public.is_conversation_member(conversation_id)
);

-- Keep inbox ordering accurate when the most recent message is removed.
create or replace function public.sync_conversation_after_message_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations conversation
  set last_message_at = (
    select max(message.created_at)
    from public.messages message
    where message.conversation_id = old.conversation_id
  )
  where conversation.id = old.conversation_id;
  return old;
end;
$$;

revoke all on function public.sync_conversation_after_message_delete() from public, anon, authenticated;

drop trigger if exists messages_sync_conversation_after_delete on public.messages;
create trigger messages_sync_conversation_after_delete
after delete on public.messages
for each row execute function public.sync_conversation_after_message_delete();

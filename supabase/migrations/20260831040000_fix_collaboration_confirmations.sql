-- Fix participant confirmation updates. A CASE containing only string literals
-- resolves to text, so explicitly cast each result to the participation enum.

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
  if auth.uid() is null or not public.is_verified_student() then
    return false;
  end if;

  update public.collaboration_participants
  set confirmation_status = case
        when accept_participation then 'confirmed'::public.participation_status
        else 'declined'::public.participation_status
      end,
      confirmed_at = now()
  where passport_id = candidate_passport_id
    and profile_id = auth.uid()
    and confirmation_status = 'pending'::public.participation_status;

  get diagnostics changed = row_count;
  if changed = 0 then
    return false;
  end if;

  update public.collaboration_passports passport
  set verified_at = case
    when not exists (
      select 1
      from public.collaboration_participants participant
      where participant.passport_id = passport.id
        and participant.confirmation_status <> 'confirmed'::public.participation_status
    ) then now()
    else null
  end
  where passport.id = candidate_passport_id;

  return true;
end;
$$;

revoke all on function public.confirm_collaboration_participation(uuid, boolean)
from public, anon;
grant execute on function public.confirm_collaboration_participation(uuid, boolean)
to authenticated;

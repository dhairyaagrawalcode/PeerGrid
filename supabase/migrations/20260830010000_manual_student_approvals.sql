do $$
begin
  create type public.student_approval_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.student_approvals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email extensions.citext not null unique,
  status public.student_approval_status not null default 'pending',
  review_note text check (char_length(review_note) <= 500),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists student_approvals_queue_idx
  on public.student_approvals(status, submitted_at);

-- Existing authenticated users enter the same review queue when this migration
-- is applied to a project that already has accounts.
insert into public.student_approvals (user_id, email)
select id, email
from auth.users
where email is not null
on conflict (user_id) do nothing;

-- While no domains are configured, signup is open and manual review is the
-- trust gate. Adding one or more domains later automatically restricts signup
-- to that allow-list without changing the approval workflow.
create or replace function public.domain_is_allowed(candidate_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not exists (
      select 1 from public.allowed_email_domains d where d.is_active
    )
    or exists (
      select 1
      from public.allowed_email_domains d
      where d.is_active
        and lower(d.domain::text) = lower(split_part(candidate_email, '@', 2))
    );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, is_verified)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    new.email_confirmed_at is not null and public.domain_is_allowed(new.email)
  )
  on conflict (id) do nothing;

  if new.email is not null then
    insert into public.student_approvals (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do update set email = excluded.email;
  end if;

  return new;
end;
$$;

create or replace function public.sync_student_approval_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    insert into public.student_approvals (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do update set email = excluded.email;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_synced on auth.users;
create trigger on_auth_user_email_synced
after update of email on auth.users
for each row execute function public.sync_student_approval_email();

create or replace function public.set_student_approval_reviewed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at = case
      when new.status in ('approved', 'rejected') then now()
      else null
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists student_approvals_set_reviewed_at on public.student_approvals;
create trigger student_approvals_set_reviewed_at
before update of status on public.student_approvals
for each row execute function public.set_student_approval_reviewed_at();

create or replace function public.is_verified_student(candidate_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.student_approvals a on a.user_id = p.id
    where p.id = candidate_id
      and p.is_verified
      and a.status = 'approved'
  );
$$;

alter table public.student_approvals enable row level security;
revoke all on public.student_approvals from anon, authenticated;
grant select on public.student_approvals to authenticated;
grant select, update on public.student_approvals to service_role;

create policy student_approvals_read_own
on public.student_approvals
for select to authenticated
using (user_id = (select auth.uid()));


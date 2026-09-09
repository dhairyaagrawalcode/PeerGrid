create table public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.social_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index saved_posts_user_recent_idx on public.saved_posts(user_id, created_at desc);

alter table public.saved_posts enable row level security;
revoke all on public.saved_posts from anon, authenticated;
grant select, insert, delete on public.saved_posts to authenticated;

create policy saved_posts_read_own
on public.saved_posts
for select to authenticated
using (
  public.is_verified_student()
  and user_id = (select auth.uid())
);

create policy saved_posts_create_own
on public.saved_posts
for insert to authenticated
with check (
  public.is_verified_student()
  and user_id = (select auth.uid())
  and exists (
    select 1
    from public.social_posts post
    where post.id = post_id
      and post.moderation_status = 'published'
  )
);

create policy saved_posts_delete_own
on public.saved_posts
for delete to authenticated
using (
  public.is_verified_student()
  and user_id = (select auth.uid())
);

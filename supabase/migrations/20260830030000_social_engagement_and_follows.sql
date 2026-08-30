create table public.post_likes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create index post_likes_user_idx on public.post_likes(user_id, created_at desc);
create index post_comments_post_idx on public.post_comments(post_id, created_at asc);
create index post_comments_author_idx on public.post_comments(author_id, created_at desc);
create index follows_following_idx on public.follows(following_id, created_at desc);
create index follows_follower_idx on public.follows(follower_id, created_at desc);

-- Preserve previously accepted two-way connections as mutual follows.
insert into public.follows (follower_id, following_id, created_at)
select requester_id, recipient_id, coalesce(responded_at, created_at)
from public.connection_requests
where status = 'accepted'
on conflict (follower_id, following_id) do nothing;

insert into public.follows (follower_id, following_id, created_at)
select recipient_id, requester_id, coalesce(responded_at, created_at)
from public.connection_requests
where status = 'accepted'
on conflict (follower_id, following_id) do nothing;

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.follows enable row level security;

revoke all on public.post_likes, public.post_comments, public.follows from anon, authenticated;
grant select, insert, delete on public.post_likes, public.post_comments, public.follows to authenticated;

create policy post_likes_read
on public.post_likes
for select to authenticated
using (public.is_verified_student());

create policy post_likes_create_own
on public.post_likes
for insert to authenticated
with check (
  public.is_verified_student()
  and user_id = (select auth.uid())
  and exists (select 1 from public.social_posts p where p.id = post_id)
);

create policy post_likes_delete_own
on public.post_likes
for delete to authenticated
using (public.is_verified_student() and user_id = (select auth.uid()));

create policy post_comments_read
on public.post_comments
for select to authenticated
using (public.is_verified_student());

create policy post_comments_create_own
on public.post_comments
for insert to authenticated
with check (
  public.is_verified_student()
  and author_id = (select auth.uid())
  and exists (select 1 from public.social_posts p where p.id = post_id)
);

create policy post_comments_delete_own
on public.post_comments
for delete to authenticated
using (public.is_verified_student() and author_id = (select auth.uid()));

create policy follows_read
on public.follows
for select to authenticated
using (public.is_verified_student());

create policy follows_create_own
on public.follows
for insert to authenticated
with check (
  public.is_verified_student()
  and follower_id = (select auth.uid())
  and follower_id <> following_id
  and public.is_verified_student(following_id)
);

create policy follows_delete_own
on public.follows
for delete to authenticated
using (public.is_verified_student() and follower_id = (select auth.uid()));

create or replace function public.get_post_engagement(candidate_post_ids uuid[])
returns table (
  post_id uuid,
  like_count bigint,
  comment_count bigint,
  viewer_liked boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    (select count(*) from public.post_likes l where l.post_id = p.id),
    (select count(*) from public.post_comments c where c.post_id = p.id),
    exists (
      select 1
      from public.post_likes l
      where l.post_id = p.id and l.user_id = auth.uid()
    )
  from public.social_posts p
  where p.id = any(candidate_post_ids)
    and public.is_verified_student();
$$;

create or replace function public.get_follow_summary(candidate_user_id uuid)
returns table (
  follower_count bigint,
  following_count bigint,
  viewer_follows boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.follows f where f.following_id = candidate_user_id),
    (select count(*) from public.follows f where f.follower_id = candidate_user_id),
    exists (
      select 1
      from public.follows f
      where f.follower_id = auth.uid() and f.following_id = candidate_user_id
    )
  where public.is_verified_student()
    and public.is_verified_student(candidate_user_id);
$$;

revoke all on function public.get_post_engagement(uuid[]) from public, anon;
revoke all on function public.get_follow_summary(uuid) from public, anon;
grant execute on function public.get_post_engagement(uuid[]) to authenticated;
grant execute on function public.get_follow_summary(uuid) to authenticated;

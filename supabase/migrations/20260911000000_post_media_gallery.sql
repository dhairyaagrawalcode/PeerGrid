-- Ordered media rows let one post contain a photo gallery while the existing
-- attachment columns remain as a backwards-compatible first item.
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  position smallint not null check (position between 0 and 9),
  path text not null unique,
  kind text not null check (kind in ('image', 'video', 'document')),
  name text not null check (char_length(name) between 1 and 255),
  mime text not null check (char_length(mime) between 1 and 120),
  size bigint not null check (size between 1 and 26214400),
  created_at timestamptz not null default now(),
  unique (post_id, position)
);

create index if not exists post_media_post_position_idx
  on public.post_media (post_id, position);

-- attachment_size was added after the original column-level insert grant.
-- Re-state the safe client columns so posts with attachments can be created.
grant insert (
  author_id, body, attachment_path, attachment_kind,
  attachment_name, attachment_mime, attachment_size
) on public.social_posts to authenticated;

insert into public.post_media (post_id, position, path, kind, name, mime, size)
select id, 0, attachment_path, attachment_kind, attachment_name, attachment_mime,
  coalesce(attachment_size, 1)
from public.social_posts
where attachment_path is not null
  and attachment_kind is not null
  and attachment_name is not null
  and attachment_mime is not null
on conflict (path) do nothing;

alter table public.post_media enable row level security;
revoke all on public.post_media from anon, authenticated;
grant select, insert, delete on public.post_media to authenticated;

create policy post_media_rows_read on public.post_media
for select to authenticated
using (
  public.is_verified_student()
  and exists (
    select 1 from public.social_posts post
    where post.id = post_id and post.moderation_status = 'published'
  )
);

create policy post_media_rows_insert_own on public.post_media
for insert to authenticated
with check (
  public.is_verified_student()
  and (storage.foldername(path))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.social_posts post
    where post.id = post_id and post.author_id = (select auth.uid())
  )
);

create policy post_media_rows_delete_own on public.post_media
for delete to authenticated
using (
  exists (
    select 1 from public.social_posts post
    where post.id = post_id and post.author_id = (select auth.uid())
  )
);

drop policy if exists post_media_read_verified on storage.objects;
create policy post_media_read_verified on storage.objects
for select to authenticated
using (
  bucket_id = 'post-media'
  and public.is_verified_student()
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.social_posts post where post.attachment_path = name)
    or exists (select 1 from public.post_media media where media.path = name)
  )
);

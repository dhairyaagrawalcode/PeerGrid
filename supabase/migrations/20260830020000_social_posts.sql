create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 5000),
  attachment_path text,
  attachment_kind text check (attachment_kind in ('image', 'video', 'document')),
  attachment_name text check (char_length(attachment_name) <= 255),
  attachment_mime text check (char_length(attachment_mime) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_post_has_content check (
    char_length(trim(body)) > 0 or attachment_path is not null
  ),
  constraint social_post_attachment_complete check (
    (attachment_path is null and attachment_kind is null and attachment_name is null and attachment_mime is null)
    or
    (attachment_path is not null and attachment_kind is not null and attachment_name is not null and attachment_mime is not null)
  )
);

create index social_posts_recent_idx on public.social_posts(created_at desc);
create index social_posts_author_idx on public.social_posts(author_id, created_at desc);

create trigger social_posts_set_updated_at
before update on public.social_posts
for each row execute function public.set_updated_at();

alter table public.social_posts enable row level security;
revoke all on public.social_posts from anon, authenticated;
grant select, insert, delete on public.social_posts to authenticated;

create policy social_posts_read
on public.social_posts
for select to authenticated
using (public.is_verified_student());

create policy social_posts_create
on public.social_posts
for insert to authenticated
with check (
  public.is_verified_student()
  and author_id = (select auth.uid())
  and (
    attachment_path is null
    or (storage.foldername(attachment_path))[1] = (select auth.uid())::text
  )
);

create policy social_posts_delete_own
on public.social_posts
for delete to authenticated
using (
  public.is_verified_student()
  and author_id = (select auth.uid())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy post_media_read_verified
on storage.objects
for select to authenticated
using (bucket_id = 'post-media' and public.is_verified_student());

create policy post_media_upload_own
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'post-media'
  and public.is_verified_student()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy post_media_delete_own
on storage.objects
for delete to authenticated
using (
  bucket_id = 'post-media'
  and owner_id = (select auth.uid())::text
);

-- Avatar uploads use upsert so replacing an existing image requires SELECT and
-- UPDATE access in addition to INSERT. Keep every operation scoped to the
-- authenticated user's UUID folder.

drop policy if exists avatar_read_own on storage.objects;
drop policy if exists avatar_upload_own on storage.objects;
drop policy if exists avatar_update_own on storage.objects;
drop policy if exists avatar_delete_own on storage.objects;

create policy avatar_read_own on storage.objects
for select to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatar_upload_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatar_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatar_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

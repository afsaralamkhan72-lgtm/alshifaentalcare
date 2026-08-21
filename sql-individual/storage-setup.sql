-- =====================================================================
-- STORAGE SETUP — run AFTER schema.sql
-- Creates the 'media' bucket used by the CMS image uploader.
-- =====================================================================

-- Public bucket: website visitors need to see treatment/gallery images.
-- 5MB limit is generous since images are compressed to WebP client-side
-- (usually 100–400KB) before they ever reach here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/webp','image/jpeg','image/png','image/gif']
)
on conflict (id) do nothing;

-- Anyone can VIEW images (needed for the public website)
create policy "public_read_media"
on storage.objects for select
using (bucket_id = 'media');

-- Only logged-in staff can UPLOAD
create policy "staff_upload_media"
on storage.objects for insert
with check (bucket_id = 'media' and public.is_staff());

-- Only logged-in staff can DELETE
create policy "staff_delete_media"
on storage.objects for delete
using (bucket_id = 'media' and public.is_staff());

-- Only logged-in staff can UPDATE
create policy "staff_update_media"
on storage.objects for update
using (bucket_id = 'media' and public.is_staff());

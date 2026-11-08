SET check_function_bodies = false;
SET search_path = public, extensions;
-- ===== PART D: STORAGE (sirf Supabase: buckets + policies) =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp','image/jpeg','image/png','image/gif']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-media', 'patient-media', false, 5242880, array['image/webp','image/jpeg','image/png']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('business-docs', 'business-docs', false) on conflict (id) do nothing;

drop policy if exists "public_read_media" on storage.objects;
create policy "public_read_media" on storage.objects for select to public
  using ((bucket_id = 'media'::text));
drop policy if exists "staff_delete_media" on storage.objects;
create policy "staff_delete_media" on storage.objects for delete to public
  using (((bucket_id = 'media'::text) AND public.is_staff()));
drop policy if exists "staff_delete_patient_media" on storage.objects;
create policy "staff_delete_patient_media" on storage.objects for delete to public
  using (((bucket_id = 'patient-media'::text) AND ( SELECT public.is_owner() AS is_owner)));
drop policy if exists "staff_insert_business_docs" on storage.objects;
create policy "staff_insert_business_docs" on storage.objects for insert to authenticated
  with check (((bucket_id = 'business-docs'::text) AND (public.is_owner() OR public.has_perm('inventory.manage'::text) OR public.has_perm('expenses.manage'::text))));
drop policy if exists "staff_insert_patient_media" on storage.objects;
create policy "staff_insert_patient_media" on storage.objects for insert to public
  with check (((bucket_id = 'patient-media'::text) AND (( SELECT public.has_perm('clinical.edit'::text) AS has_perm) OR ( SELECT public.has_perm('lab.manage'::text) AS has_perm) OR ( SELECT public.has_perm('patients.edit'::text) AS has_perm))));
drop policy if exists "staff_select_business_docs" on storage.objects;
create policy "staff_select_business_docs" on storage.objects for select to authenticated
  using (((bucket_id = 'business-docs'::text) AND (public.is_owner() OR public.has_perm('inventory.manage'::text) OR public.has_perm('expenses.manage'::text) OR public.has_perm('reports.view'::text))));
drop policy if exists "staff_select_patient_media" on storage.objects;
create policy "staff_select_patient_media" on storage.objects for select to public
  using (((bucket_id = 'patient-media'::text) AND (( SELECT public.has_perm('clinical.view'::text) AS has_perm) OR ( SELECT public.has_perm('lab.view'::text) AS has_perm) OR ((name ~~ '%/profile.webp'::text) AND ( SELECT public.has_perm('patients.view'::text) AS has_perm)))));
drop policy if exists "staff_update_media" on storage.objects;
create policy "staff_update_media" on storage.objects for update to public
  using (((bucket_id = 'media'::text) AND public.is_staff()));
drop policy if exists "staff_update_patient_profile_photo" on storage.objects;
create policy "staff_update_patient_profile_photo" on storage.objects for update to public
  using (((bucket_id = 'patient-media'::text) AND (name ~~ '%/profile.webp'::text) AND ( SELECT public.has_perm('patients.edit'::text) AS has_perm)));
drop policy if exists "staff_upload_media" on storage.objects;
create policy "staff_upload_media" on storage.objects for insert to public
  with check (((bucket_id = 'media'::text) AND public.is_staff()));


-- =====================================================================
-- PHASE 17 — Patient Photos (private, sirf staff dekh sakein)
-- Run AFTER SETUP-ALL.sql
--
-- Ye 'media' bucket se alag hai. Medical photos public nahi honi
-- chahiyen — is bucket ko sirf logged-in staff access kar sakta hai.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-media',
  'patient-media',
  false,
  5242880,
  array['image/webp','image/jpeg','image/png']
)
on conflict (id) do nothing;

drop policy if exists "staff_select_patient_media" on storage.objects;
create policy "staff_select_patient_media"
on storage.objects for select
using (bucket_id = 'patient-media' and public.is_staff());

drop policy if exists "staff_insert_patient_media" on storage.objects;
create policy "staff_insert_patient_media"
on storage.objects for insert
with check (bucket_id = 'patient-media' and public.is_staff());

drop policy if exists "staff_delete_patient_media" on storage.objects;
create policy "staff_delete_patient_media"
on storage.objects for delete
using (bucket_id = 'patient-media' and public.is_staff());

create table if not exists public.patient_photos (
  id           uuid primary key default uuid_generate_v4(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  storage_path text not null,
  caption      text,
  taken_on     date default current_date,
  created_by   uuid references public.staff_profiles(id),
  created_at   timestamptz default now()
);

create index if not exists idx_patient_photos_patient
  on public.patient_photos (patient_id, taken_on);

alter table public.patient_photos enable row level security;

drop policy if exists "staff_all_patient_photos" on public.patient_photos;
create policy "staff_all_patient_photos" on public.patient_photos
  for all using (public.is_staff()) with check (public.is_staff());

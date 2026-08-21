-- =====================================================================
-- PHASE 13 — Clinic ki tasveerein aur CEO ka taaruf
-- Run AFTER SETUP-ALL.sql
-- =====================================================================

-- Clinic ke andar/bahar ki tasveerein (reception, waiting area, setup...)
create table if not exists public.clinic_photos (
  id         uuid primary key default uuid_generate_v4(),
  image_url  text not null,
  caption    text,
  sort_order int default 0,
  is_active  boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_clinic_photos_order
  on public.clinic_photos (sort_order) where is_active = true;

alter table public.clinic_photos enable row level security;

drop policy if exists "public_read_clinic_photos" on public.clinic_photos;
create policy "public_read_clinic_photos" on public.clinic_photos
  for select using (true);

drop policy if exists "staff_write_clinic_photos" on public.clinic_photos;
create policy "staff_write_clinic_photos" on public.clinic_photos
  for all using (public.is_staff()) with check (public.is_staff());

-- CEO / owner ka taaruf, site_settings mein
insert into public.site_settings (key, value) values
('ceo_profile', '{
  "enabled": true,
  "name": "",
  "title": "Founder & CEO",
  "message": "",
  "image_url": ""
}')
on conflict (key) do nothing;

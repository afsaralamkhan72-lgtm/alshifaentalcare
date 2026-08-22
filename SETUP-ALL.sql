-- =====================================================================
-- AL SHIFA HEALTH CARE — COMPLETE DATABASE SETUP
-- Dr. Muhammad Khalid Mahmood | Numaish, Nizami Road, Karachi
--
-- YE AIK HI FILE HAI — pura content copy kar ke Supabase ke
-- SQL Editor mein paste karein aur RUN dabayein. Bas.
--
-- Dobara chalana bhi mehfooz hai: har cheez "if not exists" ke
-- sath hai, purana data zaya nahi hota.
--
-- Is ke baad sirf aik kaam baaqi rehta hai: admin-setup.sql
-- (pehla login account) — us ke steps us file mein likhe hain.
-- =====================================================================


-- =====================================================================
-- 1. CORE SCHEMA — 14 tables, security policies, MR-number triggers
-- (source: schema.sql)
-- =====================================================================

-- =====================================================================
-- AL SHIFA HEALTH CARE — Supabase (PostgreSQL) Schema
-- Dr. Muhammad Khalid Mahmood | Dental + Homeopathic Clinic System
-- Phase 1: Core Database Schema
-- =====================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;   -- fast fuzzy name search

-- =====================================================================
-- 1. STAFF PROFILES (linked to Supabase Auth users)
-- Role-based access: admin / doctor / receptionist
-- =====================================================================
create table if not exists public.staff_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('admin','doctor','receptionist')),
  phone       text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- Helper function: checks if current logged-in user is active staff
create or replace function public.is_staff()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid() and is_active = true
  );
$$;

-- Helper function: checks specific role
create or replace function public.has_role(required_role text)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid() and is_active = true and role = required_role
  );
$$;

-- =====================================================================
-- 2. PATIENTS  (No photo / No QR — space saving as required)
-- =====================================================================
create sequence if not exists patient_mr_seq start 1;

create table if not exists public.patients (
  id            uuid primary key default uuid_generate_v4(),
  mr_number     text unique,                     -- auto: AS-D-0001 / AS-H-0001
  full_name     text not null,
  phone         text not null,
  department    text not null check (department in ('dental','homeopathic')),
  age           int,
  gender        text check (gender in ('male','female','other')),
  address       text,
  notes         text,
  registered_by uuid references public.staff_profiles(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Fast search indexes (Name search + Phone search + Department filter)
create index if not exists idx_patients_name_trgm on public.patients using gin (full_name gin_trgm_ops);
create index if not exists idx_patients_phone     on public.patients (phone);
create index if not exists idx_patients_department on public.patients (department);

-- Auto-generate MR number based on department
create or replace function public.generate_mr_number()
returns trigger language plpgsql as $$
declare
  prefix text;
  next_val int;
begin
  prefix := case when new.department = 'dental' then 'AS-D-' else 'AS-H-' end;
  next_val := nextval('patient_mr_seq');
  new.mr_number := prefix || lpad(next_val::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_generate_mr_number on public.patients;
create trigger trg_generate_mr_number
before insert on public.patients
for each row execute function public.generate_mr_number();

-- =====================================================================
-- 3. INTERACTIVE DENTAL CHART (tooth-level records, dental patients only)
-- =====================================================================
create table if not exists public.dental_chart (
  id             uuid primary key default uuid_generate_v4(),
  patient_id     uuid not null references public.patients(id) on delete cascade,
  tooth_number   text not null,   -- FDI notation e.g. '11', '48'
  condition      text not null check (condition in
                  ('missing','caries','filling','rct','crown','bridge',
                   'implant','scaling','extraction','healthy','other')),
  notes          text,
  treatment_date date default current_date,
  recorded_by    uuid references public.staff_profiles(id),
  created_at     timestamptz default now()
);
create index if not exists idx_dental_chart_patient on public.dental_chart (patient_id);

-- =====================================================================
-- 4. PRESCRIPTIONS (bilingual English/Urdu, dental + homeopathic)
-- =====================================================================
create table if not exists public.prescriptions (
  id              uuid primary key default uuid_generate_v4(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  department      text not null check (department in ('dental','homeopathic')),
  items           jsonb not null default '[]',
  -- items example: [{"name_en":"Arnica","name_ur":"ارنیکا","potency":"30C","dosage":"3 drops","frequency":"3x daily","duration":"7 days"}]
  notes_en        text,
  notes_ur        text,
  prescribed_by   uuid references public.staff_profiles(id),
  prescribed_date date default current_date,
  created_at      timestamptz default now()
);
create index if not exists idx_prescriptions_patient on public.prescriptions (patient_id);

-- =====================================================================
-- 5. BILLING & ACCOUNTS
-- =====================================================================
create table if not exists public.transactions (
  id               uuid primary key default uuid_generate_v4(),
  patient_id       uuid references public.patients(id) on delete set null,
  type             text not null check (type in ('income','expense')),
  category         text,   -- consultation, treatment, medicine-sale, rent, salary, supplies...
  amount           numeric(12,2) not null check (amount >= 0),
  payment_method   text check (payment_method in ('cash','bank','easypaisa','jazzcash')),
  description      text,
  transaction_date date default current_date,
  recorded_by      uuid references public.staff_profiles(id),
  created_at       timestamptz default now()
);
create index if not exists idx_transactions_date on public.transactions (transaction_date);
create index if not exists idx_transactions_type on public.transactions (type);

-- =====================================================================
-- 6. INVENTORY & STOCK (dental materials + homeopathic medicines)
-- =====================================================================
create table if not exists public.inventory (
  id             uuid primary key default uuid_generate_v4(),
  item_name      text not null,
  category       text not null check (category in ('dental','homeopathic','general')),
  quantity       numeric(10,2) not null default 0,
  unit           text default 'pcs',
  reorder_level  numeric(10,2) default 5,   -- triggers low-stock alert
  expiry_date    date,
  supplier       text,
  last_updated   timestamptz default now(),
  created_at     timestamptz default now()
);
create index if not exists idx_inventory_category on public.inventory (category);

-- =====================================================================
-- 7. APPOINTMENTS (from public website booking page)
-- =====================================================================
create table if not exists public.appointments (
  id             uuid primary key default uuid_generate_v4(),
  patient_name   text not null,
  phone          text not null,
  department     text check (department in ('dental','homeopathic')),
  treatment_name text,
  preferred_date date,
  preferred_time text,
  status         text default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  source         text default 'website',
  created_at     timestamptz default now()
);
create index if not exists idx_appointments_status on public.appointments (status);

-- =====================================================================
-- 8. CMS TABLES — powers the "Edit Website" admin tab
-- =====================================================================

-- 8a. Generic key-value settings: emergency popup text, banners, timings,
--     contact numbers, WhatsApp number, hero text, etc.
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references public.staff_profiles(id),
  updated_at  timestamptz default now()
);

-- 8b. Services (Dental & Homeopathic treatment listings)
create table if not exists public.services (
  id                       uuid primary key default uuid_generate_v4(),
  department               text not null check (department in ('dental','homeopathic')),
  title                    text not null,
  short_description        text,
  image_url                text,          -- compressed image in Supabase Storage
  whatsapp_message_template text,         -- e.g. "...ke liye appointment book karwana chahta hoon"
  sort_order               int default 0,
  is_active                boolean default true,
  created_at               timestamptz default now()
);
create index if not exists idx_services_department on public.services (department);

-- 8c. Before & After Gallery
create table if not exists public.gallery (
  id               uuid primary key default uuid_generate_v4(),
  title            text,
  category         text check (category in ('dental','homeopathic')),
  before_image_url text,
  after_image_url  text,
  sort_order       int default 0,
  created_at       timestamptz default now()
);

-- 8d. Videos (YouTube links only — no heavy uploads)
create table if not exists public.videos (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  youtube_url text not null,
  category    text,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- 8e. Testimonials / Reviews
create table if not exists public.testimonials (
  id           uuid primary key default uuid_generate_v4(),
  patient_name text not null,
  review_text  text not null,
  rating       int check (rating between 1 and 5),
  is_approved  boolean default false,   -- admin approves before it goes live
  created_at   timestamptz default now()
);

-- 8f. Blog & Health Tips
create table if not exists public.blog_posts (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  slug            text unique not null,
  content         text not null,
  cover_image_url text,
  is_published    boolean default false,
  published_at    timestamptz,
  created_at      timestamptz default now()
);
create index if not exists idx_blog_slug on public.blog_posts (slug);

-- 8g. Doctors Panel
create table if not exists public.doctors (
  id            uuid primary key default uuid_generate_v4(),
  full_name     text not null,
  qualification text,
  bio           text,
  image_url     text,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

-- =====================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================================
alter table public.staff_profiles enable row level security;
alter table public.patients        enable row level security;
alter table public.dental_chart    enable row level security;
alter table public.prescriptions   enable row level security;
alter table public.transactions    enable row level security;
alter table public.inventory       enable row level security;
alter table public.appointments    enable row level security;
alter table public.site_settings   enable row level security;
alter table public.services        enable row level security;
alter table public.gallery         enable row level security;
alter table public.videos          enable row level security;
alter table public.testimonials    enable row level security;
alter table public.blog_posts      enable row level security;
alter table public.doctors         enable row level security;

-- Staff-only clinical/financial tables
drop policy if exists "staff_full_access_patients" on public.patients;
create policy "staff_full_access_patients" on public.patients
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff_full_access_dental_chart" on public.dental_chart;
create policy "staff_full_access_dental_chart" on public.dental_chart
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff_full_access_prescriptions" on public.prescriptions;
create policy "staff_full_access_prescriptions" on public.prescriptions
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff_full_access_transactions" on public.transactions;
create policy "staff_full_access_transactions" on public.transactions
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff_full_access_inventory" on public.inventory;
create policy "staff_full_access_inventory" on public.inventory
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff_view_own_profile" on public.staff_profiles;
create policy "staff_view_own_profile" on public.staff_profiles
  for select using (public.is_staff());
drop policy if exists "admin_manage_staff" on public.staff_profiles;
create policy "admin_manage_staff" on public.staff_profiles
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- Appointments: public can INSERT (booking form), only staff can view/manage
drop policy if exists "public_can_book_appointment" on public.appointments;
create policy "public_can_book_appointment" on public.appointments
  for insert with check (true);
drop policy if exists "staff_manage_appointments" on public.appointments;
create policy "staff_manage_appointments" on public.appointments
  for select using (public.is_staff());
drop policy if exists "staff_update_appointments" on public.appointments;
create policy "staff_update_appointments" on public.appointments
  for update using (public.is_staff());

-- Public website content: everyone can READ, only staff can WRITE
drop policy if exists "public_read_settings" on public.site_settings;
create policy "public_read_settings" on public.site_settings for select using (true);
drop policy if exists "staff_write_settings" on public.site_settings;
create policy "staff_write_settings" on public.site_settings for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public_read_services" on public.services;
create policy "public_read_services" on public.services for select using (is_active = true);
drop policy if exists "staff_write_services" on public.services;
create policy "staff_write_services" on public.services for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public_read_gallery" on public.gallery;
create policy "public_read_gallery" on public.gallery for select using (true);
drop policy if exists "staff_write_gallery" on public.gallery;
create policy "staff_write_gallery" on public.gallery for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public_read_videos" on public.videos;
create policy "public_read_videos" on public.videos for select using (true);
drop policy if exists "staff_write_videos" on public.videos;
create policy "staff_write_videos" on public.videos for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public_read_testimonials" on public.testimonials;
create policy "public_read_testimonials" on public.testimonials for select using (is_approved = true);
drop policy if exists "staff_write_testimonials" on public.testimonials;
create policy "staff_write_testimonials" on public.testimonials for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public_read_blog" on public.blog_posts;
create policy "public_read_blog" on public.blog_posts for select using (is_published = true);
drop policy if exists "staff_write_blog" on public.blog_posts;
create policy "staff_write_blog" on public.blog_posts for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public_read_doctors" on public.doctors;
create policy "public_read_doctors" on public.doctors for select using (true);
drop policy if exists "staff_write_doctors" on public.doctors;
create policy "staff_write_doctors" on public.doctors for all using (public.is_staff()) with check (public.is_staff());

-- =====================================================================
-- 10. SEED DATA — initial site_settings (Dr. Sahib inhe CMS se edit karenge)
-- =====================================================================
insert into public.site_settings (key, value) values
('clinic_info', '{
  "name": "Al Shifa Health Care",
  "doctor_name": "Dr. Muhammad Khalid Mahmood",
  "address": "Numaish, Nizami Road, Karachi",
  "phone": "0342-2078639",
  "whatsapp": "923422078639",
  "timings": "10:00 AM – 5:00 PM"
}'),
('emergency_popup', '{
  "enabled": true,
  "delay_seconds": 10,
  "title": "Emergency? Need Consultation?",
  "message": "Abhi WhatsApp par doctor se raabta karein",
  "button_text": "Chat on WhatsApp"
}'),
('hero_banner', '{
  "heading": "Al Shifa Health Care",
  "subheading": "Trusted Dental & Homeopathic Care in Karachi",
  "background_image": ""
}')
on conflict (key) do nothing;

-- =====================================================================
-- END OF PHASE 1 SCHEMA
-- =====================================================================


-- =====================================================================
-- 2. STORAGE — 'media' bucket for treatment/gallery/doctor images
-- (source: storage-setup.sql)
-- =====================================================================

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
drop policy if exists "public_read_media" on storage.objects;
create policy "public_read_media"
on storage.objects for select
using (bucket_id = 'media');

-- Only logged-in staff can UPLOAD
drop policy if exists "staff_upload_media" on storage.objects;
create policy "staff_upload_media"
on storage.objects for insert
with check (bucket_id = 'media' and public.is_staff());

-- Only logged-in staff can DELETE
drop policy if exists "staff_delete_media" on storage.objects;
create policy "staff_delete_media"
on storage.objects for delete
using (bucket_id = 'media' and public.is_staff());

-- Only logged-in staff can UPDATE
drop policy if exists "staff_update_media" on storage.objects;
create policy "staff_update_media"
on storage.objects for update
using (bucket_id = 'media' and public.is_staff());


-- =====================================================================
-- 3. SEED DATA — 8 dental + 4 homeopathic services, homepage stats
-- (source: seed-phase3.sql)
-- =====================================================================

-- Phase 3 — Optional seed data
-- Run this anytime in Supabase SQL Editor once your project is live.
-- Dr. Sahib can edit/replace all of this later from the CMS ("Edit Website" tab).

-- Trust stats shown on homepage
insert into public.site_settings (key, value) values
('trust_stats', '[
  {"value": "2", "label": "Specialties Under One Roof"},
  {"value": "Daily", "label": "10:00 AM – 5:00 PM"},
  {"value": "1-on-1", "label": "Consultation With Dr. Khalid"},
  {"value": "WhatsApp", "label": "Instant Appointment Booking"}
]')
on conflict (key) do update set value = excluded.value;

-- Sample Dental services (replace image_url later via CMS upload)
insert into public.services (department, title, short_description, sort_order)
select 'dental', 'Scaling & Polishing', 'Professional cleaning to remove plaque and tartar buildup.', 1
where not exists (select 1 from public.services where title = 'Scaling & Polishing');
insert into public.services (department, title, short_description, sort_order)
select 'dental', 'Root Canal Treatment (RCT)', 'Pain-free treatment to save an infected or damaged tooth.', 2
where not exists (select 1 from public.services where title = 'Root Canal Treatment (RCT)');
insert into public.services (department, title, short_description, sort_order)
select 'dental', 'Teeth Whitening', 'Safe, clinic-grade whitening for a brighter smile.', 3
where not exists (select 1 from public.services where title = 'Teeth Whitening');
insert into public.services (department, title, short_description, sort_order)
select 'dental', 'Dental Implants', 'Permanent replacement for missing teeth.', 4
where not exists (select 1 from public.services where title = 'Dental Implants');
insert into public.services (department, title, short_description, sort_order)
select 'dental', 'Crowns & Bridges', 'Restore damaged teeth with durable crowns or bridges.', 5
where not exists (select 1 from public.services where title = 'Crowns & Bridges');
insert into public.services (department, title, short_description, sort_order)
select 'dental', 'Extractions', 'Safe and painless tooth extraction procedures.', 6
where not exists (select 1 from public.services where title = 'Extractions');
insert into public.services (department, title, short_description, sort_order)
select 'dental', 'Orthodontics (Braces)', 'Straighten teeth and correct bite alignment.', 7
where not exists (select 1 from public.services where title = 'Orthodontics (Braces)');
insert into public.services (department, title, short_description, sort_order)
select 'dental', 'Dentures & Partial Plates', 'Complete or partial denture solutions for missing teeth.', 8
where not exists (select 1 from public.services where title = 'Dentures & Partial Plates');

-- Sample Homeopathic services
insert into public.services (department, title, short_description, sort_order)
select 'homeopathic', 'General Consultation', 'Personalized homeopathic consultation for common ailments.', 1
where not exists (select 1 from public.services where title = 'General Consultation');
insert into public.services (department, title, short_description, sort_order)
select 'homeopathic', 'Chronic Disease Management', 'Long-term, gentle treatment for chronic conditions.', 2
where not exists (select 1 from public.services where title = 'Chronic Disease Management');
insert into public.services (department, title, short_description, sort_order)
select 'homeopathic', 'Skin & Allergy Treatment', 'Natural remedies for skin conditions and allergies.', 3
where not exists (select 1 from public.services where title = 'Skin & Allergy Treatment');
insert into public.services (department, title, short_description, sort_order)
select 'homeopathic', 'Child Homeopathy', 'Safe, gentle remedies suited for children.', 4
where not exists (select 1 from public.services where title = 'Child Homeopathy');


-- =====================================================================
-- 4. TREATMENT PLANS — installments, visit notes, patient birthday
-- (source: phase2.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 2 — Treatment Plans & Installments (Orthodontics)
-- Run this AFTER schema.sql, storage-setup.sql, seed-phase3.sql
-- =====================================================================

-- Which doctor is handling this patient. Lets each doctor see "my patients".
alter table public.patients
  add column if not exists assigned_doctor uuid references public.staff_profiles(id);

create index if not exists idx_patients_doctor on public.patients (assigned_doctor);

-- ---------------------------------------------------------------------
-- TREATMENT PLANS
-- One row per long-running treatment (braces, RCT course, etc).
-- Orthodontics runs 18-30 months, so cost is split into monthly installments.
-- ---------------------------------------------------------------------
create table if not exists public.treatment_plans (
  id                uuid primary key default uuid_generate_v4(),
  patient_id        uuid not null references public.patients(id) on delete cascade,
  title             text not null,              -- "Orthodontics — Upper & Lower Braces"
  total_cost        numeric(12,2) not null check (total_cost >= 0),
  advance_paid      numeric(12,2) default 0 check (advance_paid >= 0),
  duration_months   int not null default 24 check (duration_months > 0),
  monthly_amount    numeric(12,2) not null check (monthly_amount >= 0),
  start_date        date default current_date,
  status            text default 'active' check (status in ('active','completed','cancelled')),
  notes             text,
  doctor_id         uuid references public.staff_profiles(id),
  created_at        timestamptz default now()
);

create index if not exists idx_plans_patient on public.treatment_plans (patient_id);
create index if not exists idx_plans_status  on public.treatment_plans (status);

-- ---------------------------------------------------------------------
-- INSTALLMENTS
-- One row per month of the plan. Generated when the plan is created.
-- Doctor/receptionist marks each one paid as the patient pays.
-- ---------------------------------------------------------------------
create table if not exists public.installments (
  id             uuid primary key default uuid_generate_v4(),
  plan_id        uuid not null references public.treatment_plans(id) on delete cascade,
  installment_no int not null,
  due_date       date not null,
  amount         numeric(12,2) not null check (amount >= 0),
  paid_amount    numeric(12,2) default 0 check (paid_amount >= 0),
  paid_date      date,
  payment_method text check (payment_method in ('cash','bank','easypaisa','jazzcash')),
  recorded_by    uuid references public.staff_profiles(id),
  created_at     timestamptz default now(),
  unique (plan_id, installment_no)
);

create index if not exists idx_inst_plan on public.installments (plan_id);
create index if not exists idx_inst_due  on public.installments (due_date);

-- ---------------------------------------------------------------------
-- VISIT NOTES
-- Every braces tightening / wire change / follow-up gets a row.
-- This is the "kitna kaam hua, kab hua" record.
-- ---------------------------------------------------------------------
create table if not exists public.visit_notes (
  id           uuid primary key default uuid_generate_v4(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  plan_id      uuid references public.treatment_plans(id) on delete set null,
  visit_date   date default current_date,
  procedure    text,                 -- "Wire change", "Tightening", "Bracket re-bond"
  notes        text,
  next_visit   date,                 -- follow-up reminder date
  doctor_id    uuid references public.staff_profiles(id),
  created_at   timestamptz default now()
);

create index if not exists idx_visits_patient on public.visit_notes (patient_id);
create index if not exists idx_visits_next    on public.visit_notes (next_visit);

-- ---------------------------------------------------------------------
-- SECURITY (same model as the rest of the app: staff-only)
-- ---------------------------------------------------------------------
alter table public.treatment_plans enable row level security;
alter table public.installments    enable row level security;
alter table public.visit_notes     enable row level security;

drop policy if exists "staff_all_plans" on public.treatment_plans;
create policy "staff_all_plans" on public.treatment_plans
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff_all_installments" on public.installments;
create policy "staff_all_installments" on public.installments
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff_all_visits" on public.visit_notes;
create policy "staff_all_visits" on public.visit_notes
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- PATIENT BIRTHDAY (optional)
-- Used by the Birthdays module to send greetings + offers.
-- ---------------------------------------------------------------------
alter table public.patients
  add column if not exists date_of_birth date;

-- Fast "whose birthday is this month/day" lookups
create index if not exists idx_patients_dob on public.patients (date_of_birth);

-- Birthday greeting template lives in site_settings so Dr. Sahib can edit
-- the wording and the offer from the admin panel without a developer.
insert into public.site_settings (key, value) values
('birthday_offer', '{
  "enabled": true,
  "message": "Aap ko salgirah bohat bohat mubarak ho! Al Shifa Health Care ki taraf se aap ke liye is maheene free dental check-up ka tohfa hai.",
  "offer_label": "Free Dental Check-up"
}')
on conflict (key) do nothing;


-- =====================================================================
-- 5. PATIENT HISTORY — 9-step clinical intake
-- (source: phase3.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 3 — Patient History (9-step clinical intake)
-- Run AFTER schema.sql, storage-setup.sql, seed-phase3.sql, phase2.sql
-- =====================================================================

-- One history record per patient. Each wizard step is stored as JSONB so
-- new fields can be added later without another migration.
create table if not exists public.patient_history (
  id                uuid primary key default uuid_generate_v4(),
  patient_id        uuid not null unique references public.patients(id) on delete cascade,

  demographics      jsonb default '{}'::jsonb,
  medical_history   jsonb default '{}'::jsonb,
  dental_history    jsonb default '{}'::jsonb,
  chief_complaint   jsonb default '{}'::jsonb,
  clinical_exam     jsonb default '{}'::jsonb,
  radiographs       jsonb default '{}'::jsonb,
  diagnosis_plan    jsonb default '{}'::jsonb,
  consent           jsonb default '{}'::jsonb,

  -- Highest step the doctor has completed (1-9). Lets the wizard resume.
  completed_step    int default 0,
  is_finalized      boolean default false,
  finalized_at      timestamptz,

  recorded_by       uuid references public.staff_profiles(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists idx_history_patient on public.patient_history (patient_id);

-- Keep updated_at fresh on every save
create or replace function public.touch_patient_history()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_patient_history on public.patient_history;
create trigger trg_touch_patient_history
  before update on public.patient_history
  for each row execute function public.touch_patient_history();

-- Security: staff only, same as the rest of the app
alter table public.patient_history enable row level security;

drop policy if exists "staff_all_history" on public.patient_history;
create policy "staff_all_history" on public.patient_history
  for all using (public.is_staff()) with check (public.is_staff());


-- =====================================================================
-- 6. RECYCLE BIN — soft delete for patients & appointments
-- (source: phase4.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 4 — Recycle Bin (soft delete)
-- Run AFTER phase3.sql
-- =====================================================================

-- Instead of really deleting a row we stamp deleted_at. The app hides
-- stamped rows everywhere, and the Recycle Bin can restore them.
alter table public.patients
  add column if not exists deleted_at timestamptz;

alter table public.appointments
  add column if not exists deleted_at timestamptz;

-- Partial indexes: only index live rows, so normal lists stay fast
create index if not exists idx_patients_live
  on public.patients (created_at) where deleted_at is null;

create index if not exists idx_appointments_live
  on public.appointments (preferred_date) where deleted_at is null;


-- =====================================================================
-- 7. LAB MODULE — labs + lab work orders
-- (source: phase5.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 5 — Lab Module (crown/bridge/denture work orders)
-- Run AFTER phase4.sql
-- =====================================================================

-- Labs the clinic works with. Saved once, reused on every case, so the
-- WhatsApp number doesn't have to be typed again and again.
create table if not exists public.labs (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  whatsapp   text,
  phone      text,
  address    text,
  notes      text,
  is_active  boolean default true,
  created_at timestamptz default now()
);

-- One row per lab work order
create table if not exists public.lab_cases (
  id              uuid primary key default uuid_generate_v4(),
  case_number     text unique,
  patient_id      uuid references public.patients(id) on delete set null,

  -- Lab can be a saved lab OR typed in fresh for a one-off
  lab_id          uuid references public.labs(id) on delete set null,
  lab_name        text not null,
  lab_whatsapp    text,

  work_type       text,            -- Crown / Bridge / Denture / Inlay...
  tooth_numbers   text[] default '{}',   -- FDI: 11, 12, 21...
  shade           text,            -- A1, A2, B1...
  material        text,            -- PFM, Zirconia, E-max, Acrylic...
  pontic_design   text,
  instructions    text,

  impression_date date default current_date,
  due_date        date,
  delivered_date  date,

  status          text default 'pending'
                  check (status in ('pending','sent','in_progress','received','fitted','remake')),

  cost            numeric(12,2) default 0,
  created_by      uuid references public.staff_profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  deleted_at      timestamptz
);

create index if not exists idx_lab_cases_status on public.lab_cases (status) where deleted_at is null;
create index if not exists idx_lab_cases_patient on public.lab_cases (patient_id);
create index if not exists idx_lab_cases_due on public.lab_cases (due_date) where deleted_at is null;

-- Auto case number: LAB-0001, LAB-0002 ...
create or replace function public.set_lab_case_number()
returns trigger as $$
declare
  next_num int;
begin
  if new.case_number is null then
    select coalesce(max(substring(case_number from 5)::int), 0) + 1
      into next_num
      from public.lab_cases
     where case_number ~ '^LAB-[0-9]+$';
    new.case_number := 'LAB-' || lpad(next_num::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lab_case_number on public.lab_cases;
create trigger trg_lab_case_number
  before insert on public.lab_cases
  for each row execute function public.set_lab_case_number();

-- Security: staff only
alter table public.labs enable row level security;
alter table public.lab_cases enable row level security;

drop policy if exists "staff_all_labs" on public.labs;
create policy "staff_all_labs" on public.labs
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff_all_lab_cases" on public.lab_cases;
create policy "staff_all_lab_cases" on public.lab_cases
  for all using (public.is_staff()) with check (public.is_staff());


-- =====================================================================
-- 8. RECALL SYSTEM — periodic recalls (scaling, check-up, ortho)
-- (source: phase6.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 6 — Recall System
-- Run AFTER phase5.sql
-- =====================================================================

-- A recall is a standing reminder: "scaling every 6 months".
-- One patient can have several (scaling, check-up, denture review).
create table if not exists public.recalls (
  id               uuid primary key default uuid_generate_v4(),
  patient_id       uuid not null references public.patients(id) on delete cascade,

  recall_type      text not null,              -- Scaling / Check-up / Denture Review...
  interval_months  int not null default 6 check (interval_months > 0),

  last_done        date,
  next_due         date not null,

  status           text default 'active' check (status in ('active','stopped')),
  notes            text,

  -- How many times we've messaged since it came due (stops nagging forever)
  reminders_sent   int default 0,
  last_reminded    date,

  created_by       uuid references public.staff_profiles(id),
  created_at       timestamptz default now()
);

create index if not exists idx_recalls_due on public.recalls (next_due) where status = 'active';
create index if not exists idx_recalls_patient on public.recalls (patient_id);

-- A patient shouldn't have the same recall type twice
create unique index if not exists idx_recalls_unique
  on public.recalls (patient_id, recall_type) where status = 'active';

alter table public.recalls enable row level security;

drop policy if exists "staff_all_recalls" on public.recalls;
create policy "staff_all_recalls" on public.recalls
  for all using (public.is_staff()) with check (public.is_staff());

-- Common recall types, editable later from CMS if needed
insert into public.site_settings (key, value) values
('recall_types', '[
  {"type": "Scaling & Polishing", "months": 6},
  {"type": "Routine Check-up", "months": 6},
  {"type": "Orthodontic Review", "months": 1},
  {"type": "Denture Review", "months": 12},
  {"type": "Post-RCT Review", "months": 6},
  {"type": "Implant Review", "months": 12}
]')
on conflict (key) do nothing;

-- =====================================================================
-- 9. PATIENT PORTAL, access codes
-- (source: phase7.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 7 — Patient Portal Access Codes
-- Run AFTER the main SETUP-ALL.sql
-- =====================================================================

-- Each patient gets a short, random, word-based code. The code IS the
-- key to their record, so it is generated randomly (not from the phone
-- number) and can be regenerated if it ever leaks.
alter table public.patients
  add column if not exists portal_code text unique;

create index if not exists idx_patients_portal_code
  on public.patients (portal_code) where portal_code is not null;

-- Simple, easy-to-read word list (no confusing look-alike words)
create or replace function public.generate_portal_code()
returns text as $$
declare
  words text[] := array[
    'chand','sitara','roshan','sabza','darya','pahar','baadal','shabnam',
    'gulab','chameli','motia','yasmin','kiran','saagar','noor','sahar',
    'aftab','mahtab','sadaf','moti','heera','sona','chandi','anmol'
  ];
  code text;
begin
  loop
    code := words[1 + floor(random() * array_length(words, 1))::int] || '-' ||
            words[1 + floor(random() * array_length(words, 1))::int] || '-' ||
            words[1 + floor(random() * array_length(words, 1))::int] || '-' ||
            lpad(floor(random() * 100)::text, 2, '0');

    -- Vanishingly unlikely, but make sure it is unique
    exit when not exists (select 1 from public.patients where portal_code = code);
  end loop;

  return code;
end;
$$ language plpgsql;

-- New patients get a code automatically
create or replace function public.set_portal_code()
returns trigger as $$
begin
  if new.portal_code is null then
    new.portal_code := public.generate_portal_code();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_portal_code on public.patients;
create trigger trg_set_portal_code
  before insert on public.patients
  for each row execute function public.set_portal_code();

-- Give existing patients a code too
update public.patients
   set portal_code = public.generate_portal_code()
 where portal_code is null;


-- =====================================================================
-- 10. DOCTOR-WISE EARNINGS, treating doctor on transactions
-- (source: phase8.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 8 — Treating Doctor on Transactions
-- Run AFTER phase7.sql
-- =====================================================================

-- `recorded_by` batata hai kis ne entry ki (aksar receptionist).
-- `doctor_id` batata hai kis doctor ne asal treatment kiya, taake
-- Reports mein har doctor ki earning aur cases alag dikhein.
alter table public.transactions
  add column if not exists doctor_id uuid references public.staff_profiles(id);

create index if not exists idx_transactions_doctor
  on public.transactions (doctor_id, transaction_date);

-- Treatment plans par bhi doctor pehle se hai, lekin index nahi tha
create index if not exists idx_plans_doctor
  on public.treatment_plans (doctor_id);

-- Purani income entries jin par doctor nahi laga, unhein us staff se
-- jor dein jis ne entry ki thi, agar wo doctor tha.
update public.transactions t
   set doctor_id = t.recorded_by
  from public.staff_profiles s
 where t.doctor_id is null
   and t.recorded_by = s.id
   and s.role = 'doctor'
   and t.type = 'income';

-- =====================================================================
-- 11. TREATING DOCTOR ka naam (manually likha hua)
-- (source: phase9.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 9 — Treating Doctor ka naam (manually likha hua)
-- Run AFTER SETUP-ALL.sql
-- =====================================================================

-- Clinic mein aksar aise doctors bhi treatment karte hain jin ka
-- staff account nahi hota. Isliye naam text ke tor par mehfooz hota hai,
-- aur agli baar suggestion mein aa jata hai.
alter table public.transactions
  add column if not exists treating_doctor text;

create index if not exists idx_transactions_treating_doctor
  on public.transactions (treating_doctor, transaction_date);

alter table public.treatment_plans
  add column if not exists treating_doctor text;

-- Pehle se likhe hue naam, taake suggestion list bharti rahe
create table if not exists public.treating_doctors (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  is_active  boolean default true,
  created_at timestamptz default now()
);

alter table public.treating_doctors enable row level security;

drop policy if exists "staff_all_treating_doctors" on public.treating_doctors;
create policy "staff_all_treating_doctors" on public.treating_doctors
  for all using (public.is_staff()) with check (public.is_staff());

-- Purani entries ka doctor naam staff_profiles se le lein
update public.transactions t
   set treating_doctor = s.full_name
  from public.staff_profiles s
 where t.treating_doctor is null
   and t.doctor_id = s.id;

-- Aur wahi naam suggestion list mein daal dein
insert into public.treating_doctors (name)
select distinct treating_doctor
  from public.transactions
 where treating_doctor is not null
on conflict (name) do nothing;

-- =====================================================================
-- 12. BILL KI TAFSEEL (treatment, rate, discount)
-- (source: phase10.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 10 — Bill ki tafseel (treatment, rate, discount)
-- Run AFTER SETUP-ALL.sql
-- =====================================================================

-- Ab tak sirf amount mehfooz hoti thi. Bill par ye batane ke liye ke
-- kaunsa treatment hua, uska rate kya tha aur kitna discount diya gaya,
-- ye columns chahiye.
alter table public.transactions
  add column if not exists treatment_name  text,
  add column if not exists rate            numeric(12,2),
  add column if not exists discount_amount numeric(12,2) default 0,
  add column if not exists discount_pct    numeric(5,2)  default 0;

create index if not exists idx_transactions_treatment
  on public.transactions (treatment_name);

-- =====================================================================
-- 13. BAQAYA RAQAM aur due date (har patient ke liye)
-- (source: phase11.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 11 — Baqaya raqam aur due date (har patient ke liye)
-- Run AFTER SETUP-ALL.sql
-- =====================================================================

-- Aksar patient poore paise aik baar mein nahi deta. Har treatment ke
-- sath ye mehfooz hota hai ke kitna baqaya hai aur kab tak dena hai.
alter table public.transactions
  add column if not exists balance_due numeric(12,2) default 0,
  add column if not exists due_date    date,
  add column if not exists settled_at  timestamptz;

-- Jo baqaya rehta hai us par due date se index, taake dues list tez chale
create index if not exists idx_transactions_due
  on public.transactions (due_date)
  where balance_due > 0;

-- Purani entries ka baqaya nikal lein (rate - discount - jitna mila)
update public.transactions
   set balance_due = greatest(0, coalesce(rate, 0) - coalesce(discount_amount, 0) - coalesce(amount, 0))
 where rate is not null
   and balance_due = 0
   and settled_at is null;

-- =====================================================================
-- 14. PATIENT KA APNA DOCTOR
-- (source: phase12.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 12 — Patient ka apna doctor
-- Run AFTER SETUP-ALL.sql
-- =====================================================================

-- Patient register karte waqt hi doctor apna naam likh deta hai.
-- Baad mein har payment par wahi naam pehle se bhara aata hai.
alter table public.patients
  add column if not exists primary_doctor text;

create index if not exists idx_patients_primary_doctor
  on public.patients (primary_doctor);

-- =====================================================================
-- 15. CLINIC PHOTOS aur CEO ka taaruf
-- (source: phase13.sql)
-- =====================================================================

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

-- =====================================================================
-- 16. HOME PAGE par kaunsa doctor dikhe
-- (source: phase14.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 14 — Home page par kaunsa doctor dikhe
-- Run AFTER SETUP-ALL.sql
-- =====================================================================

-- Har doctor ke liye faisla: home page par dikhana hai ya nahi.
-- Tarteeb pehle se sort_order se chalti hai (chhota number pehle).
alter table public.doctors
  add column if not exists show_on_home boolean default true;

create index if not exists idx_doctors_home
  on public.doctors (sort_order) where show_on_home = true;

-- =====================================================================
-- 17. SOCIAL LINKS aur chutti ka din
-- (source: phase15.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 15 — Social links aur chutti ka din
-- Run AFTER SETUP-ALL.sql
-- =====================================================================

insert into public.site_settings (key, value) values
('social_links', '{
  "facebook": "",
  "instagram": "",
  "tiktok": "",
  "youtube": "",
  "google_business": ""
}')
on conflict (key) do nothing;

-- =====================================================================
-- 18. BLOG ARTICLES (health tips, SEO)
-- (source: phase16.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 16 — Blog Articles (health tips, SEO ke liye)
-- Run AFTER SETUP-ALL.sql
--
-- Ye 6 articles website par turant nazar aayenge. Baad mein Edit
-- Website > Blog se inhein edit ya delete kiya ja sakta hai.
-- =====================================================================

insert into public.blog_posts (title, slug, content, is_published, published_at) values

('How Much Do Braces Cost in Karachi? A Simple Guide',
 'braces-cost-karachi-guide',
$$If you are considering braces for yourself or your child, cost is usually the first question. The honest answer is that it depends on the case, but here is what actually affects the price and what to expect.

What affects the cost

The type of braces matters most. Traditional metal braces are the most affordable option and work well for most cases. Ceramic braces cost more but blend in with your teeth. The complexity of your bite also matters. A simple crowding case costs less to correct than a case involving jaw alignment.

Treatment duration plays a role too. Most orthodontic treatment takes between 18 and 30 months. Longer treatment means more visits, more adjustments, and a higher overall cost.

Can you pay in instalments?

Yes. Most clinics, including ours, offer monthly payment plans for orthodontic treatment. Instead of paying the full amount upfront, you agree on a monthly amount and pay as treatment progresses. This makes braces accessible for families who cannot pay a large sum at once.

What is included in the cost?

A proper braces quote should include the initial consultation, the brackets and wires, monthly adjustment visits, and the retainer at the end of treatment. Ask your dentist to break this down clearly before starting, so there are no surprises later.

How to get an accurate quote

Every mouth is different, so online estimates are only a starting point. The only way to get an accurate number is an in-person examination and, usually, an X-ray. Book a consultation and ask for a written treatment plan with the total cost and monthly breakdown.

If you are in Karachi and considering braces, message us on WhatsApp to book a consultation. We will examine your teeth, explain what your case needs, and give you a clear cost breakdown with a monthly payment option if you need one.$$,
 true, now() - interval '20 days'),

('Is Root Canal Treatment Painful? What to Actually Expect',
 'is-root-canal-treatment-painful',
$$Root canal treatment has a reputation for being painful, but that reputation is mostly outdated. Modern root canal treatment, done properly, is usually no more uncomfortable than getting a filling.

Why the fear exists

The pain people associate with root canals actually comes from the problem the treatment fixes, not the treatment itself. An infected or badly decayed tooth causes intense pain before treatment. Root canal treatment removes that infection and relieves the pain, it does not cause it.

What happens during the procedure

The area is numbed with local anaesthesia, the same as for a filling. Once numb, the dentist removes the infected pulp from inside the tooth, cleans the canal, and seals it. Most patients feel pressure and vibration but not sharp pain. The procedure typically takes one to two visits depending on the tooth and how severe the infection is.

What about after the procedure?

Mild soreness for a day or two afterward is normal, similar to how a tooth feels after a deep filling. Over-the-counter pain relief is usually enough. Severe pain after the procedure is not typical and should be reported to your dentist.

Signs you might need a root canal

Persistent tooth pain, sensitivity to hot or cold that lingers, swelling or tenderness in the gums, and a tooth that has darkened are all signs worth getting checked. The earlier it is treated, the simpler and more comfortable the procedure tends to be.

When to see a dentist

Do not wait for the pain to become unbearable. An infected tooth can affect the surrounding bone and, in rare cases, spread infection further. If you are experiencing tooth pain, message us on WhatsApp and we will get you in for an examination.$$,
 true, now() - interval '14 days'),

('Teeth Whitening: Professional Treatment vs Home Kits',
 'teeth-whitening-professional-vs-home',
$$A brighter smile is one of the most requested treatments at any dental clinic, and patients often ask whether a home whitening kit is just as good as a professional treatment. Here is an honest comparison.

How professional whitening works

In-clinic whitening uses a higher concentration of whitening gel, applied under controlled conditions with the gums protected. Results are typically visible after a single session, and the shade change is more dramatic and even across all teeth.

How home kits work

Over-the-counter strips and gels use a much lower concentration for safety reasons, since there is no professional supervision. They can lighten teeth gradually over several weeks, but results are usually more modest and less even, especially on teeth with deeper staining.

Which one is right for you?

If you have an event coming up and want a noticeable difference quickly, professional whitening is the better choice. If you are looking for gradual maintenance between professional treatments, a home kit can work as a supplement, not a replacement.

A word of caution

Whitening does not work on crowns, veneers, or fillings, so if you have visible dental work at the front of your mouth, whitening may create an uneven shade between your natural teeth and the restoration. This is worth discussing with your dentist before starting.

Whitening also does not last forever. Coffee, tea, and smoking will gradually stain teeth again over months. A touch-up session once or twice a year keeps results looking fresh.

If you are considering whitening, message us on WhatsApp and we can assess whether your teeth are a good candidate and explain what result to realistically expect.$$,
 true, now() - interval '9 days'),

('Homeopathy for Chronic Conditions: How It Actually Works',
 'homeopathy-chronic-conditions-explained',
$$Many patients come to homeopathy after trying other treatments for a chronic condition without lasting relief. Understanding how homeopathic treatment approaches the body differently can help set realistic expectations.

The core idea

Homeopathy treats the whole person, not just an isolated symptom. Two patients with the same diagnosis, such as migraine or allergic rhinitis, may receive different remedies because homeopathic assessment considers your overall constitution, triggers, and how the condition shows up specifically in you.

What conditions is it commonly used for?

Homeopathic consultation is frequently sought for allergies, digestive issues, skin conditions, recurring colds and sinus problems, joint pain, and stress-related complaints. It is generally used as a gentle, long-term approach rather than for acute emergencies.

What to expect from a consultation

A homeopathic consultation typically takes longer than a standard medical visit. Expect to be asked about your general health, sleep, appetite, emotional state, and history, not just the specific complaint. This detailed picture is what allows the remedy to be matched to you individually.

How long before you see results?

This varies by condition and by person. Some patients notice improvement within a few weeks, while chronic conditions that have been present for years may take longer to respond. Your practitioner should give you a realistic timeline at your first visit and adjust the approach if the initial remedy is not working.

Is it safe alongside other medication?

Generally yes, but you should always tell your homeopathic practitioner about any medication you are already taking, and never stop a prescribed medication without discussing it with the doctor who prescribed it.

If you are dealing with a chronic condition and want to explore homeopathic treatment, message us on WhatsApp to book a consultation.$$,
 true, now() - interval '5 days'),

('When Should Your Child First Visit the Dentist?',
 'child-first-dental-visit-age',
$$Parents often assume dental visits should wait until all the baby teeth are in, or until a problem appears. Dentists actually recommend starting much earlier, and there is a good reason why.

The recommended age

Most dental associations recommend a child's first dental visit by their first birthday, or within six months of the first tooth appearing, whichever comes first. This may sound early, but the purpose of this visit is not treatment, it is prevention and habit-building.

What happens at an early visit?

The dentist checks that teeth and gums are developing normally, looks for early signs of decay, and talks to parents about brushing technique, diet, and habits like thumb-sucking or bottle use at night. It is a short, low-stress visit designed to get the child comfortable with the dental chair before any treatment is ever needed.

Why not just wait?

Baby teeth matter more than many parents realise. They hold space for adult teeth, help with speech development, and allow proper chewing and nutrition. Untreated decay in baby teeth can also affect the permanent teeth growing underneath them. Early visits catch small issues before they become painful, expensive problems.

Making visits stress-free

Children pick up on parental anxiety about the dentist, so try to talk about the visit in neutral or positive terms. Regular visits every six months, starting early, mean the child grows up seeing the dentist as routine rather than something to fear.

What about baby teeth cavities?

If a cavity is found in a baby tooth, it is usually still treated, since an infected baby tooth can cause pain and affect the permanent tooth beneath it. Your dentist will explain the specific approach based on the child's age and how many years remain before that tooth falls out naturally.

If your child has not had a dental check-up yet, message us on WhatsApp and we will make the first visit a comfortable one.$$,
 true, now() - interval '2 days'),

('How Often Should You Really Get Scaling and Polishing?',
 'how-often-scaling-and-polishing',
$$Scaling and polishing is one of the most common dental treatments, but there is a lot of confusion about how often it is actually needed, and whether it damages the teeth. Here is what the evidence and clinical experience actually show.

What scaling and polishing does

Scaling removes plaque and tartar (hardened plaque) that has built up along and below the gum line, in places a toothbrush cannot reach. Polishing smooths the tooth surface afterward, making it harder for new plaque to stick quickly. Together, they are the main defence against gum disease.

The general recommendation

For most people, scaling and polishing every six months is enough to keep tartar under control and catch early gum problems before they progress. People with a higher risk of gum disease, such as smokers, diabetics, or those with a history of gum problems, may benefit from more frequent visits, sometimes every three to four months.

Does it damage enamel or thin the teeth?

This is one of the most common myths about scaling. Properly done scaling removes tartar sitting on top of the enamel, it does not remove enamel itself. Teeth may feel more sensitive immediately afterward simply because tartar that was covering part of the tooth surface has been removed, exposing it to temperature again. This sensitivity is normal and settles within a few days.

Signs you may be overdue

Bleeding gums when brushing, visible yellow or brown deposits near the gum line, and persistent bad breath are all signs that tartar has built up and a scaling session is due.

What happens if it's skipped for years?

Tartar buildup left untreated is the leading cause of gum disease, which can eventually lead to bone loss and loose teeth. Regular scaling is one of the simplest, least invasive ways to protect your teeth long-term.

Due for a check-up? Message us on WhatsApp to book your scaling and polishing session.$$,
 true, now() - interval '1 days')

on conflict (slug) do nothing;

-- =====================================================================
-- 19. PATIENT PHOTOS (private, sirf staff dekh sakein)
-- (source: phase17.sql)
-- =====================================================================

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


-- =====================================================================
-- 20. 10 MORE BLOG ARTICLES (SEO)
-- (source: phase18.sql)
-- =====================================================================

-- =====================================================================
-- PHASE 18 — 10 More Blog Articles (SEO)
-- Run AFTER SETUP-ALL.sql (and phase16.sql if run separately)
-- =====================================================================

insert into public.blog_posts (title, slug, content, is_published, published_at) values

('Filling or Root Canal? How Dentists Decide',
 'filling-vs-root-canal-how-decided',
$$A common question patients ask after an X-ray is why one cavity gets a simple filling while another needs a full root canal. The answer comes down to how deep the decay has gone, not how big the cavity looks from outside.

The tooth's layers

A tooth has three layers: enamel on the outside, dentin underneath, and the pulp at the centre, which contains nerves and blood vessels. Decay that stays within enamel and dentin can usually be cleaned out and filled. Once decay reaches the pulp, filling alone will not solve the problem, because the nerve inside is now infected or dying.

Signs the pulp is involved

Persistent pain, especially pain that lingers well after eating something hot or cold, pain that wakes you up at night, or visible darkening of the tooth are all signs the pulp may be affected. A dentist confirms this with an X-ray and sometimes a cold test to check how the nerve responds.

Why filling alone would not work

If the pulp is infected and only a filling is placed, the infection continues underneath, often leading to an abscess, swelling, or worse pain later. A root canal removes that infected tissue, cleans the canal, and seals it so no bacteria remain, allowing the filling or crown placed afterward to actually last.

What if you catch it early?

This is exactly why regular check-ups matter. A cavity caught while it is still small and confined to enamel is a routine filling, quick and inexpensive. The same cavity left untreated for a year can progress to needing a root canal, simply because it had time to reach the pulp.

If you have a tooth that is sensitive or aching, message us on WhatsApp and we will examine it and tell you plainly which treatment it actually needs.$$,
 true, now() - interval '25 days'),

('Dental Implants vs Bridges vs Dentures: Which Is Right for You?',
 'implants-bridges-dentures-comparison',
$$Losing a tooth leaves you with three main replacement options, and each suits a different situation. Here is how they actually compare, beyond just the price tag.

Dental implants

An implant replaces the tooth root with a small titanium post placed in the jawbone, topped with a crown. It is the closest replacement to a natural tooth, functions independently without relying on neighbouring teeth, and can last decades with good care. The trade-off is a longer treatment timeline, since the bone needs time to heal around the implant, and it typically costs more upfront than the other options.

Bridges

A bridge fills the gap using the teeth on either side as support, with a false tooth suspended between two crowns. It is faster to complete than an implant and costs less initially. The downside is that it requires shaving down the two supporting teeth, which would otherwise be untouched, and those teeth now carry extra load.

Dentures

Dentures, whether replacing a few teeth (partial) or a full arch (complete), are the most affordable option and do not require surgery. They are removable, which some patients find convenient and others find inconvenient. They can also shift slightly with chewing, whereas implants and bridges are fixed in place.

How to choose

If you are missing a single tooth and want a long-term, independent solution, an implant is usually recommended if your bone health allows it. If cost or timeline is a concern but you still want a fixed solution, a bridge is a reasonable middle ground. If you are missing several teeth or want to avoid surgery altogether, dentures remain a practical, affordable choice.

The right option really depends on your bone density, budget, and how many teeth are missing. Message us on WhatsApp to book an examination and we will walk you through which option fits your case.$$,
 true, now() - interval '23 days'),

('Bad Breath That Will Not Go Away: Common Causes',
 'bad-breath-causes-and-treatment',
$$Occasional bad breath after garlic or coffee is normal. Bad breath that persists no matter how much you brush is usually a sign of something specific happening in your mouth or body, and it is worth identifying rather than just masking with mints.

The most common cause

By far the most frequent cause of persistent bad breath is bacteria buildup on the tongue and along the gum line, often related to gum disease. Bacteria break down food particles and release sulphur compounds, which is what produces the odour. This is why professional scaling often improves breath noticeably.

Dry mouth

Saliva naturally washes away bacteria and food particles. Reduced saliva flow, whether from dehydration, breathing through the mouth at night, or certain medications, allows odour-causing bacteria to build up faster. This is also why breath is usually worse first thing in the morning.

Untreated cavities and old fillings

A cavity creates a space where food and bacteria collect and cannot be cleaned by normal brushing. Old, cracked fillings do the same thing. Both act as a constant, low-level source of odour until treated.

When it is not really a dental issue

In some cases, persistent bad breath traces back to sinus infections, tonsil stones, acid reflux, or digestive issues rather than the mouth itself. If your dentist checks your teeth and gums and finds nothing that explains the smell, that is a reasonable point to also mention it to your physician.

What actually helps

Brushing twice daily, cleaning the tongue itself rather than just the teeth, staying hydrated, and getting scaling done regularly addresses the majority of cases. Mouthwash can mask odour temporarily but does not fix the underlying cause.

If bad breath has been bothering you for weeks, message us on WhatsApp and we will check for the dental causes first.$$,
 true, now() - interval '21 days'),

('Bleeding Gums: Gingivitis or Something More Serious?',
 'bleeding-gums-gingivitis-or-worse',
$$Seeing blood when you brush or floss is easy to dismiss, but it is one of the clearest early warning signs your gums are giving. Here is how to tell what stage the problem is at.

Gingivitis: the early, reversible stage

Gingivitis is inflammation of the gums caused by plaque buildup along the gum line. Symptoms include gums that are red, slightly swollen, and bleed easily when brushed. At this stage, the good news is that it is completely reversible with proper brushing, flossing, and a professional scaling session to remove built-up plaque and tartar.

Periodontitis: when it progresses

If gingivitis is left untreated, the inflammation can spread deeper, affecting the bone and ligaments that hold teeth in place. This is periodontitis, and unlike gingivitis, the bone loss it causes is not reversible, only manageable. Signs include gums pulling away from the teeth, persistent bad breath, loose teeth, and gum bleeding that continues even without brushing.

Why bleeding is not something to just "brush harder" through

A common mistake is avoiding the bleeding area or brushing more gently, which actually allows plaque to build up further in that spot and worsens the problem. Bleeding gums usually need more thorough, not less, cleaning, along with a professional scaling to remove what a toothbrush cannot reach.

Other causes worth ruling out

Occasionally, bleeding gums are linked to factors beyond plaque, including certain blood thinning medications, pregnancy hormonal changes, or underlying health conditions. If bleeding is severe, does not improve with better oral hygiene, or comes with other symptoms, it is worth a proper examination rather than assuming it is just gingivitis.

What to do now

If your gums bleed regularly, do not wait for it to become painful. Message us on WhatsApp to book a check-up and scaling session before early inflammation has a chance to progress.$$,
 true, now() - interval '19 days'),

('Caring for Your Mouth After a Tooth Extraction',
 'aftercare-after-tooth-extraction',
$$The days immediately after a tooth extraction matter more than most patients expect. Following the right aftercare prevents complications and speeds up healing considerably.

The first 24 hours

A blood clot needs to form and stay in the socket, this is what protects the bone underneath while it heals. Avoid rinsing, spitting forcefully, or using a straw during this window, since suction can dislodge the clot. Bite down gently on the gauze provided for the first hour or so to help the clot form.

Managing swelling and discomfort

Mild swelling and soreness for a day or two is completely normal. A cold compress on the outside of the cheek for the first 24 hours helps keep swelling down. After that, switching to warm compresses can help with any residual stiffness. Over-the-counter pain relief as advised by your dentist is usually enough.

Eating and drinking

Stick to soft, cool foods for the first day, things like yogurt, mashed potatoes, or a smoothie eaten with a spoon rather than a straw. Avoid hot foods, spicy foods, and hard or crunchy items until the area has had a few days to settle. Chewing on the opposite side of the mouth is a good habit until the socket has closed over.

Keeping the area clean without disturbing it

Gently rinsing with warm salt water starting the day after extraction helps keep the socket clean without disrupting the healing clot. Brush your other teeth normally, just avoid the extraction site directly for the first few days.

When to call your dentist

Some oozing and mild discomfort is expected. Severe pain that worsens after the second or third day, a bad taste or smell from the socket, or fever are signs worth getting checked, as they can indicate a dry socket or infection.

If you have had a recent extraction and something feels off, message us on WhatsApp and we will guide you or bring you in.$$,
 true, now() - interval '17 days'),

('Wisdom Teeth: When Do They Actually Need to Come Out?',
 'wisdom-teeth-when-to-remove',
$$Not every wisdom tooth needs to be removed. Whether yours does depends on how much space is available and whether the tooth is causing, or likely to cause, a problem.

Why wisdom teeth cause issues in the first place

Wisdom teeth are the last molars to erupt, usually in the late teens or early twenties, by which point the jaw often does not have enough remaining space. This can cause them to grow in at an angle, get partially stuck under the gum, or push against the neighbouring tooth.

Signs a wisdom tooth may need attention

Recurring pain or swelling at the back of the jaw, difficulty fully opening the mouth, food repeatedly getting trapped around the area, or visible crowding of nearby teeth are all reasons to have it evaluated. An X-ray shows the angle of the tooth and how much room is actually available.

When dentists recommend leaving them

If a wisdom tooth has fully erupted, sits in a normal upright position, and you can clean around it properly, there is often no need to remove it. Removal carries some downtime and minor surgical risk, so it is not something dentists recommend simply because a tooth is a wisdom tooth.

When removal is usually recommended

Impacted wisdom teeth (stuck partially or fully under the gum or bone), teeth causing repeated infections, or teeth damaging the tooth next to them are the situations where extraction is generally the better long-term choice, even if there is no pain at the moment.

What the procedure involves

Most wisdom tooth extractions are done under local anaesthesia in a normal dental chair. Some more deeply impacted cases may need referral for a slightly more involved surgical extraction. Recovery is typically a few days of swelling and soft food.

If your wisdom teeth are bothering you, or you are not sure whether yours need attention, message us on WhatsApp and we will take an X-ray and give you a clear answer.$$,
 true, now() - interval '15 days'),

('Homeopathy for Allergies and Seasonal Sneezing',
 'homeopathy-for-allergies-seasonal',
$$Seasonal allergies, sneezing fits, itchy eyes, and a constantly blocked or runny nose are among the most common reasons patients seek homeopathic treatment, especially when antihistamines only provide temporary relief.

How homeopathy approaches allergies differently

Rather than simply suppressing the sneezing or blocking histamine response the way conventional antihistamines do, homeopathic treatment aims to address the underlying sensitivity pattern of the individual. This is why the consultation involves detailed questions about when your symptoms are worse, what triggers them, and how your body reacts overall, not just a list of symptoms.

What a consultation typically covers

Expect questions about the timing of your allergies (certain seasons, specific environments, particular foods or dust), whether symptoms are worse indoors or outdoors, and any patterns you have noticed yourself. This detail is what allows the practitioner to select a remedy matched to your specific presentation rather than a generic one.

What results typically look like

Some patients notice a reduction in the frequency and intensity of allergic episodes within the first season of treatment, while more established, long-standing allergic patterns may take a longer course of treatment to see substantial change. Your practitioner should discuss a realistic timeline with you at the first visit.

Can it be used alongside antihistamines?

Many patients start homeopathic treatment while still using their regular antihistamines for acute relief, and gradually reduce dependence as the underlying pattern improves, always in discussion with the treating doctor. Never stop a prescribed medication abruptly without medical advice.

Is it suitable for children?

Yes, homeopathic treatment for allergies is commonly sought for children as well, and dosing and remedy selection is adjusted accordingly.

If seasonal allergies are affecting your daily life, message us on WhatsApp to book a homeopathic consultation.$$,
 true, now() - interval '13 days'),

('What to Expect from Homeopathic Treatment for Colds and Flu',
 'homeopathy-cold-flu-what-to-expect',
$$Recurring colds, flu that seems to hang around longer than it should, or a general pattern of catching every seasonal bug going around are common reasons patients turn to homeopathic consultation, often looking for something beyond just symptom management.

The homeopathic view of recurring illness

Rather than treating each cold in isolation, homeopathic assessment often looks at why the immune response seems weaker or slower to recover, considering factors like sleep, stress, diet, and your general constitution. The goal for recurring cases is not just relieving the current cold but addressing the underlying pattern that makes you catch them so often.

What the consultation involves

Expect to be asked about how your colds typically start, what symptoms are most prominent for you specifically (a lot of patients differ, some get more nasal symptoms, others more throat or chest), how quickly you usually recover, and your general health between episodes.

During an acute cold or flu

For an active cold or flu, remedies are typically selected based on your specific symptom pattern at that moment, since two people with the "same" cold often present quite differently under homeopathic assessment. This is different from a one-size-fits-all cold remedy.

Realistic expectations

Homeopathic treatment for an acute cold is generally aimed at supporting recovery and comfort, not necessarily shortening the illness dramatically overnight. For patients with a pattern of frequent colds, the more meaningful benefit tends to show over a longer course of constitutional treatment, reducing how often and how severely illnesses recur.

When to seek other care instead

High fever that does not respond, difficulty breathing, or symptoms lasting far longer than a typical cold should always be evaluated by a physician, since these can indicate a more serious infection requiring different treatment.

If you catch colds frequently or want to explore homeopathic support this season, message us on WhatsApp to book a consultation.$$,
 true, now() - interval '11 days'),

('Foods That Help and Harm Your Teeth',
 'foods-that-help-and-harm-teeth',
$$What you eat affects your teeth just as much as how you brush. Some foods actively protect enamel, while others quietly work against it, even ones that seem harmless.

Foods that help

Dairy products like milk, cheese, and yogurt are rich in calcium and phosphates, which help remineralise enamel and neutralise acid in the mouth. Crunchy vegetables and fruits like carrots and apples stimulate saliva production, which is the mouth's natural defence against bacteria and acid. Nuts and leafy greens also support overall oral health through their mineral content.

Foods that harm, obviously

Sugary snacks, sweets, and sodas feed the bacteria that produce the acid responsible for cavities. This part is well known. What surprises most patients is how much frequency matters more than quantity, sipping a sugary drink slowly over an hour exposes teeth to acid for far longer than drinking it quickly with a meal.

Foods that harm, less obviously

Dried fruit is often assumed to be a healthy snack, but its sticky texture means it clings to teeth and grooves far longer than fresh fruit. Citrus fruits and juices are healthy in many ways but their acidity can soften enamel temporarily, brushing immediately after citrus can actually cause more wear, it is better to rinse with water and wait around thirty minutes before brushing. Starchy snacks like chips break down into sugars in the mouth and get trapped between teeth easily.

The timing trick that matters more than most people realise

Eating sugary or acidic foods as part of a meal, rather than as a standalone snack throughout the day, reduces the total time your teeth spend under acid attack, since saliva flow during meals helps buffer the effect. Constant grazing throughout the day is harder on teeth than the same amount of food eaten at set meal times.

Simple habit to adopt

Finishing a meal with a piece of cheese or a glass of water helps neutralise acid and rinse away food particles until you can brush properly.

For a personalised look at how your diet may be affecting your teeth, message us on WhatsApp to book a check-up.$$,
 true, now() - interval '9 days'),

('Dental Emergencies: What Counts as One and What to Do Right Away',
 'dental-emergency-what-to-do',
$$Not every dental problem needs an emergency visit, but some genuinely do, and knowing the difference can save a tooth. Here is a practical guide for the moment something goes wrong.

Situations that are true dental emergencies

A knocked-out tooth, severe swelling that is spreading toward the eye or neck, uncontrolled bleeding, a broken jaw, or severe pain accompanied by fever all need urgent attention, often the same day. These situations can affect more than just the tooth if left untreated.

A knocked-out tooth: what to do in the first minutes

Time matters enormously here. Pick the tooth up by the crown, not the root, and if possible, rinse it gently without scrubbing and try to place it back in its socket. If that is not possible, keep it in a container of milk or your own saliva, not water, and get to a dentist within thirty minutes if at all possible. The chances of successfully re-implanting a tooth drop sharply after the first hour.

A cracked or chipped tooth

Rinse your mouth with warm water and, if there is any bleeding, apply gentle pressure with gauze. Save any broken piece if you can find it. This is urgent but usually not the same level of emergency as a knocked-out tooth, though it should still be seen within a day or two to prevent further damage or infection.

Severe toothache with swelling

This often indicates an active infection or abscess. Do not wait for it to resolve on its own, and do not simply take painkillers indefinitely without treatment, as an untreated dental infection can spread. This needs to be seen promptly.

Something stuck between teeth

This is uncomfortable but rarely a true emergency. Try gentle flossing, and if it will not come out, avoid using sharp objects to dig at it and see your dentist at the next available slot instead.

When in doubt

If you are unsure whether your situation is urgent, message us on WhatsApp with what happened and we will tell you whether you need to come in immediately or can be seen at a normal appointment.$$,
 true, now() - interval '7 days')

on conflict (slug) do nothing;


-- =====================================================================
-- HO GAYA
--
-- Ab Supabase Dashboard mein jayein:
--   Authentication -> Users -> Add user
--   (email + password, "Auto Confirm User" tick karein)
-- Phir us user ka UID copy kar ke admin-setup.sql chalayein.
-- =====================================================================

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
-- HO GAYA
--
-- Ab Supabase Dashboard mein jayein:
--   Authentication -> Users -> Add user
--   (email + password, "Auto Confirm User" tick karein)
-- Phir us user ka UID copy kar ke admin-setup.sql chalayein.
-- =====================================================================

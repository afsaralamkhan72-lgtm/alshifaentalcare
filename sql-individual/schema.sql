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
create table public.staff_profiles (
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

create table public.patients (
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
create index idx_patients_name_trgm on public.patients using gin (full_name gin_trgm_ops);
create index idx_patients_phone     on public.patients (phone);
create index idx_patients_department on public.patients (department);

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

create trigger trg_generate_mr_number
before insert on public.patients
for each row execute function public.generate_mr_number();

-- =====================================================================
-- 3. INTERACTIVE DENTAL CHART (tooth-level records, dental patients only)
-- =====================================================================
create table public.dental_chart (
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
create index idx_dental_chart_patient on public.dental_chart (patient_id);

-- =====================================================================
-- 4. PRESCRIPTIONS (bilingual English/Urdu, dental + homeopathic)
-- =====================================================================
create table public.prescriptions (
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
create index idx_prescriptions_patient on public.prescriptions (patient_id);

-- =====================================================================
-- 5. BILLING & ACCOUNTS
-- =====================================================================
create table public.transactions (
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
create index idx_transactions_date on public.transactions (transaction_date);
create index idx_transactions_type on public.transactions (type);

-- =====================================================================
-- 6. INVENTORY & STOCK (dental materials + homeopathic medicines)
-- =====================================================================
create table public.inventory (
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
create index idx_inventory_category on public.inventory (category);

-- =====================================================================
-- 7. APPOINTMENTS (from public website booking page)
-- =====================================================================
create table public.appointments (
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
create index idx_appointments_status on public.appointments (status);

-- =====================================================================
-- 8. CMS TABLES — powers the "Edit Website" admin tab
-- =====================================================================

-- 8a. Generic key-value settings: emergency popup text, banners, timings,
--     contact numbers, WhatsApp number, hero text, etc.
create table public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references public.staff_profiles(id),
  updated_at  timestamptz default now()
);

-- 8b. Services (Dental & Homeopathic treatment listings)
create table public.services (
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
create index idx_services_department on public.services (department);

-- 8c. Before & After Gallery
create table public.gallery (
  id               uuid primary key default uuid_generate_v4(),
  title            text,
  category         text check (category in ('dental','homeopathic')),
  before_image_url text,
  after_image_url  text,
  sort_order       int default 0,
  created_at       timestamptz default now()
);

-- 8d. Videos (YouTube links only — no heavy uploads)
create table public.videos (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  youtube_url text not null,
  category    text,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- 8e. Testimonials / Reviews
create table public.testimonials (
  id           uuid primary key default uuid_generate_v4(),
  patient_name text not null,
  review_text  text not null,
  rating       int check (rating between 1 and 5),
  is_approved  boolean default false,   -- admin approves before it goes live
  created_at   timestamptz default now()
);

-- 8f. Blog & Health Tips
create table public.blog_posts (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  slug            text unique not null,
  content         text not null,
  cover_image_url text,
  is_published    boolean default false,
  published_at    timestamptz,
  created_at      timestamptz default now()
);
create index idx_blog_slug on public.blog_posts (slug);

-- 8g. Doctors Panel
create table public.doctors (
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
create policy "staff_full_access_patients" on public.patients
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff_full_access_dental_chart" on public.dental_chart
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff_full_access_prescriptions" on public.prescriptions
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff_full_access_transactions" on public.transactions
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff_full_access_inventory" on public.inventory
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff_view_own_profile" on public.staff_profiles
  for select using (public.is_staff());
create policy "admin_manage_staff" on public.staff_profiles
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- Appointments: public can INSERT (booking form), only staff can view/manage
create policy "public_can_book_appointment" on public.appointments
  for insert with check (true);
create policy "staff_manage_appointments" on public.appointments
  for select using (public.is_staff());
create policy "staff_update_appointments" on public.appointments
  for update using (public.is_staff());

-- Public website content: everyone can READ, only staff can WRITE
create policy "public_read_settings" on public.site_settings for select using (true);
create policy "staff_write_settings" on public.site_settings for all using (public.is_staff()) with check (public.is_staff());

create policy "public_read_services" on public.services for select using (is_active = true);
create policy "staff_write_services" on public.services for all using (public.is_staff()) with check (public.is_staff());

create policy "public_read_gallery" on public.gallery for select using (true);
create policy "staff_write_gallery" on public.gallery for all using (public.is_staff()) with check (public.is_staff());

create policy "public_read_videos" on public.videos for select using (true);
create policy "staff_write_videos" on public.videos for all using (public.is_staff()) with check (public.is_staff());

create policy "public_read_testimonials" on public.testimonials for select using (is_approved = true);
create policy "staff_write_testimonials" on public.testimonials for all using (public.is_staff()) with check (public.is_staff());

create policy "public_read_blog" on public.blog_posts for select using (is_published = true);
create policy "staff_write_blog" on public.blog_posts for all using (public.is_staff()) with check (public.is_staff());

create policy "public_read_doctors" on public.doctors for select using (true);
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
}');

-- =====================================================================
-- END OF PHASE 1 SCHEMA
-- =====================================================================

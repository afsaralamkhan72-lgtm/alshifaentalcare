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

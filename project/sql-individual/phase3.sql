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

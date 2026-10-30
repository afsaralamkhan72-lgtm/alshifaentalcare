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

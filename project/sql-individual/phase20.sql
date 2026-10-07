-- =====================================================================
-- PHASE 20 — Treatment Episodes (mukammal hone par summary + safai)
-- Run AFTER SETUP-ALL.sql
--
-- Soch: text records chhote hote hain aur clinically zaroori, isliye
-- wo rehte hain. Jagah photos khate hain, isliye treatment band hone
-- ke kuch din baad SIRF photos hatti hain, summary hamesha rehti hai.
-- =====================================================================

create table if not exists public.treatment_episodes (
  id             uuid primary key default uuid_generate_v4(),
  patient_id     uuid not null references public.patients(id) on delete cascade,

  title          text not null,             -- "RCT left 6", "Braces"
  tooth_numbers  text[] default '{}',
  doctor_name    text,

  started_on     date,
  completed_on   date default current_date,
  visit_count    int default 0,

  total_charged  numeric(12,2) default 0,
  total_paid     numeric(12,2) default 0,
  balance_left   numeric(12,2) default 0,

  -- Chhota sa khulasa jo hamesha rahega
  summary        text,

  -- Photos kab saaf hui (null = abhi maujood hain)
  photos_cleared_at timestamptz,

  created_by     uuid references public.staff_profiles(id),
  created_at     timestamptz default now()
);

create index if not exists idx_episodes_patient
  on public.treatment_episodes (patient_id, completed_on desc);

create index if not exists idx_episodes_cleanup
  on public.treatment_episodes (completed_on)
  where photos_cleared_at is null;

alter table public.treatment_episodes enable row level security;

drop policy if exists "staff_all_episodes" on public.treatment_episodes;
create policy "staff_all_episodes" on public.treatment_episodes
  for all using (public.is_staff()) with check (public.is_staff());

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

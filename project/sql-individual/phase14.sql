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

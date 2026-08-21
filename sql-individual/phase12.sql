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

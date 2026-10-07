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

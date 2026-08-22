-- =====================================================================
-- PHASE 19 — Patient Profile Picture (aik hi, treatment photos se alag)
-- Run AFTER SETUP-ALL.sql
--
-- Profile picture 'patient-media' bucket mein hi rehti hai (private,
-- sirf staff dekh sakta hai) lekin har naye upload par PURANI wali
-- OVERWRITE ho jati hai, isliye storage kabhi nahi barhta.
-- =====================================================================

alter table public.patients
  add column if not exists profile_photo_path text;

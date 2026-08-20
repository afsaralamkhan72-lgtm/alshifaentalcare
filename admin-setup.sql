-- =====================================================================
-- FIRST ADMIN ACCOUNT SETUP (run once, after schema.sql)
-- =====================================================================
-- Why manual: staff_profiles RLS only lets an existing admin create staff
-- rows — so the very first one must be inserted directly here, in the
-- SQL Editor (which runs with full privileges, bypassing RLS).

-- STEP 1: Create the auth user
--   Supabase Dashboard → Authentication → Users → "Add user"
--   Email:    dr.khalid@alshifa.com   (ya jo bhi aap chahein)
--   Password: (strong password set karein)
--   Copy the generated User UID — next step mein chahiye hoga.

-- STEP 2: Link that user to a staff_profiles row as admin
-- Replace 'PASTE-USER-UID-HERE' below, then run this in SQL Editor:

insert into public.staff_profiles (id, full_name, role, phone, is_active)
values (
  'PASTE-USER-UID-HERE',
  'Dr. Muhammad Khalid Mahmood',
  'admin',
  '03422078639',
  true
);

-- Ab is email/password se /login par login ho sakta hai.

-- =====================================================================
-- Adding more staff later (Doctor / Receptionist) — once an admin exists,
-- this can eventually be done from an "Add Staff" screen (future phase).
-- For now, same 2-step process: create auth user in Dashboard, then:
-- =====================================================================
-- insert into public.staff_profiles (id, full_name, role, phone)
-- values ('PASTE-USER-UID-HERE', 'Receptionist Name', 'receptionist', '03XX-XXXXXXX');

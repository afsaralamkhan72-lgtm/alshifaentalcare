-- =====================================================================
-- PHASE 15 — Social links aur chutti ka din
-- Run AFTER SETUP-ALL.sql
-- =====================================================================

insert into public.site_settings (key, value) values
('social_links', '{
  "facebook": "",
  "instagram": "",
  "tiktok": "",
  "youtube": "",
  "google_business": ""
}')
on conflict (key) do nothing;

-- Chutti ka din clinic_info mein rakha jayega (closed_day),
-- taake timings ke sath har jagah nazar aaye.

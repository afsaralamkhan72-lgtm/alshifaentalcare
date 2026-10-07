-- Phase 3 — Optional seed data
-- Run this anytime in Supabase SQL Editor once your project is live.
-- Dr. Sahib can edit/replace all of this later from the CMS ("Edit Website" tab).

-- Trust stats shown on homepage
insert into public.site_settings (key, value) values
('trust_stats', '[
  {"value": "2", "label": "Specialties Under One Roof"},
  {"value": "Daily", "label": "10:00 AM – 5:00 PM"},
  {"value": "1-on-1", "label": "Consultation With Dr. Khalid"},
  {"value": "WhatsApp", "label": "Instant Appointment Booking"}
]')
on conflict (key) do update set value = excluded.value;

-- Sample Dental services (replace image_url later via CMS upload)
insert into public.services (department, title, short_description, sort_order) values
('dental', 'Scaling & Polishing', 'Professional cleaning to remove plaque and tartar buildup.', 1),
('dental', 'Root Canal Treatment (RCT)', 'Pain-free treatment to save an infected or damaged tooth.', 2),
('dental', 'Teeth Whitening', 'Safe, clinic-grade whitening for a brighter smile.', 3),
('dental', 'Dental Implants', 'Permanent replacement for missing teeth.', 4),
('dental', 'Crowns & Bridges', 'Restore damaged teeth with durable crowns or bridges.', 5),
('dental', 'Extractions', 'Safe and painless tooth extraction procedures.', 6),
('dental', 'Orthodontics (Braces)', 'Straighten teeth and correct bite alignment.', 7),
('dental', 'Dentures & Partial Plates', 'Complete or partial denture solutions for missing teeth.', 8);

-- Sample Homeopathic services
insert into public.services (department, title, short_description, sort_order) values
('homeopathic', 'General Consultation', 'Personalized homeopathic consultation for common ailments.', 1),
('homeopathic', 'Chronic Disease Management', 'Long-term, gentle treatment for chronic conditions.', 2),
('homeopathic', 'Skin & Allergy Treatment', 'Natural remedies for skin conditions and allergies.', 3),
('homeopathic', 'Child Homeopathy', 'Safe, gentle remedies suited for children.', 4);

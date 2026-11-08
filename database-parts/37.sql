SET check_function_bodies = false;
SET search_path = public, extensions;
-- ===== PART C: SEED / CONFIGURATION (required defaults; edit later from the app) =====
insert into public.expense_categories (name, sort_order)
select v.n, v.o from (values ('Rent',10),('Salary',20),('Staff Advance',30),('Supplies',40),('Inventory',50),('Lab',60),('Utilities',70),('Maintenance',80),('Chai / Chhoti kharchi',90),('Other',100)) v(n,o)
where not exists (select 1 from public.expense_categories c where c.name = v.n);

insert into public.leave_types (name, paid, yearly_quota)
select v.n, v.p, null from (values ('Chhutti (tankhwah ke saath)', true), ('Chhutti (bagair tankhwah)', false)) v(n,p)
where not exists (select 1 from public.leave_types c where c.name = v.n);

insert into public.attendance_rules (id) values (1) on conflict (id) do nothing;
insert into public.invoice_counter (id, prefix, next_no) values (1, 'AS-INV-', 1001) on conflict (id) do nothing;
insert into public.loyalty_program (id) values (1) on conflict (id) do nothing;
insert into public.discount_limits (role, max_percent) values ('admin', 100), ('doctor', 100), ('receptionist', 0) on conflict (role) do nothing;

INSERT INTO public.message_templates VALUES ('msg_header', 'Har message ka shuru (salaam + darood + naam)', 'السلام علیکم ورحمۃ اللہ وبرکاتہ
ﷺ صَلَّى اللّٰهُ عَلَيْهِ وَسَلَّمَ ﷺ
🌹 اگر آپ نے آج درودِ پاک نہیں پڑھا تو چند لمحے نکال کر نبی کریم ﷺ کی بارگاہ میں درود و سلام کا نذرانہ پیش کیجیے۔
{adab}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('msg_footer', 'Har message ka aakhir (doctor, clinic, pata, phone)', '{doctor_name}
{clinic_name}
{address}
{phone}
آپ کی صحت، ہماری ذمہ داری 🌿', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('appt_confirm', 'Appointment confirm', '{header}
آپ کی اپائنٹمنٹ کنفرم ہو گئی ہے۔
📅 تاریخ: {date}
🕐 وقت: {time}
🦷 علاج: {treatment}
👨‍⚕️ ڈاکٹر: {doctor}
{footer}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('appt_reminder', 'Appointment yaad dehani', '{header}
آپ کی اپائنٹمنٹ کی یاد دہانی ہے۔
📅 تاریخ: {date}
🕐 وقت: {time}
🦷 علاج: {treatment}
👨‍⚕️ ڈاکٹر: {doctor}
اگر آپ نہ آ سکیں تو براہِ مہربانی ہمیں پہلے بتا دیں۔
{footer}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('appt_reschedule', 'Appointment nayi tareekh', '{header}
آپ کی اپائنٹمنٹ کی نئی تاریخ مقرر کر دی گئی ہے۔
📅 تاریخ: {date}
🕐 وقت: {time}
👨‍⚕️ ڈاکٹر: {doctor}
{footer}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('visit_thanks', 'Visit ke baad shukriya', '{header}
آج آپ نے ہمارے کلینک میں تشریف لا کر ہمیں عزت بخشی، شکریہ۔ اللہ تعالیٰ آپ کو جلد مکمل صحت عطا فرمائے، آمین۔
{footer}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('baqaya', 'Baqaya yaad dehani', '{header}
آپ کے حساب کی یاد دہانی:
💰 موجودہ بقایا: Rs. {balance}
براہِ مہربانی اگلی visit پر یا Easypaisa / JazzCash پر ادا کر دیں: {easypaisa}
{footer}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('missed', 'Appointment par nahi aaye', '{header}
آپ اپنی اپائنٹمنٹ پر تشریف نہیں لا سکے۔ نیا وقت لینے کے لیے براہِ مہربانی ہم سے رابطہ فرمائیں۔
{footer}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('followup', 'Follow-up', '{header}
آپ کا فالو اپ (دوبارہ معائنہ) واجب ہے۔
📅 تاریخ: {date}
🦷 علاج: {treatment}
براہِ مہربانی تشریف لے آئیں یا ہم سے وقت لے لیں۔
{footer}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('recall', 'Recall (Scaling / Check-up)', '{header}
آپ کے دانتوں کے معائنے / صفائی کا وقت ہو گیا ہے۔
🦷 {treatment}
نیا وقت لینے کے لیے براہِ مہربانی ہم سے رابطہ فرمائیں۔
{footer}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('lab_ready', 'Lab ka kaam tayyar', '{header}
آپ کا کام تیار ہو گیا ہے۔
🦷 {treatment}
فٹ کروانے کے لیے براہِ مہربانی تشریف لے آئیں۔
{footer}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('statement_backup', 'Purana Payment Statement (backup)', '{adab}
السلام علیکم
درود شریف
مریض: {name}
کل بقایا: Rs. {balance}
علاج کی تفصیل:
{treatments}
ادائیگی (Easypaisa / JazzCash): {easypaisa}
آن لائن دیکھیں: {link}
Access code: {code}
شکریہ
{clinic}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('statement', 'Payment Statement', '{header}
Payment Statement ({mr})
مریض: {name}
📋 اکاؤنٹ کی تفصیلات
پرانا بقایا: Rs. {old_balance}
آج کے کام کے کل چارجز: Rs. {today_charges}
آج موصول شدہ رقم: Rs. {today_received}
موجودہ بقایا: Rs. {balance}
{treatments_block}
━━━━━━━━━━━━━━
ادائیگی کا خلاصہ
کل چارجز: Rs. {total_charges}
کل موصول شدہ رقم: Rs. {total_received}
بقایا رقم: Rs. {balance}
━━━━━━━━━━━━━━
ادائیگی (Easypaisa / JazzCash): {easypaisa}
📱 اپنا ریکارڈ خود بھی دیکھیں
{link}
ذاتی ایکسس کوڈ:
{code}
🔒 یہ لنک اور کوڈ صرف آپ کے ذاتی استعمال کے لیے ہیں۔ کسی دوسرے کے ساتھ شیئر نہ کریں۔
{footer}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.message_templates VALUES ('receipt', 'Payment ki rasid', '{header}
آپ کی ادائیگی موصول ہو گئی ہے، شکریہ۔
✅ موصول شدہ رقم: Rs. {amount}
📅 تاریخ: {paid_date}
💳 طریقہ: {method}
پہلے کا بقایا: Rs. {old_balance}
موجودہ بقایا: Rs. {balance}
{settled_line}
📱 اپنا ریکارڈ دیکھیں:
{link}
ذاتی ایکسس کوڈ:
{code}
{footer}', '2026-11-03 21:22:17.819548+05') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('patients.view', 'Patients ki list aur profile dekhna', 'Patients', 10) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('patients.create', 'Naya patient register karna', 'Patients', 11) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('patients.edit', 'Patient ki details badalna', 'Patients', 12) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('appointments.view', 'Appointments dekhna', 'Appointments', 20) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('appointments.manage', 'Appointment banana / badalna / cancel', 'Appointments', 21) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('clinical.view', 'Dental chart, visit notes, history dekhna', 'Clinical', 30) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('clinical.edit', 'Dental chart / visit notes likhna', 'Clinical', 31) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('prescriptions.view', 'Prescriptions dekhna', 'Clinical', 32) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('prescriptions.write', 'Prescription likhna', 'Clinical', 33) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('lab.view', 'Lab cases dekhna', 'Lab', 40) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('lab.manage', 'Lab case banana / badalna', 'Lab', 41) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('billing.view', 'Bills aur payments dekhna', 'Paisa', 50) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('inventory.view', 'Stock dekhna', 'Inventory', 60) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('website.manage', 'Website ka content (blog, gallery, services…)', 'Website', 70) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('billing.create', 'Treatment ki qeemat / bill banana', 'Paisa', 51) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('billing.collect', 'Patient se paisa lena (payment)', 'Paisa', 52) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('billing.refund', 'Refund / bill cancel karna', 'Paisa', 53) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('expenses.manage', 'Kharche likhna / cancel karna', 'Paisa', 54) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('reports.view', 'Reports aur din ki closing dekhna', 'Paisa', 55) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('inventory.manage', 'Stock add / badalna', 'Inventory', 61) ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog VALUES ('settings.manage', 'Settings: dawaiyan aur qeematein', 'Setup', 80) ON CONFLICT DO NOTHING;

insert into public.site_settings (key, value) values
('app_notify_cfg', '{"due": false, "appt": true, "due_min": 1000, "enabled": false, "appt_days": 1, "due_every_days": 7}'::jsonb),
('birthday_offer', '{"enabled": true, "message": "Aap ko salgirah bohat bohat mubarak ho! Al Shifa Health Care ki taraf se aap ke liye is maheene free dental check-up ka tohfa hai.", "offer_label": "Free Dental Check-up"}'::jsonb),
('ceo_profile', '{"name": "", "title": "Founder & CEO", "enabled": true, "message": "", "image_url": ""}'::jsonb),
('clinic_info', '{"name": "Al Shifa Health Care", "phone": "0342-2078639", "address": "Numaish, Nizami Road, Karachi", "timings": "10:00 AM – 5:00 PM", "whatsapp": "923422078639", "doctor_name": "Dr. Muhammad Khalid Mahmood"}'::jsonb),
('emergency_popup', '{"title": "Emergency? Need Consultation?", "enabled": true, "message": "Abhi WhatsApp par doctor se raabta karein", "button_text": "Chat on WhatsApp", "delay_seconds": 10}'::jsonb),
('hero_banner', '{"heading": "Al Shifa Health Care", "subheading": "Trusted Dental & Homeopathic Care in Karachi", "background_image": ""}'::jsonb),
('print_defaults', '{"bill": "soft", "rx_homeo": "soft", "rx_dental": "soft"}'::jsonb),
('recall_types', '[{"type": "Scaling & Polishing", "months": 6}, {"type": "Routine Check-up", "months": 6}, {"type": "Orthodontic Review", "months": 1}, {"type": "Denture Review", "months": 12}, {"type": "Post-RCT Review", "months": 6}, {"type": "Implant Review", "months": 12}]'::jsonb),
('reminder_cfg', '{"med_days_before": 2}'::jsonb),
('scratch_cfg', '{"enabled": false, "valid_days": 30}'::jsonb),
('share_cfg', '{"days": 3, "require_last4": true}'::jsonb),
('social_links', '{"tiktok": "", "youtube": "", "facebook": "", "instagram": "", "google_business": ""}'::jsonb),
('trust_stats', '[{"label": "Specialties Under One Roof", "value": "2"}, {"label": "10:00 AM – 5:00 PM", "value": "Daily"}, {"label": "Consultation With Dr. Khalid", "value": "1-on-1"}, {"label": "Instant Appointment Booking", "value": "WhatsApp"}]'::jsonb),
('visit_show', '{"exam": false}'::jsonb)
on conflict (key) do nothing;


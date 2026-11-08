# Al Shifa Health Care: Clinic Management Software (FINAL release)

Dr. Muhammad Khalid Mahmood | Dental & Homeopathic Clinic | Numaish, Nizami Road, Karachi

Stack: Next.js 16 (App Router) + React 19 + Supabase (PostgreSQL, Auth, Storage) + Tailwind CSS. Phone app: Capacitor APK (`mobile/`).

---

## A. Naya project (khali Supabase se shuru)

1. **Supabase project**: supabase.com par New Project, region Singapore, strong database password.
2. **Database**: `FINAL-AL-SHIFA-DATABASE.sql` (zip ke bahar, alag file) chalayein.
   - File lambi hai, Supabase SQL Editor mein ek saath paste na karein. `database-parts/` folder mein usi file ke chhote tukde `01`, `02`, ... bane hue hain. Wohi tarteeb se ek ek karke chalayein, har ek ke baad "Success" aana chahiye.
   - Ya computer se: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f FINAL-AL-SHIFA-DATABASE.sql`
3. **Pehla admin**: Supabase > Authentication > Users > Add user (email + password, "Auto Confirm User" tick). Us ka User UID copy karein, `admin-setup.sql` mein `PASTE-USER-UID-HERE` ki jagah daal kar chalayein.
4. **Environment variables** (`.env.local` ya Vercel > Settings > Environment Variables). `.env.local.example` mein har ek ki wazahat hai:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (zaroori)
   - `SUPABASE_SERVICE_ROLE_KEY` (zaroori: patient portal aur staff portal ke liye; kabhi browser/GitHub mein na dalen)
   - `STAFF_PORTAL_SECRET` (optional lamba random text)
   - `NEXT_PUBLIC_SITE_URL` (aap ka domain)
   - `CRON_SECRET`, `FIREBASE_SERVICE_ACCOUNT` (sirf agar push notification chahiye; `FIREBASE-NOTIFICATION-SETUP.txt` dekhein)
5. **Local chalana**: `npm install`, phir `npm run dev`. Production build check: `npm run build`.
6. **Deploy (Vercel)**: GitHub repo ko Vercel se jodein, upar ke environment variables daalein, Deploy. `vercel.json` mein 2 roz ke cron hain (`/api/ping`, `/api/cron/reminders`).
7. **Phone APK**: `APK-KAISE-BANAYEIN.txt` dekhein.

## B. Maujooda project (FINAL55/56/57/58 pehle se chal raha hai)

**Poori `FINAL-AL-SHIFA-DATABASE.sql` live database par mat chalayein.** Wahan sirf naye chhote migrations chalayein, TEST project par pehle:

1. Pehle backup: Supabase > Database > Backups, aur app mein Settings se "Backup" JSON download.
2. SQL Editor mein is tarteeb se (har ek add-only hai, dobara chalane se kuch kharab nahi hota):
   `part1-discount-wording.sql`, `part2-reconcile.sql`, `part3-stock-check.sql`, `part4a-inventory-columns.sql`, `part4b-inventory-edit.sql`, `part4c-inventory-merge.sql`, `part4d-inventory-delete.sql`, `part5-installment-payment.sql`, `part6-stock-return-damage.sql`, `part7-purge-patient.sql` (folder `migrations/`).
   Agar aap FINAL58 ke parts pehle chala chuke hain to sirf `part5`, `part6` aur `part7`. `part7` demo/test patient ko Recycle Bin se hamesha ke liye hatane ka function hai (sirf doctor/admin).
3. Wapas lana ho to `migrations/ROLLBACK-part5-part6.sql` (aur purane parts ka rollback `migrations/part-ORDER-and-ROLLBACK.txt` mein).

## C. Backup aur Restore

- **Backup**: Admin/Doctor login > Settings > Backup (`/api/backup`). 68 tables ki JSON copy. Raaz wali tables (staff portal PIN/token hash, push keys) jaan-boojh kar shamil nahi.
- **Restore**: app mein restore ka button nahi (data ki hifazat ke liye). Naye **khali** Supabase project par `FINAL-AL-SHIFA-DATABASE.sql` chalayein, phir `tests/tools/restore-from-backup.sql` (psql se, backup JSON ke saath). Live database par kabhi nahi. Staff ke login (Auth users) alag se dobara banane honge, staff portal links dobara issue honge.

## D. Tests (sirf TEST database par)

Dekhein `tests/README.md`. Short mein: `npm test`, `npm run lint`, `npm run build`, aur `tests/db/*.sql`, `tests/e2e/*.js`.

## E. Kya bahar ke credentials par mawquf hai

WhatsApp sirf `wa.me` link kholta hai (koi API nahi). Push notification ke liye Firebase key chahiye. Password reset email Supabase Auth ki email settings par. In ka asli test real credentials ke baghair nahi ho sakta (FINAL-RELEASE-REPORT.md dekhein).

---

# Purane feature notes (history)

# PHASE 2 — Treatment Plans & Invoices

## Naya SQL (deploy ke baad chalayein)

Supabase → SQL Editor → `phase2.sql` ka content paste kar ke **Run** karein.
Ye 3 nayi tables banati hai: `treatment_plans`, `installments`, `visit_notes`.

## Kya mila

**Treatment Plans (Orthodontics ke liye)**
- Patient profile kholein → "Treatment Plans" → **+ Treatment Plan**
- Total cost, advance, duration (months) daalein
- Monthly installment khud calculate hoti hai
- Save karte hi **har month ki installment row automatically ban jati hai**

**Har Month ka Record**
- Har installment ke saamne **Mark Paid** button
- Payment method (Cash/Bank/EasyPaisa/JazzCash) select karein
- Paid / Overdue / Pending status khud lag jata hai
- **Pichle sab payments ki history** table mein rehti hai — kab diya, kitna diya, kis tareeqe se
- Paid karte hi wo entry **Billing reports mein bhi chali jati hai** (double entry nahi karni padti)

**Balance Tracking**
- Total, Paid, Remaining, aur Progress (jaise 7/24) upar cards mein
- Overdue installments red banner mein alag se

**WhatsApp Reminder**
- Har plan par **Send Reminder** button
- Patient ke number par seedha message — next installment ka number, amount aur due date

**Invoice / PDF**
- Patient profile → **Invoice** button
- Poora statement: treatment plans, sab payments, total, paid, balance
- **Save as PDF / Print** — PDF sirf aap ke device par banti hai
- **Send Summary on WhatsApp** — text summary patient ko
- Supabase par koi PDF save nahi hoti (storage bachti hai)

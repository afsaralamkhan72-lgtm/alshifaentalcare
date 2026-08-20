# Al Shifa Health Care — Complete Clinic System

Dr. Muhammad Khalid Mahmood | Dental & Homeopathic Clinic
Numaish, Nizami Road, Karachi | 0342-2078639 | 10:00 AM – 5:00 PM

Next.js 14 (App Router) + Supabase (PostgreSQL) + Tailwind CSS

---

# SETUP — 5 Steps

## STEP 1 — Supabase Project Banayein

1. https://supabase.com par sign up karein → **New Project**
2. Database password **strong rakhein aur kahin note kar lein**
3. Region: **Singapore** (Pakistan se sabse qareeb = fast queries)
4. Project ready hone mein ~2 minute lagte hain

## STEP 2 — Database SQL Run Karein

Supabase Dashboard → **SQL Editor** → New Query.
In 3 files ko **isi order** mein paste kar ke Run karein:

| # | File | Kya karti hai |
|---|------|---------------|
| 1 | `schema.sql` | 14 tables, indexes, RLS security policies |
| 2 | `storage-setup.sql` | `media` bucket images ke liye |
| 3 | `seed-phase3.sql` | Sample services + homepage stats (optional) |

## STEP 3 — Pehla Admin Account

`admin-setup.sql` file kholein aur uske 2 steps follow karein:

1. Dashboard → **Authentication → Users → Add user**
   - Email: `dr.khalid@alshifa.com` (ya jo chahein)
   - Password: strong password
   - **"Auto Confirm User" zaroor tick karein**
2. Naye user ka **User UID** copy karein
3. `admin-setup.sql` mein `PASTE-USER-UID-HERE` ki jagah wo UID daal kar SQL Editor mein Run karein

Ab is email/password se `/login` par login ho sakta hai.

## STEP 4 — Local Test

> **Note:** `package-lock.json` pehle se bana hua hai aur production build
> test ho chuki hai (saare 22 routes compile, 0 vulnerabilities).
> `node_modules` zip mein nahi hai (501MB, aur GitHub par jata bhi nahi) —
> `npm install` lockfile se exact wahi versions install karega.

```bash
npm install
cp .env.local.example .env.local
```

`.env.local` mein Supabase Dashboard → **Project Settings → API** se ye 2 values bharein:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

```bash
npm run dev
```

http://localhost:3000 kholein. Admin panel: http://localhost:3000/login

## STEP 5 — Vercel Par Deploy

1. Code GitHub par push karein (private repo)
   - `.gitignore` pehle se laga hai — `.env.local` aur `node_modules` push nahi honge
   - `package-lock.json` **zaroor push karein** (ye Vercel ko exact versions batati hai)
2. https://vercel.com → **Add New → Project** → repo import karein
   - Framework "Next.js" khud detect ho jayega — build settings change na karein
3. **Environment Variables** mein wahi 2 values add karein jo `.env.local` mein hain
4. **Deploy** dabayein — 2 minute mein live!

### Deploy ke baad ye 2 cheezein zaroor karein:

**A) Supabase mein Vercel URL allow karein**
Dashboard → Authentication → URL Configuration:
- Site URL: `https://aapka-project.vercel.app`
- Redirect URLs mein bhi wahi URL add karein

**B) Next.js image domain check**
`next.config.mjs` mein pehle se `*.supabase.co` allowed hai — kuch karne ki zaroorat nahi.

---

# SYSTEM MEIN KYA HAI

## Public Website (12 pages)
Home (banner + ticker + stats + featured services), About, Dental Services,
Homeopathic Services, Before/After Gallery, Videos, Doctors Panel,
Testimonials, Blog + single post, Contact (map + call/WhatsApp), Online Booking

Plus: **10-second emergency popup** aur site-wide floating WhatsApp button.
Har treatment card par WhatsApp booking button jo pre-filled message bhejta hai.

## Admin Panel (`/login`)
| Module | Kya karta hai |
|--------|---------------|
| Dashboard | Patient counts, monthly income/expense, pending appointments |
| Patients | Search (name/phone), department filter, add/edit |
| Dental Chart | 32-tooth FDI chart, 11 conditions, per-tooth history |
| Billing | Income/expense, Cash/Bank/EasyPaisa/JazzCash, date-range reports |
| Prescriptions | Bilingual English/اردو, potency/dosage, WhatsApp share |
| Inventory | Stock levels, low-stock + expiry alerts |
| Edit Website | Poori website ka content — koi developer nahi chahiye |

## Roles
- **admin** — sab kuch (Edit Website sirf admin ke liye)
- **doctor** — patients, dental chart, prescriptions
- **receptionist** — patients, billing, inventory

Naya staff add karne ka tareeqa `admin-setup.sql` ke neeche likha hai.

---

# SPACE SAVING

- Images browser mein hi **WebP** mein compress hoti hain upload se pehle
  (sharp rehti hain, size 70–90% kam) — 1GB free storage bohat chalti hai
- Videos sirf **YouTube links** — koi video file upload nahi
- Patient table mein **koi photo/QR nahi** (aap ki requirement ke mutabiq)
- Database par indexes lage hain: name (trigram), phone, department, dates

---

# TROUBLESHOOTING

**Login ke baad wapas /login par aa jata hai**
→ `staff_profiles` mein us user ki row nahi hai, ya `is_active = false` hai. Step 3 dobara check karein.

**Images upload nahi ho rahi**
→ `storage-setup.sql` run nahi hua. Step 2 dekh lein.

**CMS mein save karne par error**
→ Aap ka role `admin` hona chahiye. `staff_profiles` mein role check karein.

**Website par services nahi dikh rahi**
→ Admin Panel → Edit Website → Treatments/Services se add karein,
   ya `seed-phase3.sql` run karein sample data ke liye.

**Vercel par build fail**
→ Environment variables set nahi kiye. Step 5 ka point 3 dekhein.

---

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

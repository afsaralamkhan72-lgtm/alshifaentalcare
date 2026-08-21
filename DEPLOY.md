# AL SHIFA HEALTH CARE — FINAL DEPLOY GUIDE

Ye aik hi project hai. Is zip mein **sab kuch** hai — website, admin panel,
treatment plans, appointments, follow-ups, birthdays, reports aur voice assistant.

---

## STEP 1 — SUPABASE SQL (3 files)

Supabase → **SQL Editor** → New query:

| # | File | Kya karti hai |
|---|------|---------------|
| 1 | `SETUP-ALL.sql` | **Poora database** — 21 tables, security, sample services, sab modules |
| 2 | `phase7.sql` | Patient Portal access codes |
| 3 | `admin-setup.sql` | Pehla login account |

`SETUP-ALL.sql` ka **pura content** copy kar ke paste karein aur **Run** dabayein. Bas.

> Dobara chalana bhi mehfooz hai — purana data zaya nahi hota.
> (Alag alag files `sql-individual/` folder mein hain, agar kabhi zaroorat pade.)

### Admin account (file #5 se pehle)
1. **Authentication → Users → Add user**
2. Email + password daalein, **"Auto Confirm User" tick karein**
3. Bane hue user ka **UID** copy karein
4. `admin-setup.sql` mein `PASTE-USER-UID-HERE` ki jagah wo UID daal kar Run karein

---

## STEP 2 — GITHUB

Zip extract karein → GitHub repo mein **saari files** upload karein → Commit.

`.gitignore` pehle se laga hai, is liye `.env.local` aur `node_modules` push nahi honge.

---

## STEP 3 — VERCEL

1. **Add New → Project** → repo import karein
2. **Environment Variables** mein 2 entries:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase ka Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_...`) — **patient portal ke liye zaroori** |

> `SUPABASE_SERVICE_ROLE_KEY` sirf server par chalti hai, browser tak nahi jati.
> Ye kabhi kisi ko na dein aur GitHub par push na karein.

3. **Deploy** dabayein

---

## STEP 4 — SUPABASE MEIN VERCEL URL (warna login nahi chalega)

**Authentication → URL Configuration:**
- Site URL: `https://aapka-project.vercel.app`
- Redirect URLs mein bhi wahi URL add karein

---

# SOFTWARE MEIN KYA HAI

## Website (12 pages)
Home · About · Dental Services (8) · Homeopathic Services (4) · Gallery ·
Videos · Doctors · Reviews · Blog · Contact · Online Booking

Plus: emergency popup, floating WhatsApp button, har service par WhatsApp booking,
aur navbar mein **Staff Login**.

## Admin Panel — 11 modules

| Module | Kaam |
|--------|------|
| **Dashboard** | Patients, income, expenses, pending appointments |
| **Appointments** | Din ka schedule, confirm/complete/cancel, walk-in booking, WhatsApp confirmation |
| **Patients** | Search, add/edit, **har patient ka poora record** |
| **Follow-ups** | Jin ka agla visit due hai — overdue alag, WhatsApp reminder |
| **Birthdays** | Aaj / 7 din / is maheene — mubarakbad + offer WhatsApp par |
| **Dental Chart** | 32 daant, 11 conditions, per-tooth history |
| **Billing** | Income/expense, 4 payment methods, date-range reports |
| **Reports** | Mahine ka poora hisaab, income by category, outstanding balance |
| **Prescriptions** | English + اردو, WhatsApp par bhejein |
| **Inventory** | Stock, low-stock aur expiry alerts |
| **Edit Website** | Poori website ka content — bina developer ke |

## Patient Profile (sab kuch aik jagah)
Details + date of birth · last/next visit · Total/Paid/**Balance** cards ·
Treatment Plans (monthly installments) · Visit Notes · Prescriptions ·
Payment History · Appointments · Dental Chart · **Invoice** (PDF/print)

## Treatment Plans (Orthodontics)
Total cost + duration daalein → monthly installment khud bante hain →
har month **Mark Paid** → status, balance aur progress khud update ·
Paid entry Billing reports mein bhi chali jati hai · WhatsApp reminder button

## Assistant (Ctrl + K)
Bol kar ya likh kar poochein: *"Zeeshan ki last visit kab thi"*,
*"Ali ka balance"*, *"Fatima ki dawai"* → jawab + profile kholne ka button.
Mic ke liye **Chrome/Edge** chahiye. Koi API key nahi, koi kharch nahi.

---

# MOBILE PAR APP JAISA

Phone ke Chrome mein site kholein → menu → **"Add to Home Screen"**.
Icon ban jayega aur app ki tarah khulega.

---

# TROUBLESHOOTING

| Masla | Hal |
|-------|-----|
| Login ke baad wapas /login | `staff_profiles` mein row nahi — admin-setup.sql dubara dekhein |
| "relation ... does not exist" | `phase2.sql` nahi chali |
| Birthdays page warning | `phase2.sql` dobara chalayein |
| Images upload nahi hoti | `storage-setup.sql` nahi chali |
| Services nahi dikh rahi | `seed-phase3.sql` chalayein ya CMS se add karein |
| Mic button nahi dikhta | Chrome/Edge use karein |
| Vercel build fail | Environment variables set nahi |

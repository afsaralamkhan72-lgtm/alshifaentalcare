# CLINIC SOFTWARE — NEW CLIENT BRIEF

> **Is file ka istemaal:** naye chat mein ye file aur `al-shifa-clinic-FINAL.zip`
> dono upload karein, neeche wala form bhar dein, aur likhein:
> *"Is brief ke mutabiq is clinic ke liye software tayyar kar do."*

---

## PART 1 — CLINIC DETAILS (ye bharein)

```
Clinic ka poora naam      :
Chhota naam (sidebar)     :
Tagline                   :

Doctor ka naam            :
Doctor ki qualification   :

Phone (jaise dikhana hai) :
Phone (sirf digits)       :
WhatsApp (92 + number)    :

Poora pata                :
Ilaqa                     :
Sheher                    :

Timings (chhota)          :
Timings (poora)           :

Google Maps search        :
MR prefix (2-3 harf)      :
```

**Misal:**
```
Clinic ka poora naam      : Shifa Dental Clinic
Chhota naam (sidebar)     : Shifa
Tagline                   : Dental & Orthodontic Clinic

Doctor ka naam            : Dr. Ahmed Ali
Doctor ki qualification   : BDS, RDS

Phone (jaise dikhana hai) : 0300-1234567
Phone (sirf digits)       : 03001234567
WhatsApp (92 + number)    : 923001234567

Poora pata                : Saddar, Peshawar
Ilaqa                     : Saddar
Sheher                    : Peshawar

Timings (chhota)          : 9:00 AM to 6:00 PM
Timings (poora)           : Open Daily 9:00 AM to 6:00 PM

Google Maps search        : Saddar Peshawar
MR prefix (2-3 harf)      : SD
```

---

## PART 2 — YE PROJECT KYA HAI

Next.js 16 + Supabase par bana clinic management system.

**Public website (12 page):** Home, About, Dental Services, Homeopathic
Services, Gallery, Videos, Doctors, Reviews, Blog, Contact, Booking,
plus Staff Login.

**Admin panel (13 module):** Dashboard, Appointments, Patients,
Follow-ups, Recall, Birthdays, Dental Chart, Lab Cases, Billing,
Reports, Prescriptions, Inventory, Edit Website (CMS), Recycle Bin.

**Khaas cheezein:**
- Patient ka poora record aik page par
- 9-step patient history wizard (dental chart us ke andar)
- Treatment plans with monthly instalments (orthodontics ke liye)
- Invoice with discount, print/PDF, WhatsApp
- Lab work orders with FDI tooth picker
- Patient portal (code se, bina login)
- Ctrl+K assistant (voice + text, patient ke baare mein sawal)

---

## PART 3 — KYA KYA BADALNA HAI (sirf 3 jagah)

### 1. `clinic.config.ts`
Root mein hai. Part 1 wali tafseel is mein bhar dein. **Poora software
yahin se chalta hai** — website, admin, invoice, WhatsApp messages,
portal, sab jagah.

### 2. `SETUP-ALL.sql`
MR number ka prefix database mein hai. File mein `'AS-'` dhoond kar
naye clinic ka prefix likhein (jaise `'SD-'`).

### 3. `admin-setup.sql`
Us mein doctor ka naam likha hua hai, wo badal dein.

**Baaqi kisi file ko haath na lagayein.**

---

## PART 4 — KAAM MUKAMMAL HONE KE BAAD

Ye check zaroori hai:

```bash
npm install
npx next build
```

Build pass honi chahiye. Phir confirm karein ke poore project mein
purane clinic ka koi naam baaqi nahi:

```bash
grep -rn "Al Shifa\|Khalid Mahmood\|0342-2078639\|Numaish" app components --include=*.tsx | grep -v clinic.config
```

Ye khali aana chahiye (0 result).

Phir naya zip bana kar dein.

---

## PART 5 — DEPLOY (client khud ya aap karein)

**Supabase:**
1. Naya project
2. SQL Editor mein `SETUP-ALL.sql` chalayein
3. Phir `phase7.sql` chalayein
4. Authentication → Users → Add user (**Auto Confirm User** tick karein)
5. UID copy kar ke `admin-setup.sql` chalayein

**Vercel:**
1. GitHub par repo, phir Vercel par import
2. Environment Variables:

| Name | Kahan se |
|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_...`) |

3. Deploy
4. Supabase → Authentication → URL Configuration mein Vercel URL daalein

**Handover:** login kar ke Edit Website se logo, services aur doctor ki
photo add kar dein.

---

## PART 6 — YAAD RAKHNE WALI BAATEIN

- Har client ka apna Supabase aur apna Vercel. Data bilkul alag.
- `SUPABASE_SERVICE_ROLE_KEY` kabhi GitHub par push na karein.
- Patient portal is key ke bagair kaam nahi karega.
- Logo aur services CMS se add hote hain, code se nahi.
- Agar code chhue bagair badalna ho to `clinic.config.ts` ki har value
  Vercel ki Environment Variables se bhi set ho sakti hai
  (`NEXT_PUBLIC_CLINIC_NAME` waghera) — tafseel `NEW-CLIENT.md` mein hai.

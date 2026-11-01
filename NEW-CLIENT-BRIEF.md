# CLINIC SOFTWARE — NAYE CLIENT KA DHAANCHA

> **Istemal ka tareeqa:** naye chat mein ye file aur
> `al-shifa-clinic-FINAL.zip` dono upload karein, Part 1 ka form
> bhar dein, aur likhein:
>
> *"Is brief ke mutabiq is clinic ke liye software tayyar kar do."*

---

## PART 1 — CLINIC KI TAFSEEL (ye bharein)

```
Clinic ka poora naam      :
Chhota naam (sidebar)     :
Tagline                   :
Slogan (letterhead par)   :

Doctor ka naam            :
Doctor ki qualification   :

Phone (jaise dikhana hai) :
Phone (sirf digits)       :
WhatsApp (92 + number)    :
Easypaisa number          :
JazzCash number           :

Poora pata                :
Ilaqa                     :
Sheher                    :
Google Maps link          :
Latitude, Longitude       :

Timings (chhota)          :
Timings (poora)           :
Chutti ka din             :

MR prefix (2-3 harf)      :
Aas paas ke ilaqe         :

Social links (jo hon):
  Facebook                :
  Instagram               :
  TikTok                  :
  YouTube                 :
  Google Business         :
```

**Misal:**
```
Clinic ka poora naam      : Shifa Dental Clinic
Chhota naam               : Shifa
Tagline                   : Dental & Orthodontic Clinic
Slogan                    : Aap ki Sehat, Hamari Zimmedari

Doctor ka naam            : Dr. Ahmed Ali
Doctor ki qualification   : BDS, RDS

Phone (dikhane ke liye)   : 0300-1234567
Phone (sirf digits)       : 03001234567
WhatsApp (92 + number)    : 923001234567
Easypaisa                 : 0300-1234567
JazzCash                  : 0300-1234567

Poora pata                : Saddar, Peshawar
Ilaqa                     : Saddar
Sheher                    : Peshawar
Google Maps link          : https://maps.app.goo.gl/xxxxx
Latitude, Longitude       : 34.0151, 71.5249

Timings (chhota)          : 9:00 AM to 6:00 PM
Timings (poora)           : Open Daily 9:00 AM to 6:00 PM
Chutti ka din             : Friday

MR prefix                 : SD
Aas paas ke ilaqe         : Saddar, University Road, Hayatabad, Peshawar
```

---

## PART 2 — YE PROJECT KYA HAI

Next.js 16 + Supabase + Tailwind par bana **clinic management system**
aur public website. Deploy Vercel par hota hai.

### Public website (12 page)
Home, About, Dental Services, Homeopathic Services, Gallery, Videos,
Doctors, Reviews, Blog, Contact, Online Booking, Staff Login.

Khaas baatein: cover banner (CMS se), emergency popup, floating WhatsApp
button, clinic photos, CEO ka taaruf, 16 blog articles pehle se, mobile
par scroll wali nav (hamburger nahi), aur Friday-off har jagah.

### Admin panel (17 module)
Dashboard · Appointments · Patients · Follow-ups · Recall · Birthdays ·
Dental Chart · Lab Cases · Billing · Baqaya Payments · Reports ·
Prescriptions · Inventory · Edit Website (CMS) · Recycle Bin

### Billing ka nizam (sabse ahem hissa)
- Har treatment ka rate, discount, aur kitna paisa mila
- Baqaya + due date har patient ke liye
- Lambe treatment (braces/RCT course) ke liye **monthly instalments**,
  har mahine ki asal raqam (fix nahi), arrears khud nikalta hai
- Poora ledger: har rupay ki line, chalta hua balance
- Har entry par Edit aur Delete
- Bill par letterhead, PDF/print, aur WhatsApp statement
- Treatment mukammal hone par **permanent summary file**, aur us ke
  4 din baad photos khud saaf (text record hamesha rehta hai)

### Patient ka record
Profile pic (overwrite hoti hai, storage nahi barhta) · max 3 treatment
photos (private bucket) · 9-step history wizard · dental chart
(Pakistani 1-8 numbering, asal daant ki shaklein, 24 conditions) ·
visit timeline · prescriptions · patient portal (code se, bina login).

### SEO / GEO / AEO
Per-page metadata, sitemap, robots, LocalBusiness + FAQ + Service
structured data, geo coordinates, service areas, aur `/llms.txt`.

---

## PART 3 — KYA BADALNA HAI (sirf 3 jagah)

### 1. `clinic.config.ts`  ← sabse ahem
Root mein hai. Part 1 ki saari tafseel yahin bhar dein. **Poora software
isi file se chalta hai** — website, admin, invoice, letterhead, WhatsApp
messages, portal, SEO, sab.

### 2. `SETUP-ALL.sql`
MR prefix database ke trigger mein hai. File mein `'AS-'` dhoond kar
naye clinic ka prefix likhein (jaise `'SD-'`).

### 3. `admin-setup.sql`
Us mein doctor ka naam likha hai, wo badal dein.

**Baaqi kisi file ko haath na lagayein.**

---

## PART 4 — KAAM KE BAAD YE CHECK KAREIN

```bash
npm install
npx next build
```

Build pass honi chahiye. Phir confirm karein ke purane clinic ka koi
naam baaqi nahi:

```bash
grep -rn "Al Shifa\|Khalid Mahmood\|0342-2078639\|Numaish" app components --include=*.tsx | grep -v clinic.config
```

Ye khali aana chahiye (0 result). Phir naya zip bana kar dein.

---

## PART 5 — DEPLOY

**Supabase:**
1. Naya project (region: Singapore)
2. SQL Editor mein `SETUP-ALL.sql` chalayein
3. Authentication → Users → Add user (**Auto Confirm User** tick karein)
4. UID copy kar ke `admin-setup.sql` chalayein

**Vercel:**
1. GitHub par repo, phir Vercel par import
2. Environment Variables:

| Name | Kahan se |
|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_...`) |
| `NEXT_PUBLIC_SITE_URL` | Client ka asal domain |

3. Deploy
4. Supabase → Authentication → URL Configuration mein domain daalein

**Handover:** login kar ke Edit Website se logo, cover banner, services,
doctor ki photo, clinic photos aur social links add kar dein.

---

## PART 6 — YAAD RAKHNE WALI BAATEIN

- Har client ka **apna** Supabase aur **apna** Vercel. Data bilkul alag.
- `SUPABASE_SERVICE_ROLE_KEY` kabhi GitHub par push na karein.
- Patient portal aur photos is key ke bagair kaam nahi karenge.
- `NEXT_PUBLIC_SITE_URL` set na ho to SEO purane URL par chalega.
- Logo, services, photos sab CMS se add hote hain, code se nahi.
- Chahein to `clinic.config.ts` ki har value Vercel ke Environment
  Variables se bhi set ho sakti hai (`NEXT_PUBLIC_CLINIC_NAME` waghera),
  us soorat mein aik hi repo se kai clinics chal sakti hain.
- Photos private bucket (`patient-media`) mein hain, sirf staff dekh
  sakta hai. Website wali images alag `media` bucket mein hain.

---

## PART 7 — CLIENT KO KYA BATANA HAI

- Supabase aur Vercel abhi **muft tier** par hain. Patients barhne par
  paid plan lena par sakta hai — ye pehle hi bata dein.
- Software banane ki qeemat aur **baad ke support** ki qeemat alag alag
  tay karein, warna har chhoti tabdeeli muft mein karni paregi.
- Google Business Profile aur asli reviews local clinic ke liye website
  se zyada asar rakhte hain. Ye client khud karega.

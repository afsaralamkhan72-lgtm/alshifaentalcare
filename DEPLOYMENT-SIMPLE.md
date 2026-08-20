# AL SHIFA CLINIC — DEPLOYMENT GUIDE (SUPER SIMPLE)

## READY KYA HAI:
✅ 8 Dental Services (Scaling, RCT, Whitening, Implants, Crowns, Extractions, Braces, Dentures)
✅ 4 Homeopathic Services
✅ Complete Admin Panel with Login
✅ All Pages Working
✅ GitHub + Vercel + Supabase Ready

---

## DEPLOYMENT — 5 EASY STEPS

### STEP 1: SUPABASE SETUP (Agar pehle nahi kiya)

1. https://supabase.com → **New Project**
2. Name: **al-shifa-clinic**
3. Region: **Singapore**
4. Database password: **koi strong password likhein + save karein**
5. Wait 2 minutes → project ready ho jayega

**Phir SQL Editor mein (upar left side) 3 files chalayein:**
- Pehle: `schema.sql` (copy-paste, Run)
- Dusra: `storage-setup.sql` (copy-paste, Run)
- Tisra: `seed-phase3.sql` (copy-paste, Run)

**Admin account banayein:**
- Authentication → Users → Add user
- Email + password daalein
- "Auto Confirm User" ✓ tick karein
- User UID copy karein

**Phir admin-setup.sql mein:**
- `PASTE-USER-UID-HERE` ki jagah UID paste karein
- SQL Editor mein Run karein

**API Keys copy karein:**
- Settings (gear icon) → API
- **Project URL** copy karein
- **Publishable key** (sb_publishable_...) copy karein

---

### STEP 2: GITHUB UPLOAD

1. https://github.com → **New repository**
2. Name: **al-shifa-clinic**
3. Private rakhein ✓
4. Create repository

**Phir GitHub Website par seedha:**
- Green **"< > Code"** button → **Upload files**
- FINAL.zip extract karke **sab files/folders drag-drop karein**
- **Commit changes** button daba do

**Done!** Code GitHub par upload ho gaya.

---

### STEP 3: VERCEL DEPLOY

1. https://vercel.com → **Add New** → **Project**
2. GitHub se **al-shifa-clinic** repository select karein
3. **Deploy** button daba do

**Wait karein** (5 minute tak).

Phir **Settings** tab mein jayein:

**Environment Variables** section:
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
  **Value:** Apna Project URL (Supabase se copy kiya tha)
  
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  **Value:** Publishable key (Supabase se copy kiya tha)

Dono ke liye **Production, Preview, Development** sabko select rakhen.

**Save** button daba do.

---

### STEP 4: REDEPLOY

1. Vercel → **Deployments** tab
2. Latest deployment → **...** menu → **Redeploy**
3. Wait 3-5 minutes (green ✓ "Ready" hona chahiye)

---

### STEP 5: SUPABASE URL CONFIG (IMPORTANT!)

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL:** Apna Vercel URL likho (jaise `https://al-shifa-clinic.vercel.app`)
3. **Redirect URLs:** Add karein:
   - `https://al-shifa-clinic.vercel.app`
   - `https://al-shifa-clinic.vercel.app/auth/callback`
4. **Save** karo

---

## DONE! WEBSITE LIVE HAI

**Login Page:**
https://al-shifa-clinic.vercel.app/login

**Admin Panel:**
https://al-shifa-clinic.vercel.app/admin/dashboard

**Home Page:**
https://al-shifa-clinic.vercel.app

---

## LOGIN CREDENTIALS:
- **Email:** Wo email jo aapne Supabase mein set kiya
- **Password:** Wo password jo set kiya

---

## YEH MILEGA:
✅ 8 Dental Services homepage par
✅ Login page (/login)
✅ Complete Admin Panel
✅ Services, Gallery, Blog, Videos, Doctors, Reviews sab pages
✅ Emergency popup + WhatsApp buttons
✅ CMS (Edit Website) jahan se Dr. Sahib khud content edit kar sakein

---

## IMPORTANT NOTES:

**Vercel URL exact likho** jahan likha hai — copy-paste karein.

**Supabase URL Configuration** zaroori hai — warna login fail hoga.

**Admin panel mein:** 
- Dashboard → statistics
- Patients → add/edit patients, dental chart
- Billing → income/expense tracking
- Prescriptions → bilingual Urdu/English
- Inventory → stock management
- Edit Website → CMS (services, gallery, blog etc)

---

**Kisi problem ke liye bata dein!** 🚀

# NAYE CLINIC KE LIYE SETUP

Har naye client ka apna alag system banta hai. Data bilkul alag rehta hai.

---

## 1. `clinic.config.ts` badlein (5 minute)

Project ki root mein `clinic.config.ts` file kholein aur us clinic ki
tafseel bhar dein:

```ts
name: 'Shifa Dental Clinic',
shortName: 'Shifa',
doctor: {
  name: 'Dr. Ahmed Ali',
  qualification: 'BDS, RDS',
},
phone: {
  display: '0300-1234567',
  dial: '03001234567',
  whatsapp: '923001234567',   // 92 + number, 0 ke bagair
},
address: {
  full: 'Saddar, Peshawar',
  area: 'Saddar',
  city: 'Peshawar',
},
timings: {
  short: '9:00 AM to 6:00 PM',
  full: 'Open Daily 9:00 AM to 6:00 PM',
},
mapQuery: 'Saddar Peshawar',
mrPrefix: 'SD',
```

**Bas itna.** Website, admin panel, invoice, WhatsApp messages, patient
portal, sab jagah ye tafseel khud lag jayegi.

> MR number ka prefix (`SD-D-0001`) database mein bhi hai.
> `SETUP-ALL.sql` mein `'AS-'` dhoond kar us clinic ka prefix likh dein.

---

## 2. Supabase

1. Naya project banayein
2. SQL Editor mein `SETUP-ALL.sql` chalayein
3. Phir `phase7.sql` chalayein
4. Authentication > Users > Add user (Auto Confirm tick karein)
5. UID copy kar ke `admin-setup.sql` mein daal kar chalayein
   (us mein doctor ka naam bhi badal dein)

---

## 3. GitHub aur Vercel

1. Repo ki nayi copy banayein
2. Vercel par naya project, wahi repo
3. Environment Variables:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | us clinic ka Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | secret key |

4. Deploy
5. Supabase > Authentication > URL Configuration mein naya Vercel URL daalein

---

## 4. Clinic ko handover

Login kar ke **Edit Website** se:
- Clinic ka logo upload karein
- Services, doctor ki photo, timings
- Emergency popup ka text

Ye sab clinic khud bhi badal sakta hai.

---

## Code chhue bagair badalna ho?

`clinic.config.ts` ki har value Vercel ki Environment Variables se bhi
badal sakti hai. Us surat mein `clinic.config.ts` waise hi rehne dein:

```
NEXT_PUBLIC_CLINIC_NAME=Shifa Dental Clinic
NEXT_PUBLIC_CLINIC_DOCTOR=Dr. Ahmed Ali
NEXT_PUBLIC_CLINIC_PHONE=0300-1234567
NEXT_PUBLIC_CLINIC_PHONE_DIAL=03001234567
NEXT_PUBLIC_CLINIC_WHATSAPP=923001234567
NEXT_PUBLIC_CLINIC_ADDRESS=Saddar, Peshawar
NEXT_PUBLIC_CLINIC_AREA=Saddar
NEXT_PUBLIC_CLINIC_CITY=Peshawar
NEXT_PUBLIC_CLINIC_TIMINGS=Open Daily 9:00 AM to 6:00 PM
NEXT_PUBLIC_CLINIC_MAP_QUERY=Saddar Peshawar
NEXT_PUBLIC_MR_PREFIX=SD
```

Is tareeqe se aik hi repo se kai clinics chal sakti hain.

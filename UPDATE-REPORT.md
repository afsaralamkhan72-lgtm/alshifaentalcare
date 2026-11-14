# Al Shifa update report (2026-11-09)
Tested on local copy only (Postgres 16 + PostgREST + Next.js). Real Supabase, real phone, Auth, WhatsApp, FCM NOT VERIFIED.

## Kya naya hai
1. Chart: 2+ daant chun kar Bridge / Partial / Flexible Denture ek hi kaam (ek qatar, ek treatment, ek qeemat = list ki per-unit x daant). Bridge ki types list se (PFM, E-max, Zirconia, Porcelain). Complete Denture alag. Ek dafa chunne ke baad har daant ka alag Takleef/Masla/Kaam card nahi dikhta. Qeemat list mein 0 ho to hint aata hai.
2. Visit ka form khulne par purani history aur "Treatments ka hisaab" chhup jate hain; "Marez ke profile par wapas" button.
3. "Aage kya": ab planned treatments bhi dropdown mein; chalu treatment na ho to wazahat.
4. Haan / Nahi button barabar, chuna hua button "tick" ke saath.
5. Invoice Blue template: INVOICE, Sr. No., Rate, Quantity, Amount, Sub Total, Net Payable, Paid, Balance Due, Thank you, stamp, Authorized Signature. Hisaab ka tareeqa wahi.
6. Demo/test patient hamesha ke liye hatana: Recycle Bin > "Hamesha ke liye hatao". Sirf doctor/admin, pehle patient Delete (Recycle Bin) hona chahiye, backup tick + DELETE likhna, audit entry. Invoices, payments aur income us patient ke saath hat jate hain (Munafa ke total kam honge). Stock ki miqdar nahi badalti. Audit Log purani entries rakhta hai.
7. Takleef page: "Kahan" ke liye daant chunne ke chhote button (adult aur bachon ke), chune hue daant text mein jur jate hain.
8. "Aage kya": dropdown mein "Nayi treatment (clinic ki list se)"; visit khatam par wo treatment "plan" ban jati hai (bill nahi banta).
9. DATA-SQL folder: 4 staff (120,000, tareekh 5), 83 dental dawaiyan, 75 treatments, 142 inventory items. Sirf-add, dobara chalane se double nahi.

## Natayej
| Check | Result |
|---|---|
| tsc, npm test (7), eslint 0 errors | PASS |
| next build | PASS |
| DB regression (7 files incl. new purge 6/6, payroll, stock, installments) | PASS |
| Browser battery 27 scripts (390 / 1280 px) | PASS (exit 0) |
| Bridge/denture group flow, visit mode, purge via UI | PASS |
| Kahan daant picker (1280 / 390), Aage kya list se treatment (planned ban gayi) | PASS (p94) |
| DATA SQL on clean DB: counts 4/83/75/142, second run no change | PASS |
| DATA SQL on FINAL58-like DB: no money/stock change, existing rows not overwritten | PASS |
| Full DB SQL + part7 on fresh DB: 0 errors, same table count (84) | PASS |

## NOT VERIFIED
Real Supabase run of SQL, Supabase Auth, real phone, WhatsApp, FCM. Payroll page total for the 4 new staff (salary sum 120,000 checked in DB, page itself not opened). Photo files in storage bucket are removed by the app after purge (not tested with real storage).

## Dhyan dein
- Dawaiyon mein dose/muddat khali; Greymax aur Arinac pack se theek karein.
- Treatments: fee wahi jo PDF mein ek rate hai; range mein sab se kam rate aur note mein poori range; baqi 0 (doctor bhare). Bridge types, E-max Crown, Veneer, Flexible/Cast Partial Denture ki fee 0.
- Production mein pehle se mojood naam alag likhe hon (jaise "Dr Sachin") to double ho sakte hain.
- Staff ke PIN app se khud set karein.

## Aakhri jaanch (PASS, local)
- Salary: 4 staff (40,000 + 40,000 + 20,000 + 20,000 = 120,000). "Mahina tayyar karein" dabane par 4 entries, total 120,000; dobara dabane par duplicate nahi. Salary khud-ba-khud nahi banti: 5 tareekh se pehle yaad-dahani aati hai, owner button dabata hai.
- Qeemat 0 wali Bridge: visit theek khatam hoti hai, treatment 0 par save, koi error nahi, invoice nahi banta (doctor baad mein qeemat bhare).
- Visit form se "wapas" dabane par likha hua bachta hai; "Naya visit shuru" dabane par wahi kaam wapas aa jata hai.
- Inventory: naam, category, group, unit, mojooda stock, alert-at, supplier, expiry, tafseel hain; khareed (purchase) mein company/brand, bill number, pack, qeemat hain.

## Bridge / Denture ki qeemat (naya)
- Bridge ki type dabate hi qeemat Price List se khud aati hai; invoice mein ek hi line.
- Har Bridge/Partial par do batan: "Har daant ki qeemat" (qeemat x daant) ya "Poore ki ek qeemat". Doctor jo chahe chune.
- Complete Denture ke saare types (Upper or Lower, Both) aur Partial/Flexible/Cast Partial list se.
- Agar Price List mein qeemat khali (0) hai: doctor visit mein likhe, visit khatam hone par wo Price List mein khud save ho jati hai (pehle se bhari qeemat kabhi nahi badalti; save sirf tab jab owner/settings ki ijazat ho).
- Tooth chart par Bridge: sahaare daant ek rang (teal), beech wale pontic doosra (peela). Sirf rang; chart ka size/layout nahi badla (390 aur 1280 par naapa).
- Test (p96): Zirconia 4 daant 20,000 / poore ki ek 5,000, invoice 20,000, PFM par likhi 12,000 Price List mein save.

## Step 2 "Daant aur kaam" naya design (naya)
- Sab kuch upar chart par: daant par tap karein (ek ya kai), chart ke panel mein Masla (likhein ya list se), Kaam (Filling, RCT, Crown, Extraction, Implant ya list se), Bill pehle se dikhta hai, "Card banayein". Mobile par ye neeche se khulne wali sheet mein aata hai.
- Neeche "Daant aur kaam" mein sirf cards: har daant ka chhota card (daant, masla, kaam, qeemat, hatao). Card banne par chart ki selection khud saaf ho jati hai.
- Chart ke panel se daant ke kaam/masle ke purane nishan (Filling, RCT, Crown, Caries ...) hata diye, kyun ke wahi cheez do jagah thi. Masoorhe (gums) ke nishan aur note wahin rehte hain. Chart par rang kaam likhne se khud lagte hain.
- Bridge / Denture: panel mein "Bridge" ya "Denture" dabate hi unki options aati hain (qism, "Har daant ki / Poore ki ek" qeemat). Ek card, ek bill, ek line. Poori jabde ki Denture: cards ke upar alag button (daant chunna zaroori nahi), jabda (Upar / Neeche / Dono) card mein chunein.
- Takleef ab card ke andar band hissa (zaroori nahi). "Poore muh ka kaam", "Pehle se chalti/plan wali treatments", Step 1/3/4, bill, payment, receipt waisa hi.
- Tooth chart ka size nahi badla; bridge ke sahaare firozi aur beech ke peele.
- Test (p97): 6-daant bridge (E-max), 3-daant Partial Denture, Complete Denture, Crown, RCT, 2 Extraction. Har ek ka card, invoice aur treatment sahi, 390 aur 1280 px par overflow nahi.

## Jagah aur purana data (naya, Settings > "Jagah aur purana data", sirf doctor/admin)
- Meter: Supabase database kitni bhari (MB / 500 MB), kis table ne zyada jagah li.
- Arsa chunein (6 mahine, 1, 2, 3 saal), "Pehle dekhein kitna hatega" (kitne mareez, visits, nuskhe, chart, photos).
- Jin mareezon ka baqaya 0 hai, koi chalti/plan treatment, pending lab ya aane wali appointment nahi, aur aakhri visit/bill/payment us arse se purani hai, sirf wo.
- Hatta hai: visits, visit notes, chart, nuskhe, photos (storage se bhi), lab cases, appointments, treatments, audit ki purani entries. Rehta hai: mareez ki ID/naam/phone/history, aur ek Summary Card (pehli aur aakhri visit, kul visits, kaam ki list, kul bill aur kul mile). Card mareez ki profile par dikhta hai.
- Paison ke record (invoice, payment) default mein rehte hain, kyun ke hisaab ki reports unhi par chalti hain. Tick karne par wo bhi hatte hain (stock ki miqdar nahi badalti) aur card mein total likha rehta hai.
- Safety: backup tick, DELETE likhna, kam az kam 3 mahine purana, 25-25 mareez ke batch mein, audit mein "PATIENT_ARCHIVE" ki entry.
- SQL: AL-SHIFA-SAFAI-SQL.sql (naya, chhota, sirf-add, dobara chalane se koi nuqsan nahi). Bari EK-SQL pehle chal chuki hai, wo dobara nahi chalani.
- Test: DB regression 2 files (paison ke bagair / paison ke sath) PASS, production-jaisi DB par do baar SQL PASS, browser test p98 (preview, DELETE guard, hata kar card, profile par card) PASS.
- NOT VERIFIED: asli Supabase par (db size ka number, storage se photo removal asli bucket mein), kyun ke yahan sirf local test hai.

## Abhi baqi
Homeopathic dawaiyon ki list (aap ki taraf se). Asli Supabase/login/phone/WhatsApp par test yahan mumkin nahi.

## Delete fix (naya)
- Bug: asli mareez ko "Hamesha ke liye hatao" par error "violates foreign key clinical_visits_appointment_id_fkey". Wajah: visit appointment se juri hoti hai, purge pehle appointment hatata tha.
- Fix: AL-SHIFA-DELETE-FIX-SQL.sql (sirf purge_patient badalta hai, dobara chalane se koi nuqsan nahi). Pehle visit ka appointment se rishta khatam, phir appointment aur uski history hatati hai.
- Test: pehle fail (dobara bana kar), fix ke baad PASS; sab 183 test mareezon par purge (rollback ke sath) 0 galti; purane purge ke 6/6 PASS.

## 11 Nov 2026: security jaanch, role test, unit test

### Naya
- Agli appointment par ilaaj ka naam aur "visit N" (visit 1 mein "Aaj shuru hua kaam" chun sakte hain).
- Parchi (ilaaj ke qadam), crown baqi card, salary yaad dehani, visit ka WhatsApp khulasa.
- Security headers (nosniff, SAMEORIGIN, referrer policy).

### Security
- Mili: test database par bina login ke `loyalty_find_patients` se phone number par mareez ka naam milta tha; `_pay_treatment_core`, `_loyalty_award`, `staff_acknowledge` waghera bina login chal jate the.
- Fix: `AL-SHIFA-SECURITY-FIX-SQL.sql` (part13). Test database par laga kar dobara jaancha: ab "permission denied".
- Asli Supabase par khula hai ya nahi: NOT VERIFIED. `AL-SHIFA-SECURITY-CHECK-SQL.sql` chala kar dekhein (sirf padhti hai).
- Theek nikla: bina login koi table nahi parh sakta; receptionist khud ko admin nahi bana sakti; kharcha, salary, purge, permissions sirf doctor/admin; backup aur cron bina login band; npm audit 0.
- Kam darje ki baat (badla nahi): `/api/device/register` par rate limit nahi.

### Test (sirf local test database)
- Unit: 27/27 PASS. Role + ilaaj scenario: 46/46 PASS. Database regression: sab PASS. Browser battery 37 script: koi FAIL nahi (Google Fonts ka ERR_FAILED sirf bina internet test machine ka).
- integrity-checks: "invoice paid != sum(payments)" 89, sab archive kiye hue purane test mareez hain (archive payments ki tafseel hata deta hai).
- NOT VERIFIED: asli Supabase, asli phone, WhatsApp ka khulna, login screen.

## 11 Nov 2026 (raat): Visit 2 ka alag page

- Naya page: `/admin/patients/<mareez>/visit/<ilaaj>`. Profile ke har ilaaj ke card ka "Visit N shuru karein" yahan aata hai. Us par sirf: pichli visit, qadam, note, material, paise, agli tareekh / mukammal, dawa ka chhota button.
- Bara visit page ab sirf naye kaam ke liye: chalte ilaaj wahan sirf link hain, plan kiye hue ilaaj tick se shuru hote hain.
- Qadam ki ek hi list (`treatment_stages`, profile wali "Marhale"). Kal wali doosri list (`treatment_steps`) ka UI hata diya; us ka khali table database mein reh gaya, koi nuqsan nahi.
- Material: visit 1 ke aakhri qadam aur visit 2 ke page par tick + miqdar + "Aur samaan chunein" (poora stock).
- Lab ka button sirf ilaaj ke card par (aur visit 2 ke page par), hamesha us ilaaj se jura hua.
- Payment visit 2 par `collect_payment` se usi ilaaj ke bill par lagti hai.
- Naya SQL nahi chahiye. `6-QIST-DOUBLE-BILL-CHECK.sql` sirf parhti hai.
- Test (local): fu1 50/50, fu2 13/13, fu3 7/7, sc1 45/45, unit 27/27, database regression sab PASS, 36 browser script koi FAIL nahi.
- NOT VERIFIED: asli Supabase, asli phone.

## 11 Nov 2026 (der raat): RCT ke 8 qadam, lab form

- RCT ke qadam ab 8 (crown ke baghair): X-ray aur tashkhees, Sunn karna, Access opening, Working length, Canal ki safai aur shaping, Dawa rakhna + temporary filling, Canal bharai, Pakki filling / core build-up.
- Visit 1 mein bhi qadam par tick (Qadam 2 mein "Aaj kya kya hua"). Jo reh gaya wo visit 2 ke page par samne aata hai.
- Sab qadam tick hon to visit 2 ka page poochta hai "mukammal kar dun?".
- Lab form: mareez chunte hi us ka chalta crown / bridge / denture khud chun liya jata hai.
- Naya SQL nahi. Test (local): fu1 58/58, fu2 13/13, fu3 7/7, fu4 10/10, sc1 45/45, unit 27/27, 37 browser script koi FAIL nahi.

## 12 Nov 2026: profile ka naya naqsha, ilaaj ka apna page, denture, advance, PDF

- Profile: kul hisaab ki patti, har ilaaj ka chhota card (baqaya ke sath), "Checkup aur muaina" ka card. Qadam aur purani visits ki lambi list profile se hat gayi.
- Naya page `/admin/patients/<mareez>/treatment/<ilaaj>`: qadam, visits, har payment, invoice, prescription, lab, "Visit N shuru karein".
- Naya page `/admin/patients/<mareez>/checkups`: muaine ki visits, ilaaj ke link ke sath.
- Visit ke aakhir mein Invoice | Prescription | WhatsApp. Visit 2 ke baad khud ilaaj ke page par wapsi. "Rasid bhejein" wala popup visit se hat gaya.
- Advance: 2 ya zyada ilaaj hon to har ek ke aage alag dabba; raqam `collect_payment` se usi ilaaj ke bill par lagti hai.
- Denture: 6 hisse (Upper, Lower, Partial Upper Right/Left, Partial Lower Right/Left), phir type. Tooth panel se "Denture" hat gaya.
- Ilaaj chunna: group ke button, likh kar dhoondna, RCT daant ke hisab se (Anterior / Premolar / Molar).
- Price List: sirf missing cheez save hoti hai (khali qeemat ya bilkul naya kaam), sirf doctor/admin ke likhne par. Bhari qeemat kabhi nahi badalti.
- Invoice aur Prescription ke page par "PDF download karein" (html2canvas-pro + jspdf) aur "WhatsApp par bhejein" (mobile: share; laptop: mehfooz link).
- Naye packages: `html2canvas-pro`, `jspdf` (package.json aur package-lock.json zaroor sath jayen).
- Naya SQL nahi.
- Test (local): tp1 42/42, tp2 38/38, tp3 9/9, fu1 58/58, fu2 13/13, fu3 7/7, fu4 10/10, sc1 45/45, unit 27/27, database regression sab PASS.
- Lagu nahi rahe: p57 (purana continue link), p102 (purana partial denture group).
- NOT VERIFIED: asli Supabase, asli phone, mobile par PDF ka "Share", APK.

## 12 Nov 2026 (raat): milta julta naam, zyada chalne wale kaam

- "+ Treatment" mein naya naam likhne par agar list mein milta julta naam ho to sawal: "Haan: <list wala naam>" ya "Nahi, ye naya kaam hai" (`lib/similar.ts`).
- Upar ke button ab pichle 365 din ki visits ki ginti se (zyada se zyada 8), baqi jagah aam kaam se bharti hai.
- Test (local): tp4 16/16, unit 29/29, 39 browser script koi FAIL nahi.

## 13 Nov 2026: ilaaj ke card par Invoice | Prescription | WhatsApp

- Profile par har ilaaj ke card par (click kiye baghair) teen button. Yehi ilaaj ke page ke upar "Kaghzat" mein.
- Naya kaghaz `/admin/patients/<mareez>/treatment/<ilaaj>/invoice`: clinic ke template mein poore ilaaj ka invoice (ilaaj aur daant, qadam aur tareekhein, har visit, bill, Discount, har payment, kul mila, baqaya), PDF download aur WhatsApp ke sath.
- Prescription ka button sab se aakhri prescription kholta hai; ek se zyada hon to ginti aur purani ka link. Dawa na likhi ho to button nahi.
- WhatsApp: ilaaj ka khulasa (naya template `treatment_summary`).
- Naya SQL nahi. Test (local): tp5 39/39, unit 29/29, 40 browser script koi FAIL nahi.

## 13 Nov (B) — Delete har jagah se, aur prescription par aik QR

- Prescriptions, Invoices aur Billing ki list mein Recycle Bin wale mareez ab nahi dikhte.
- Billing list mein Rs. 0 wali lines nahi dikhti. Recycle Bin wale mareezon ke paise totals mein rehte hain (chhota note dikhta hai); hamesha ke liye hatane par totals se bhi nikal jate hain.
- Profile ka Delete: 2 raste — "Recycle Bin mein bhejein" (wapas aa sakta hai) ya "Hamesha ke liye hatayein" (sab record ke sath).
- Prescription par ab sirf aik QR chhapta hai: aam tor par "asli hai" wala; agar "QR code lagayein" dabayein to sirf mareez ke record wala.
- Naya SQL: koi nahi. Jaanch: hamesha ke liye hatane ke baad kisi table mein us mareez ki koi line nahi bachi (local test DB).
- Tests (sirf local test DB): del1 20/20 + 390px 5/5, qr1 2/2, p93, tp5 39/39, tp3 9/9, unit 29/29. Asli Supabase / phone par NOT VERIFIED.
- Files: app/admin/prescriptions/page.tsx, app/admin/invoices/page.tsx, app/admin/billing/page.tsx, components/admin/DeletePatientButton.tsx, components/print/RxPrint.tsx

## 13 Nov (C) — "Do doctor wala" template, dono aik sath, aik QR

- Naya template "Do doctor wala (sada)": upar clinic ka naam; baayein aur daayein doctor (naam, degree, ohda), har ek ke neeche chhota naam aur number; beech mein pata aur timing; phir Ref / Date, mareez (naam, umar, MR, phone, pata); neeche dono doctors ke naam. Invoice aur prescription dono par.
- Settings → Print → "Do doctor wala template": dono doctors, chhote naam, number, pata, timing. Khali khana nahi chhapta. Baayan doctor khali ho to software ka purana doctor ka naam aata hai.
- Har template (naya aur purane) ke sath "Kya chhape": sirf Prescription / sirf Invoice / dono aik sath. Dono aik sath mein header aik hi dafa aata hai.
- Lamba ho to software likhai chhoti kar ke aik safhe mein samata hai (60% tak); us se bhi zyada ho to doosra safha.
- Bill par "Received sum of rupees ... only" lafzon mein (naye template aur "aik sath" wale hisse mein).
- Prescription par sirf aik QR: "asli hai" (tasdeeq) wala, ab kaghaz ke andar chhapta hai. "QR code lagayein" wala button prescription se hata diya.
- Visit ke bill ke page par naya button: "Invoice + Prescription aik sath".
- Naya SQL: koi nahi (settings purani jagah site_settings / print_layout mein).
- Tests (sirf local test DB): duo1 81/81, duo3 18/18 (lamba / aik safha), PDF laptop + 390px dekha, qr1 6/6, del1 24/24, tp1 42/42, tp3 9/9, tp5 39/39, unit 33/33. Asli Supabase / phone / asli printer par NOT VERIFIED.
- Had: bill ke page se "aik sath" mein sirf wahi aik invoice aata hai; prescription ke page se us visit ke sab invoice mil kar aate hain. Bill ke purane templates ka apna QR (hisaab wala) nahi chhera.

## 14 Nov — Denture / Bridge ka sada rasta

- Purana dabba (6 hisse aur har hisse par saari qismein) hata diya.
- Ab: "Denture ya Bridge lagana hai?" sirf 2 button.
  - Denture: Upper / Lower, phir qismein (Price List se), qism dabayi to bill ki line. Daant chunne ki zarurat nahi.
  - Bridge: chart par daant dabayein, phir qism; EK line, qeemat = fi daant qeemat x daanton ki ginti.
  - "+ Nayi qism": naam aur qeemat; visit khatam hone par Price List mein khud save (sirf owner ke login se). Milta julta naam ho to pehle poochta hai. Naam mein "Denture" / "Bridge" na ho to khud jor deta hai.
- Daant wale purane panel se "Bridge" ka button hata diya (ab aik hi rasta).
- Qadam 4 ki ghalat likhai ("joreinquot;") theek.
- Naya SQL: koi nahi.
- Tests (sirf local test DB): gb1 42/42, tp1 42/42, tp2 38/38, tp3 9/9, tp4 18/18, tp5 39/39, fu1 58/58, fu2 13/13, fu3 7/7, fu4 10/10, sc1 45/45, duo1 81/81, del1 24/24, qr1 6/6, unit 33/33. Asli Supabase / phone par NOT VERIFIED.
- Abhi baqi (PNG diya ja chuka, banana baqi): qadam 2 ke 5 bare button aur chart sirf zarurat par, qadam 1 sada, qadam 4 ki tarteeb, lab ki yaad-dahani.

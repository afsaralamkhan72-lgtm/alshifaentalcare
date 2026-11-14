const L=require('./lib2.js');const fs=require('fs');
const res=[];const ok=(n,c,x='')=>{res.push(c);console.log((c?'PASS':'FAIL')+' | '+n+(x!==''?' | '+x:''))};
const B='http://localhost:3055';
(async()=>{for(const w of [1280,390]){const r=await L.open(w);const p=r.p;console.log('== width',w);
 const ov=async()=>!(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth));
 const sfx=Date.now().toString().slice(-5);
 const pid=await L.newPatient(p,'Dc '+sfx,'0326'+String(Date.now()).slice(-7));
 await p.goto(B+'/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
 await L.addCard(p,{teeth:['Upper Right Central Incisor'],dx:'Pulpitis',quick:/root canal|rct/i});
 await p.getByTestId('v1-stage').nth(0).locator('input').check();await p.getByTestId('v1-stage').nth(1).locator('input').check();
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(700);
 await p.getByRole('button',{name:'Haan',exact:true}).click();await p.waitForTimeout(400);
 const rq=p.getByPlaceholder(/Dawa talash karein/);await rq.fill('Testmed Ek '+sfx);await p.waitForTimeout(400);await p.getByRole('button',{name:/list se bahar/}).click();await p.waitForTimeout(400);
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
 const f=p.locator('text=Aaj kitne mile').first();if(await f.count())await f.locator('xpath=following::input[1]').fill('300');
 await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(4500);
 ok('Visit 1 ke baad Invoice | Prescription | WhatsApp',await p.getByTestId('done-invoice').count()===1&&await p.getByTestId('done-rx').count()===1&&await p.getByTestId('visit-wa').count()===1);
 const tid=L.q("select id from patient_treatments where patient_id='"+pid+"'");
 await p.goto(B+'/admin/patients/'+pid+'/visit/'+tid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 await p.getByTestId('fu-stage').nth(2).locator('input').check();await p.getByTestId('fu-paid').fill('500');
 const d=new Date(Date.now()+6*864e5).toISOString().slice(0,10);await p.getByTestId('fu-next-date').fill(d);
 await p.getByTestId('fu-rx-open').click();await p.getByPlaceholder('Dawa ka naam likhein').fill('Testmed Do '+sfx);await p.getByRole('button',{name:'Jorein'}).last().click();await p.waitForTimeout(300);
 await p.getByTestId('fu-finish').click();await p.waitForSelector('[data-testid=visit-done-banner]',{timeout:25000});await p.waitForTimeout(1000);
 ok('Ilaaj ke page par upar "Kaghzat" ke 3 button',await p.getByTestId('tp-docs').getByTestId('card-invoice').count()===1&&await p.getByTestId('tp-docs').getByTestId('card-rx').count()===1&&await p.getByTestId('tp-docs').getByTestId('card-wa').count()===1);
 // PROFILE: buttons on the card without opening it
 await p.goto(B+'/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 const box=p.getByTestId('work-card').first();
 ok('Profile ke card par hi Invoice button',await box.getByTestId('work-invoice').count()===1);
 ok('Profile ke card par Prescription (2)',(await p.getByTestId('vg-rx').innerText().catch(()=>'')).trim()==='Prescription');
 ok('Profile ke card par WhatsApp button',await box.getByTestId('work-wa').count()===1);
 const wa=decodeURIComponent(await box.getByTestId('work-wa').getAttribute('href'));
 const balT=Number(L.q("select balance::int from treatment_balances where treatment_id='"+tid+"'"));
 ok('WhatsApp khulasa: ilaaj, qadam, bill, mila 800, baqaya, agli tareekh',/Root Canal/.test(wa)&&/Access opening/.test(wa)&&/موصول: Rs\. 800/.test(wa)&&wa.includes('بقایا: Rs. '+balT.toLocaleString('en-US'))&&/اگلی ملاقات/.test(wa),wa.replace(/\n/g,' ').slice(0,230));
 ok('Profile overflow nahi',await ov());
 await p.screenshot({path:'/tmp/prst/tp5_profile_'+w+'.png',fullPage:true});
 // invoice
 await box.getByTestId('work-invoice').click();await p.waitForURL(/\/invoice$/,{timeout:15000});await p.waitForTimeout(1500);
 const txt=await p.locator('#print-sheet').innerText();
 ok('Invoice: clinic ka naam, mareez, ilaaj aur daant',/Al Shifa/i.test(txt)&&txt.includes('Dc '+sfx)&&/Root Canal/.test(txt)&&/Upper Right Central Incisor/.test(txt));
 ok('Invoice: 8 qadam, 3 ki tareekh, baqi "baqi"',await p.getByTestId('ti-stages').locator('tr').count()===8&&(await p.getByTestId('ti-stages').innerText()).split('baqi').length-1===5);
 ok('Invoice: 2 visit kya hua ke sath',await p.getByTestId('ti-visits').locator('tbody tr').count()===2&&/Access opening/.test(await p.getByTestId('ti-visits').innerText()));
 ok('Invoice: 2 payment tareekh aur tareeqe ke sath',await p.getByTestId('ti-pay').count()===2&&/Cash/.test(await p.getByTestId('ti-pays').innerText()));
 const tot=(await p.getByTestId('ti-totals').innerText()).replace(/\n/g,' ');
 ok('Invoice: kul bill, kul mila 800, baqaya',/Kul mila\s*Rs\. 800/.test(tot)&&tot.includes('Baqaya Rs. '+balT.toLocaleString('en-US')),tot);
 ok('Invoice overflow nahi',await ov());
 await p.screenshot({path:'/tmp/prst/tp5_inv_'+w+'.png',fullPage:true});
 if(w===1280){const [dl]=await Promise.all([p.waitForEvent('download',{timeout:60000}),p.getByTestId('doc-pdf').click()]);const path='/tmp/prst/dl_tinv.pdf';await dl.saveAs(path);const b=fs.readFileSync(path);
  ok('Invoice: PDF download',b.slice(0,5).toString()==='%PDF-'&&b.length>8000,dl.suggestedFilename()+' '+b.length)}
 ok('Invoice: WhatsApp ka button',await p.getByTestId('doc-wa').count()===1);
 // prescription
 await p.goto(B+'/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 await p.getByTestId('vg-rx').click();await p.waitForURL(/\/prescriptions\/.*\/print/,{timeout:15000});await p.waitForTimeout(2000);
 const rtxt=await p.locator('body').innerText();
 ok('Prescription: sab se aakhri wali khuli',rtxt.includes('Testmed Do '+sfx)&&!rtxt.includes('Testmed Ek '+sfx));
 ok('Prescription: purani ka link',await p.getByTestId('rx-others').locator('a').count()===1);
 ok('Prescription: PDF download aur WhatsApp ke button',await p.getByTestId('doc-pdf').count()===1&&await p.getByTestId('doc-wa').count()===1);
 await p.getByTestId('rx-others').locator('a').first().click();await p.waitForTimeout(2000);
 ok('Purani prescription khulti hai',(await p.locator('body').innerText()).includes('Testmed Ek '+sfx));
 // no rx -> no button
 const p2=await L.newPatient(p,'Dn '+sfx,'0327'+String(Date.now()).slice(-7));
 await L.visit(p,p2,{newTx:['Braces (Metal) - Upper',35000],pay:5000});
 await p.goto(B+'/admin/patients/'+p2,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 ok('Dawa nahi likhi to Prescription ka button nahi',await p.getByTestId('vg-rx').count()===0&&await p.getByTestId('work-invoice').count()===1);
 await r.b.close()}
 console.log('TOTAL '+res.length+' | FAIL '+res.filter(x=>!x).length);process.exit(0)})().catch(e=>{console.log('CRASH',e.message.slice(0,500));console.log('TOTAL so far '+res.length+' FAIL '+res.filter(x=>!x).length);process.exit(1)});

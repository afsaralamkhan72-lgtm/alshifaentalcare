const L=require('./lib2.js');const R=require('./roles.js');
const res=[];const ok=(n,c,x='')=>{res.push(c);console.log((c?'PASS':'FAIL')+' | '+n+(x!==''?' | '+x:''))};
const B='http://localhost:3055';
(async()=>{const r=await L.open(1280);const p=r.p;const sfx=Date.now().toString().slice(-5);
 // A. Amalgam filling: visit 1 material tick (step 4)
 const pid=await L.newPatient(p,'Fm '+sfx,'0320'+String(Date.now()).slice(-7));
 const q0=Number(L.q("select quantity from inventory where item_name='Composite Syringe'"));
 await p.goto(B+'/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
 await L.addCard(p,{teeth:['Lower Left First Molar'],dx:'Caries',pick:{label:'Amalgam Filling'}});
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(500);await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(500);
 ok('Visit 1: jura hua material tick ke sath',await p.getByTestId('mat-item').count()===2,await p.getByTestId('extras').innerText().then(t=>t.replace(/\n/g,' ').slice(0,160)));
 const an=p.getByTestId('mat-item').filter({hasText:'Anaesthesia'}).locator('input[type=checkbox]');await an.uncheck();
 const f=p.locator('text=Aaj kitne mile').first();if(await f.count())await f.locator('xpath=following::input[1]').fill('0');
 await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(4000);
 ok('Visit 1: tick wala stock se kata, bina tick nahi',Number(L.q("select quantity from inventory where item_name='Composite Syringe'"))===q0-1&&L.q("select count(*) from inventory_movements where patient_id='"+pid+"'")==='1',L.q("select i.item_name,m.qty_change from inventory_movements m join inventory i on i.id=m.inventory_id where m.patient_id='"+pid+"'"));
 const tid=L.q("select id from patient_treatments where patient_id='"+pid+"'");
 // B. follow-up: linked material tick
 await p.goto(B+'/admin/patients/'+pid+'/visit/'+tid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 ok('Visit 2: jura hua material dikhta hai',await p.getByTestId('fu-mat').count()===2);
 await p.getByTestId('fu-mat').filter({hasText:'Composite'}).locator('input[type=checkbox]').check();
 await p.getByTestId('fu-note').fill('Polish');
 ok('Visit 2: baqaya ho to payment ka dabba',await p.getByTestId('fu-pay').count()===1);
 await p.getByTestId('fu-finish').click();await p.waitForSelector('[data-testid=visit-done-banner]',{timeout:25000});
 ok('Visit 2: tick wala material kata',Number(L.q("select quantity from inventory where item_name='Composite Syringe'"))===q0-2);
 ok('Visit 2: note save hua',L.q("select notes from visit_notes where treatment_id='"+tid+"' and visit_no=2")==='Polish');
 // C. draft block
 await p.goto(B+'/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 const cl=p.getByRole('button',{name:/Baad mein/});if(await cl.count())await cl.first().click().catch(()=>{});
 await p.getByRole('button',{name:/Aaj dobara naya visit|Naya visit shuru/}).first().click();await p.waitForTimeout(1200);
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
 await L.addCard(p,{teeth:['Upper Left First Molar'],dx:'Caries',pick:{label:'Amalgam Filling'}});
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(2500);
 await p.goto(B+'/admin/patients/'+pid+'/visit/'+tid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 ok('Adhoori visit khuli ho to rok deta hai',await p.getByTestId('fu-draft-block').count()===1,L.q("select status, draft_extra is not null from clinical_visits where patient_id='"+pid+"' order by created_at desc limit 1"));
 // D. ortho monthly
 const po=await L.newPatient(p,'Fo '+sfx,'0321'+String(Date.now()).slice(-7));
 await L.visit(p,po,{newTx:['Braces (Metal) - Upper',35000],pay:5000});
 const to=L.q("select id from patient_treatments where patient_id='"+po+"'");
 await p.goto(B+'/admin/patients/'+po+'/visit/'+to,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 const nd=await p.getByTestId('fu-next-date').inputValue();
 const t=new Date();const exp=new Date(t.getFullYear(),t.getMonth()+1,1);
 ok('Ortho: agli tareekh khud agle mahine ki',nd.slice(0,7)===exp.getFullYear()+'-'+String(exp.getMonth()+1).padStart(2,'0'),nd);
 ok('Ortho: 5 qadam visit 1 se bane hue',await p.getByTestId('fu-stage').count()===5);
 await p.getByTestId('fu-stage').nth(2).locator('input').check();await p.getByTestId('fu-paid').fill('3000');
 await p.getByTestId('fu-finish').click();await p.waitForSelector('[data-testid=visit-done-banner]',{timeout:25000});
 ok('Ortho: qist 3000 lagi, appointment bani',Number(L.q("select paid from treatment_balances where treatment_id='"+to+"'"))===8000&&L.q("select count(*) from appointments where patient_id='"+po+"' and treatment_id='"+to+"'")==='1',L.q("select paid,balance from treatment_balances where treatment_id='"+to+"'"));
 await p.goto(B+'/admin/patients/'+po+'/treatment/'+to,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 ok('Ilaaj ke page par wahi qadam (ek hi list)',/Mahana adjustment/.test(await p.locator('body').innerText()));
 await r.b.close();
 // E. permissions
 const rr=await R.open('recep');await rr.p.goto(B+'/admin/patients/'+po+'/visit/'+to,{waitUntil:'domcontentloaded'});await rr.p.waitForTimeout(1500);
 ok('Receptionist ye page nahi khol sakti',!rr.p.url().includes('/visit/')&&await rr.p.getByTestId('fu-page').count()===0,rr.p.url().replace(B,''));await rr.b.close();
 const rd=await R.open('doctor');await rd.p.goto(B+'/admin/patients/'+pid+'/visit/'+to,{waitUntil:'domcontentloaded'});await rd.p.waitForTimeout(1500);
 ok('Doosre mareez ka ilaaj is pate par nahi khulta',await rd.p.getByTestId('fu-page').count()===0);await rd.b.close();
 console.log('TOTAL '+res.length+' | FAIL '+res.filter(x=>!x).length);process.exit(0)})().catch(e=>{console.log('CRASH',e.message.slice(0,500));console.log('TOTAL so far '+res.length+' FAIL '+res.filter(x=>!x).length);process.exit(1)});

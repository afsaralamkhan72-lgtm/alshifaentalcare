const L=require('./lib2.js');const R=require('./roles.js');
const res=[];const ok=(n,c,x='')=>{res.push([n,c]);console.log((c?'PASS':'FAIL')+' | '+n+(x?' | '+x:''))};
const B='http://localhost:3055';
const startVisit=async(p,pid)=>{await p.goto(B+'/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 const again=p.getByRole('button',{name:/Aaj dobara naya visit/});if(await again.count()){await again.click();await p.waitForTimeout(1500)}
 else{const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}else if(!(await p.getByRole('button',{name:'Agla →'}).count()))return false}
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);return true};
const finish=async(p,pay,nextDays)=>{await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
 if(nextDays){const d=new Date(Date.now()+nextDays*864e5).toISOString().slice(0,10);await p.locator('input[type=date]').last().fill(d);await p.waitForTimeout(300);const sel=p.locator('select').filter({has:p.locator('option',{hasText:/root canal/i})}).last();if(await sel.count()){const v=await sel.locator('option',{hasText:/root canal/i}).first().getAttribute('value');await sel.selectOption(v);await p.waitForTimeout(200)}}
 const f=p.locator('text=Aaj kitne mile').first();if(await f.count())await f.locator('xpath=following::input[1]').fill(String(pay));
 await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(3500);
 return await p.evaluate(()=>document.body.innerText.includes('Aaj ka visit mukammal ho gaya'))};
(async()=>{
 const sfx=Date.now().toString().slice(-5);
 // A. receptionist
 let r=await R.open('recep');let p=r.p;
 const pid=await L.newPatient(p,'Sc Rct '+sfx,'0313'+String(Date.now()).slice(-7));
 ok('Recep: patient register',/^[0-9a-f-]{36}$/.test(pid));
 await p.goto(B+'/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 ok('Recep: visit shuru button nahi dikhta',await p.getByRole('button',{name:/Naya visit shuru/}).count()===0);
 for(const u of ['/admin/payroll','/admin/staff','/admin/reports','/admin/expenses','/admin/settings']){await p.goto(B+u,{waitUntil:'domcontentloaded'});await p.waitForTimeout(900);
  ok('Recep: '+u+' band',/denied|dashboard|login/.test(p.url())&&!p.url().endsWith(u),p.url().replace(B,''))}
 await r.b.close();
 // B. doctor RCT 2 visits
 r=await R.open('doctor');p=r.p;
 ok('Doctor: recep ke mareez par visit shuru',await startVisit(p,pid));
 await L.addCard(p,{teeth:['Lower Right First Molar'],dx:'Pulpitis',quick:/root canal|rct/i});
 ok('Doctor RCT visit 1 mukammal',await finish(p,300,7));
 const wa=decodeURIComponent(await p.getByTestId('visit-wa').getAttribute('href').catch(()=>'')||'');
 ok('WhatsApp khulasa: kaam + agli tareekh',/آج کا کام/.test(wa)&&/اگلی ملاقات/.test(wa)&&/آج موصول: Rs\. 300/.test(wa));
 await p.goto(B+'/admin/appointments?view=upcoming',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2000);
 const row=p.locator('li,div').filter({hasText:'Sc Rct '+sfx}).last();
 ok('Appointment bani (agle din ki list)',await p.getByText('Sc Rct '+sfx).count()>0);
 ok('Appointment par "visit 2" likha',/visit 2/.test(await p.locator('body').innerText().then(t=>t.split('Sc Rct '+sfx)[1]?.slice(0,200)||'')));
 const tidR=L.q("select id from patient_treatments where patient_id='"+pid+"' and name ilike '%root canal%'");
 await p.goto(B+'/admin/patients/'+pid+'/treatment/'+tidR,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 await p.getByTestId('next-visit').first().click();await p.waitForURL(/\/visit\//,{timeout:15000});await p.waitForTimeout(1500);
 ok('Doctor: visit 2 alag page par khuli',await p.getByTestId('fu-page').count()===1&&(await p.getByTestId('fu-visit-no').innerText()).trim()==='Visit 2');
 await p.getByTestId('fu-stage').nth(0).locator('input').check();await p.getByTestId('fu-stage').nth(1).locator('input').check();
 await p.getByTestId('fu-complete').check();
 await p.getByTestId('fu-finish').click();await p.waitForSelector('[data-testid=visit-done-banner]',{timeout:25000});
 ok('Qadam: 2/8 ho gaye',L.q("select count(*) from treatment_stages where treatment_id='"+tidR+"' and done_on is not null")==='2');
 ok('Doctor RCT visit 2 mukammal',true);
 ok('DB: RCT completed',L.q("select status from patient_treatments where patient_id='"+pid+"' and name ilike '%root canal%'")==='completed');
 await p.goto(B+'/admin/dashboard',{waitUntil:'domcontentloaded'});await p.waitForTimeout(3500);
 ok('Dashboard: crown baqi card mein mareez',(await p.getByTestId('crown-pending').innerText().catch(()=>'')).includes('Sc Rct '+sfx));
 // C. bridge
 const pb=await L.newPatient(p,'Sc Bridge '+sfx,'0314'+String(Date.now()).slice(-7));await startVisit(p,pb);
 await L.addGroup(p,{kind:'bridge',teeth:['Upper Right First Premolar','Upper Right Second Premolar','Upper Right First Molar'],mode:'each'});
 ok('Bridge: ek group card',await p.getByTestId('group-card').count()===1);
 ok('Bridge visit mukammal',await finish(p,1000));
 ok('DB: bridge ek treatment 3 daant',L.q("select count(*)||'/'||max(array_length(teeth,1)) from patient_treatments where patient_id='"+pb+"'")==='1/3',L.q("select name,teeth,price from patient_treatments where patient_id='"+pb+"'"));
 // D. complete denture
 const pd=await L.newPatient(p,'Sc Denture '+sfx,'0315'+String(Date.now()).slice(-7));await startVisit(p,pd);
 await L.addGroup(p,{kind:'denture',complete:true});
 ok('Complete denture visit mukammal',await finish(p,5000),L.q("select name,price from patient_treatments where patient_id='"+pd+"'"));
 // E. ortho
 const po=await L.newPatient(p,'Sc Ortho '+sfx,'0316'+String(Date.now()).slice(-7));
 ok('Ortho (braces) visit mukammal',await L.visit(p,po,{newTx:['Braces (Metal) - Upper',35000],pay:5000}),L.q("select name,status,price from patient_treatments where patient_id='"+po+"'"));
 // F. homeo
 await p.goto(B+'/admin/patients',{waitUntil:'networkidle'});await p.getByRole('button',{name:'+ Naya Patient'}).click();await p.waitForTimeout(400);
 await p.getByPlaceholder('Patient ka poora naam').fill('Sc Homeo '+sfx);await p.getByPlaceholder('03XX-XXXXXXX').fill('0317'+String(Date.now()).slice(-7));
 await p.locator('button:has-text("Homeopathic")').first().click();await p.getByRole('button',{name:'Patient save karein'}).click();await p.waitForURL(/patients\/[0-9a-f-]{36}/,{timeout:15000});await p.waitForTimeout(1500);
 const ph=p.url().split('/').pop();
 ok('Homeopathic visit mukammal',await L.visit(p,ph,{newTx:['Homeo Consult',500],pay:'full'}));
 await r.b.close();
 // G. money invariants
 for(const [n,id] of [['RCT',pid],['Bridge',pb],['Denture',pd],['Ortho',po],['Homeo',ph]]){
  const v=L.q("select coalesce((select sum(total) from invoices where patient_id='"+id+"' and status<>'void'),0)||' | '||coalesce((select sum(paid_amount) from invoices where patient_id='"+id+"' and status<>'void'),0)||' | '||coalesce((select balance from patient_balances where patient_id='"+id+"'),0)");
  const [t,pd2,bal]=v.split(' | ').map(Number);ok('Hisab '+n+': bill - payment = baqaya',Math.abs(t-pd2-bal)<0.01,v)}
 // H. recep collects payment through API on ortho invoice
 const inv=L.q("select id from invoices where patient_id='"+po+"' and status<>'void' order by created_at limit 1");
 const c1=await R.api('recep','rpc/collect_payment',{body:{p_invoice_id:inv,p_amount:1000,p_method:'cash',p_key:'sc-'+sfx}});
 ok('Recep (billing.collect) payment le sakti hai',c1.s===200,c1.t.slice(0,80));
 const c2=await R.api('noperm','rpc/collect_payment',{body:{p_invoice_id:inv,p_amount:1000,p_method:'cash',p_key:'sc2-'+sfx}});
 ok('Bina ijazat staff payment nahi le sakta',c2.s!==200,c2.t.slice(0,80));
 const c3=await R.api('recep','rpc/collect_payment',{body:{p_invoice_id:inv,p_amount:1000,p_method:'cash',p_key:'sc-'+sfx}});
 ok('Double-click: wahi payment dobara nahi banti',L.q("select count(*) from payments where patient_id='"+po+"' and amount=1000")==='1',c3.s+'');
 const c4=await R.api('recep','rpc/collect_payment',{body:{p_invoice_id:inv,p_amount:9999999,p_method:'cash',p_key:'sc4-'+sfx}});
 ok('Baqaya se zyada payment band',c4.s!==200,c4.t.slice(0,80));
 // I. noperm UI
 r=await R.open('noperm');p=r.p;await p.goto(B+'/admin/patients',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1200);
 ok('Bina ijazat staff: patients page band',!p.url().endsWith('/admin/patients'),p.url().replace(B,''));await r.b.close();
 // J. admin pages
 r=await R.open('admin');p=r.p;const errs=[];p.on('pageerror',e=>errs.push(e.message));
 for(const u of ['/admin/dashboard','/admin/payroll','/admin/loyalty','/admin/lab','/admin/appointments','/admin/inventory','/admin/reports','/admin/dues','/admin/staff','/admin/settings','/admin/recycle-bin']){
  const rs=await p.goto(B+u,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1500);
  const bad=await p.evaluate(()=>/Application error|500|Something went wrong/i.test(document.title+document.body.innerText.slice(0,300)));
  ok('Admin: '+u+' khulta hai',rs.status()<400&&!bad&&p.url().endsWith(u),rs.status()+'')}
 ok('Admin pages: koi JS error nahi',errs.length===0,errs.join(';').slice(0,150));
 await r.b.close();
 const f=res.filter(x=>!x[1]).length;console.log('\nTOTAL '+res.length+' | PASS '+(res.length-f)+' | FAIL '+f);process.exit(0)
})().catch(e=>{console.log('CRASH',e.message.slice(0,500));const f=res.filter(x=>!x[1]).length;console.log('TOTAL so far '+res.length+' FAIL '+f);process.exit(1)});

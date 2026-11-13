const L=require('./lib2.js');let pass=0,fail=0;const ok=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(x?' | '+x:''))};
const B='http://localhost:3055';const S='/tmp/prst/shots/';
(async()=>{const r=await L.open(1280);const p=r.p;
const tag=Date.now().toString().slice(-5);
// ---- Settings
const before=L.q("select value::text from site_settings where key='print_layout'");
await p.goto(B+'/admin/settings?s=print',{waitUntil:'networkidle'});await p.waitForTimeout(1200);
ok('settings: naya hissa hai',await p.getByTestId('duo-settings').count()===1);
const F={'duo-left-name':'Dr. Test Baayan','duo-left-degree':'B.D.S. (Test)','duo-left-title':'Dental Surgeon (Test)','duo-left-sub':'Test Madadgar Aik','duo-left-phone':'0300-0000001',
 'duo-right-name':'Dr. Test Daayan','duo-right-degree':'D.H.M.S. (Test)','duo-right-title':'Homeopathic Physician (Test)','duo-right-sub':'Test Madadgar Do','duo-right-phone':'0300-0000002',
 'duo-address':'Test Road 12, Test Town, Karachi','duo-timings':'Test: 10 AM - 5 PM, Sunday band'};
for(const k in F)await p.getByTestId(k).fill(F[k]);
await p.getByTestId('layout-save').click();await p.waitForTimeout(2000);
const saved=L.q("select value->'duo'->'right'->>'name', value->'duo'->'left'->>'sub_phone', value->'duo'->>'timings' from site_settings where key='print_layout'");
ok('settings mehfooz hui',saved.includes('Dr. Test Daayan')&&saved.includes('0300-0000001'),saved);
// ---- data
const name='Duo Mareez '+tag;
const pid=await L.newPatient(p,name,'0314'+String(Date.now()).slice(-7));
L.q(`update patients set age=34, gender='female', address='Makan 5, Gali 3, Test Colony, Karachi' where id='${pid}'`);
ok('visit bana',await L.visit(p,pid,{newTx:['RCT',15000],pay:5000}));
const cv=L.q(`select id from clinical_visits where patient_id='${pid}' order by created_at desc limit 1`);
const items=JSON.stringify([{name_en:'Amoxicillin 500mg',dosage:'1 cap',frequency:'Din mein 3 baar',duration:'5 din',instructions:'Khane ke baad'},{name_en:'Ibuprofen 400mg',dosage:'1 tab',frequency:'Din mein 2 baar',duration:'3 din'},{name_en:'Chlorhexidine Mouthwash',dosage:'10 ml',frequency:'Din mein 2 baar',duration:'7 din'}]).replace(/"/g,'\\"');
L.q(`insert into prescriptions(patient_id,department,items,prescribed_date,clinical_visit_id,notes_en) values('${pid}','dental','${items}'::jsonb,current_date,'${cv}','Thanda garam se parhez karein.')`);
const rx=L.q(`select id from prescriptions where patient_id='${pid}' limit 1`);
const inv=L.q(`select id from invoices where patient_id='${pid}' limit 1`);
console.log('rx',rx,'inv',inv,'cv',cv);
const shot=async(id,f)=>{await p.waitForTimeout(900);await p.locator('#'+id).screenshot({path:S+f})};
const pages=async()=>{const buf=await p.pdf({format:'A4',preferCSSPageSize:true});return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length};
const qrs=async(id)=>({v:await p.locator('#'+id+' img[alt="Verify QR"]').count(),o:await p.locator('#'+id+' img[alt="QR"]').count(),outside:await p.locator('img[alt="Verify QR"]').count()});
// ---- Prescription page
await p.goto(B+'/admin/prescriptions/'+rx+'/print',{waitUntil:'networkidle'});await p.waitForTimeout(1500);
ok('rx: QR lagane ka button hat gaya',await p.getByRole('button',{name:/QR code lagayein/}).count()===0);
let q=await qrs('print-sheet');ok('rx purana template: kaghaz par sirf 1 QR (tasdeeq)',q.v===1&&q.o===0&&q.outside===1,JSON.stringify(q));
const tplSel=p.locator('label:has-text("Template") select').first();
const opts=await tplSel.locator('option').allInnerTexts();ok('rx: naya template list mein',opts.some(o=>o.includes('Do doctor')),opts.join(' / '));
await tplSel.selectOption('duo');await p.waitForTimeout(1200);
const txt=async(id)=>p.locator('#'+id).innerText();
let t=await txt('print-sheet');
ok('duo rx: dono doctor',t.includes('Dr. Test Baayan')&&t.includes('Dr. Test Daayan'));
ok('duo rx: chhota naam + number dono taraf',t.includes('Test Madadgar Aik')&&t.includes('0300-0000001')&&t.includes('Test Madadgar Do')&&t.includes('0300-0000002'));
ok('duo rx: beech mein pata + timing',(await p.getByTestId('duo-center').innerText()).includes('Test Road 12')&&(await p.getByTestId('duo-center').innerText()).includes('Sunday band'));
const pt=await p.getByTestId('duo-patient').innerText();
ok('duo rx: mareez naam, umar, pata',pt.toLowerCase().includes(name.toLowerCase())&&pt.includes('34')&&pt.includes('Test Colony'),pt.replace(/\n/g,' ; '));
ok('duo rx: dawa hai, bill nahi',t.includes('Amoxicillin')&&await p.getByTestId('bill-body').count()===0);
ok('duo rx: neeche doctors ke naam',(await p.getByTestId('duo-foot-left').innerText()).includes('Dr. Test Baayan')&&(await p.getByTestId('duo-foot-right').innerText()).includes('Dr. Test Daayan'));
q=await qrs('print-sheet');ok('duo rx: sirf 1 QR',q.v===1&&q.o===0&&q.outside===1,JSON.stringify(q));
// position check: left doc left of center left of right doc; sub under doc
const bx=async(tid)=>p.getByTestId(tid).boundingBox();
const [dl,dc,dr,sl,sr]=[await bx('duo-doc-left'),await bx('duo-center'),await bx('duo-doc-right'),await bx('duo-sub-left'),await bx('duo-sub-right')];
ok('duo: tarteeb baayan | beech | daayan',dl.x<dc.x&&dc.x<dr.x&&Math.abs(dl.y-dr.y)<3);
ok('duo: chhota naam doctor ke neeche',sl.y>dl.y&&sr.y>dr.y&&sl.x<dc.x&&sr.x>dc.x);
await shot('print-sheet','1-rx-duo.png');
ok('duo rx: 1 safha',await pages()===1);
await p.getByTestId('print-what').selectOption('both');await p.waitForTimeout(1200);
t=await txt('print-sheet');
ok('duo dono: dawa + bill aik kaghaz par',t.includes('Amoxicillin')&&t.includes('RCT')&&t.includes('15,000'));
ok('duo dono: Received lafzon mein',(await p.getByTestId('bill-words').innerText()).includes('Five Thousand'),await p.getByTestId('bill-words').innerText());
ok('duo dono: header sirf 1 dafa',await p.getByTestId('duo-clinic').count()===1);
q=await qrs('print-sheet');ok('duo dono: sirf 1 QR',q.v===1&&q.o===0&&q.outside===1,JSON.stringify(q));
await shot('print-sheet','2-both-duo.png');
ok('duo dono: 1 safha',await pages()===1);
// old templates combined
for(const id of ['soft','classic','pad_red','pad_bw']){
 await tplSel.selectOption(id);await p.waitForTimeout(1300);
 t=await txt('print-sheet');q=await qrs('print-sheet');
 ok('rx '+id+' dono: dawa + bill',t.includes('Amoxicillin')&&t.includes('15,000')&&await p.locator('#print-sheet [data-testid=bill-body]').count()===1);
 ok('rx '+id+' dono: sirf 1 QR kaghaz par',q.v===1&&q.o===0&&q.outside===1,JSON.stringify(q));
 ok('rx '+id+' dono: id aik hi',await p.locator('[id="print-sheet"]').count()===1);
 const n=await pages();ok('rx '+id+' dono: 1 safha',n===1,'pages='+n+' fit='+await p.getByTestId('fit-wrap').getAttribute('data-fit'));
 await shot('print-sheet','3-both-rx-'+id+'.png');
 await p.getByTestId('print-what').selectOption('rx');await p.waitForTimeout(900);
 ok('rx '+id+' sirf rx: bill nahi, id aik',await p.locator('#print-sheet [data-testid=bill-body]').count()===0&&await p.locator('[id="print-sheet"]').count()===1);
 q=await qrs('print-sheet');ok('rx '+id+' sirf rx: 1 QR',q.v===1&&q.o===0,JSON.stringify(q));
 if(id==='soft')await shot('print-sheet','4-rx-soft-single.png');
 await p.getByTestId('print-what').selectOption('both');await p.waitForTimeout(600);
}
// Sirf Invoice -> invoice page
await tplSel.selectOption('duo');await p.waitForTimeout(600);
await Promise.all([p.waitForURL(/\/admin\/invoices\//,{timeout:15000}),p.getByTestId('print-what').selectOption('bill')]);await p.waitForTimeout(1800);
ok('Sirf Invoice: bill ke page par gaya, duo chuna hua',p.url().includes('/admin/invoices/'+inv)&&await p.getByTestId('bill-tpl').inputValue()==='duo',p.url());
// ---- Invoice page
t=await txt('invoice-sheet');
ok('duo bill: doctors, mareez, pata',t.includes('Dr. Test Baayan')&&t.includes('Dr. Test Daayan')&&t.includes('Test Colony'));
ok('duo bill: kaam, total, lafz',t.includes('RCT')&&t.includes('15,000')&&t.includes('Five Thousand only'));
ok('duo bill: dawa nahi',!t.includes('Amoxicillin'));
q=await qrs('invoice-sheet');ok('duo bill: 1 QR',q.v===1&&q.outside===1,JSON.stringify(q));
await shot('invoice-sheet','5-bill-duo.png');
ok('duo bill: 1 safha',await pages()===1);
await p.getByTestId('print-what').selectOption('both');await p.waitForTimeout(1200);
t=await txt('invoice-sheet');ok('bill page duo dono: dawa + bill',t.includes('Amoxicillin')&&t.includes('15,000'));
ok('bill page duo dono: 1 safha',await pages()===1);
for(const id of ['soft','green','classic','blue']){
 await p.getByTestId('bill-tpl').selectOption(id);await p.waitForTimeout(1300);
 t=await txt('invoice-sheet');
 ok('bill '+id+' dono: bill + dawa',t.includes('Amoxicillin')&&t.includes('15,000')&&await p.locator('#invoice-sheet [data-testid=rx-body]').count()===1);
 ok('bill '+id+' dono: id aik hi',await p.locator('[id="invoice-sheet"]').count()===1);
 const n=await pages();ok('bill '+id+' dono: 1 safha',n===1,'pages='+n);
 await shot('invoice-sheet','6-both-bill-'+id+'.png');
 await p.getByTestId('print-what').selectOption('bill');await p.waitForTimeout(800);
 ok('bill '+id+' sirf bill: dawa nahi, id aik',await p.locator('#invoice-sheet [data-testid=rx-body]').count()===0&&await p.locator('[id="invoice-sheet"]').count()===1);
 await p.getByTestId('print-what').selectOption('both');await p.waitForTimeout(500);
}
await Promise.all([p.waitForURL(/\/admin\/prescriptions\//,{timeout:15000}),p.getByTestId('print-what').selectOption('rx')]);
ok('Sirf Prescription: prescription ke page par gaya',p.url().includes('/admin/prescriptions/'+rx));
// visit invoice link
await p.goto(B+'/admin/visits/'+cv+'/invoice',{waitUntil:'networkidle'});
ok('visit bill: aik sath ka link',await p.getByTestId('both-link').count()===1);
await Promise.all([p.waitForURL(/w=both/),p.getByTestId('both-link').click()]);await p.waitForTimeout(1500);
ok('link se dono aik sath khula',await p.getByTestId('print-what').inputValue()==='both'&&await p.locator('#print-sheet [data-testid=bill-body]').count()===1);
// no bill / no rx
const name2='Duo Khali '+tag;const pid2=await L.newPatient(p,name2,'0315'+String(Date.now()).slice(-7));
L.q(`insert into prescriptions(patient_id,department,items,prescribed_date) values('${pid2}','dental','${items}'::jsonb,current_date - 400)`);
const rx2=L.q(`select id from prescriptions where patient_id='${pid2}' limit 1`);
await p.goto(B+'/admin/prescriptions/'+rx2+'/print?tpl=duo&w=both',{waitUntil:'networkidle'});await p.waitForTimeout(1200);
ok('bill na ho: sirf prescription, option nahi',await p.getByTestId('no-bill-note').count()===1&&(await p.getByTestId('print-what').locator('option').count())===1&&await p.getByTestId('bill-body').count()===0);
t=await txt('print-sheet');ok('umar/pata na ho to khana nahi chhapta',!t.includes('Address:')&&!t.includes('Age / Sex'));
// ---- 390
await p.setViewportSize({width:390,height:800});
for(const [u,id,f] of [['/admin/prescriptions/'+rx+'/print?tpl=duo&w=both','print-sheet','7-390-both-duo.png'],['/admin/invoices/'+inv+'?tpl=duo','invoice-sheet','8-390-bill-duo.png'],['/admin/prescriptions/'+rx+'/print?w=both','print-sheet','9-390-both-soft.png']]){
 await p.goto(B+u,{waitUntil:'networkidle'});await p.waitForTimeout(1800);
 ok('390 '+f+': side scroll nahi',await p.evaluate(()=>document.documentElement.scrollWidth<=391),String(await p.evaluate(()=>document.documentElement.scrollWidth)));
 const bb=await p.locator('#'+id).boundingBox();ok('390 '+f+': kaghaz screen ke andar',bb.x>=0&&bb.x+bb.width<=391,JSON.stringify(bb));
 await p.screenshot({path:S+f,fullPage:true});
}
await p.goto(B+'/admin/settings?s=print',{waitUntil:'networkidle'});await p.waitForTimeout(1200);
ok('390 settings: side scroll nahi',await p.evaluate(()=>document.documentElement.scrollWidth<=391));
console.log('TOTAL',pass,'pass',fail,'fail');process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,500));console.log('TOTAL so far',pass,fail);process.exit(1)});

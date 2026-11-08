const L=require('./lib2.js');
const NAMES={11:'Upper Right Central Incisor',12:'Upper Right Lateral Incisor',13:'Upper Right Canine',14:'Upper Right First Premolar',15:'Upper Right Second Premolar',16:'Upper Right First Molar',21:'Upper Left Central Incisor',22:'Upper Left Lateral Incisor',23:'Upper Left Canine',36:'Lower Left First Molar',37:'Lower Left Second Molar',38:'Lower Left Second Premolar',46:'Lower Right First Molar'};
const tap=async(p,n)=>{await p.locator('[aria-label^="'+NAMES[n]+'"]').first().click();await p.waitForTimeout(200)};
async function go(p,name){
  const pid=await L.newPatient(p,name+Date.now().toString().slice(-4),'0308'+String(Date.now()).slice(-7));
  await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
  const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
  await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
  return pid}
async function fin(p){
  await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
  await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
  const f=p.locator('text=Aaj kitne mile').first();if(await f.count())await f.locator('xpath=following::input[1]').fill('0');
  await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(3500);
  return await p.evaluate(()=>document.body.innerText.includes('Aaj ka visit mukammal ho gaya'))}
(async()=>{
 for(const w of [1280,390]){
  const r=await L.open(w);const p=r.p;
  console.log('== width',w);
  const pid=await go(p,'Nk ');
  console.log(' panel hidden before any tooth chosen:',await p.getByTestId('entry-add').count()===0);
  // 1) single tooth: 36 diagnosis + Crown
  await tap(p,36);
  console.log(' panel shows after tooth chosen:',await p.getByTestId('entry-add').count()===1);
  await p.getByTestId('entry-dx').fill('Caries');
  await p.getByTestId('quick-tx').filter({hasText:/Crown/}).first().click();
  console.log(' bill preview:',await p.getByTestId('entry-bill').innerText().catch(()=>'-'));
  await p.getByTestId('entry-add').click();await p.waitForTimeout(400);
  console.log(' cards after 1:',await p.getByTestId('tooth-card').count(),' panel closed after card:',await p.getByTestId('entry-add').count()===0);
  // 2) two teeth, extraction, 37+38: two separate cards
  await tap(p,37);await tap(p,38);
  await p.getByTestId('quick-tx').filter({hasText:/Extraction/}).first().click();
  await p.getByTestId('entry-add').click();await p.waitForTimeout(400);
  console.log(' cards after extraction x2:',await p.getByTestId('tooth-card').count());
  // 3) RCT 46
  await tap(p,46);
  await p.getByTestId('quick-tx').filter({hasText:/root canal|rct/i}).first().click();
  await p.getByTestId('entry-add').click();await p.waitForTimeout(400);
  // 4) bridge 6 teeth 11..16? use 11,12,13,14,15,16
  for(const n of [11,12,13,14,15,16])await tap(p,n);
  await p.getByTestId('grp-bridge').click();
  const types=await p.getByTestId('grp-type').locator('option').allInnerTexts();console.log(' bridge types:',types.join(' | '));
  console.log(' bridge bill preview (each):',await p.getByTestId('entry-bill').innerText());
  await p.getByTestId('gmode-whole').click();console.log(' bridge bill preview (whole):',await p.getByTestId('entry-bill').innerText());
  await p.getByTestId('gmode-each').click();
  await p.getByTestId('entry-add').click();await p.waitForTimeout(500);
  console.log(' group cards:',await p.getByTestId('group-card').count());
  // 5) partial denture on 21,22,23
  for(const n of [21,22,23])await tap(p,n);
  await p.getByTestId('grp-denture').click();
  const dt=await p.getByTestId('grp-type').locator('option').allInnerTexts();console.log(' partial types:',dt.join(' | '));
  await p.getByTestId('entry-add').click();await p.waitForTimeout(500);
  console.log(' group cards after denture:',await p.getByTestId('group-card').count());
  // 6) complete denture without teeth
  console.log(' complete types:',(await p.getByTestId('complete-denture').allInnerTexts()).join(' | '));
  await p.getByTestId('complete-denture').first().click();await p.waitForTimeout(500);
  console.log(' denture cards:',await p.getByTestId('denture-card').count());
  console.log(' overflow:',await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth));
  const cols=await p.evaluate(()=>{const o={};document.querySelectorAll('span.absolute.inset-0').forEach(e=>{const f=e.style.backgroundColor;if(f)o[f]=(o[f]||0)+1});return o});
  console.log(' colours:',JSON.stringify(cols));
  await p.screenshot({path:'/tmp/prst/p97_'+w+'.png',fullPage:true});
  if(w===1280){
    console.log(' finished:',await fin(p));
    console.log(' invoice:',L.q(`select total,paid_amount from invoices where patient_id='${pid}'`));
    console.log(' treatments:',L.q(`select name,teeth,price from patient_treatments where patient_id='${pid}' order by name`));
    console.log(' diag:',L.q(`select diagnoses from clinical_visits where patient_id='${pid}' order by created_at desc limit 1`).slice(0,400));
  }
  await r.b.close?.();
 }
 process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,500));process.exit(1)});

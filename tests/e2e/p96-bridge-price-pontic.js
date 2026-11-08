const L=require('./lib2.js');
const T=['Upper Right Central Incisor','Upper Right Lateral Incisor','Upper Right Canine','Upper Left Central Incisor'];
async function go(p,name){
  const pid=await L.newPatient(p,name+Date.now().toString().slice(-4),'0308'+String(Date.now()).slice(-7));
  await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
  const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
  await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
  for(const n of T){await p.locator('[aria-label^="'+n+'"]').first().click();await p.waitForTimeout(250)}
  return pid}
async function fin(p){
  await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
  await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
  const f=p.locator('text=Aaj kitne mile').first();if(await f.count())await f.locator('xpath=following::input[1]').fill('0');
  await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(3500);
  console.log(' done:',await p.evaluate(()=>document.body.innerText.includes('Aaj ka visit mukammal ho gaya')),' msg:',(await p.evaluate(()=>(document.body.innerText.match(/Price List mein save hui[^\n]*/)||[''])[0])))}
(async()=>{
 for(const w of [1280,390]){
  const r=await L.open(w);const p=r.p;
  console.log('== width',w);
  const pid=await go(p,'Zr ');
  const before=await p.locator('main').first().boundingBox();const tc=await p.locator('[aria-label^="Upper Right Central"]').first().boundingBox();
  await p.getByTestId('grp-bridge').click();await p.getByTestId('grp-type').selectOption('Zirconia Bridge');await p.getByTestId('entry-add').click();await p.waitForTimeout(500);
  const gr=p.locator('[data-testid=group-card]').first();
  const val=async()=>await gr.getByLabel('Qeemat',{exact:true}).inputValue();
  console.log(' each:',await val());
  await gr.getByTestId('cardmode-whole').click();await p.waitForTimeout(200);console.log(' whole:',await val());
  await gr.getByTestId('cardmode-each').click();await p.waitForTimeout(200);console.log(' each again:',await val());
  const after=await p.locator('main').first().boundingBox();const tc2=await p.locator('[aria-label^="Upper Right Central"]').first().boundingBox();
  console.log(' tooth box same:',tc.width===tc2.width&&tc.height===tc2.height,JSON.stringify(tc),JSON.stringify(tc2));
  const cols=await p.evaluate(()=>{const o={};document.querySelectorAll('span.absolute.inset-0').forEach(e=>{const f=e.style.backgroundColor;if(f)o[f]=(o[f]||0)+1});return o});
  console.log(' colours:',JSON.stringify(cols));
  console.log(' overflow:',await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth));
  await p.screenshot({path:'/tmp/prst/p96_'+w+'.png',fullPage:false});
  if(w===1280){
   await fin(p);
   console.log(' invoice:',L.q(`select total,paid_amount from invoices where patient_id='${pid}'`));
   // PFM zero price, typed price saved to list
   const p2=r.p; const pid2=await go(p2,'Pf ');
   await p2.getByTestId('grp-bridge').click();await p2.getByTestId('grp-type').selectOption('PFM Bridge');await p2.getByTestId('entry-add').click();await p2.waitForTimeout(500);
   await p2.locator('[data-testid=group-card]').first().getByTestId('cardmode-whole').click();
   await p2.locator('[data-testid=group-card]').first().getByLabel('Qeemat',{exact:true}).fill('12000');
   await fin(p2);
   console.log(' catalog PFM:',L.q("select price from treatment_catalog where name='PFM Bridge'"));
   // complete denture Both
   const pid3=await go(p2,'Dn ');
   await p2.getByTestId('grp-denture').click();await p2.getByTestId('dkind-complete').click();console.log(' complete types:',(await p2.getByTestId('grp-type').locator('option').allInnerTexts()).join(' | '));
  }
  await r.b.close?.();
 }
 process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,400));process.exit(1)});

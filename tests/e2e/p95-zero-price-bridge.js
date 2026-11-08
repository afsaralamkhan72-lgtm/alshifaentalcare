const L=require('./lib2.js');
(async()=>{const r=await L.open(1280);const p=r.p;
let pid=await L.newPatient(p,'Zero Test '+Date.now().toString().slice(-4),'0308'+String(Date.now()).slice(-7));
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
for(const n of ['Upper Right Central Incisor','Upper Right Lateral Incisor','Upper Right Canine'])
  {await p.locator('[aria-label^="'+n+'"]').first().click();await p.waitForTimeout(250)}
await p.locator('[data-testid=group-work]').getByRole('button',{name:'+ PFM Bridge',exact:true}).click();await p.waitForTimeout(500);
const gr=p.locator('[data-testid=group-row]').first();
await gr.getByPlaceholder('Qeemat Rs.').fill('0');
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
console.log('STEP:',(await p.innerText('main')).replace(/\n+/g,' | ').slice(0,500));
await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(3500);
console.log('done:',await p.evaluate(()=>document.body.innerText.includes('Aaj ka visit mukammal ho gaya')));
console.log(L.q(`select name,price,teeth from patient_treatments where patient_id='${pid}'`));
console.log('invoices:',L.q(`select count(*),coalesce(sum(total_amount),0) from invoices where patient_id='${pid}'`));
console.log('body err:',await p.evaluate(()=>/error|Error|nahi ho saka/.test(document.body.innerText)));
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

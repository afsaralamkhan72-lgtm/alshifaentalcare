const L=require('./lib2.js');
(async()=>{const r=await L.open(1280);const p=r.p;
let pid=await L.newPatient(p,'Mark2 '+Date.now().toString().slice(-4),'0308'+String(Date.now()).slice(-7));
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
await p.locator('[aria-label^="Upper Right Central Incisor"]').first().click();await p.waitForTimeout(400);
for(const n of ['Missing','Caries','Filling','RCT','Crown','Bridge','Implant','Extraction','Fracture','Denture'])
  console.log(n,'in side panel:',await p.getByRole('button',{name:n,exact:true}).count());
console.log('entry panel kaam chips:',await p.getByTestId('quick-tx').count());
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

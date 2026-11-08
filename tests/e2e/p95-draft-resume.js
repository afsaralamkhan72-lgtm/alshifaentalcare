const L=require('./lib2.js');
(async()=>{const r=await L.open(1280);const p=r.p;
let pid=await L.newPatient(p,'Zero Test '+Date.now().toString().slice(-4),'0308'+String(Date.now()).slice(-7));
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
await L.addGroup(p,{teeth:['Upper Right Central Incisor','Upper Right Lateral Incisor','Upper Right Canine'],kind:'bridge',type:'PFM Bridge'});
const gr=p.locator('[data-testid=group-card]').first();
await gr.getByLabel('Qeemat',{exact:true}).fill('0');
// autosave: back button then reopen
await p.locator('[data-testid=visit-back-profile]').click();await p.waitForTimeout(1500);
console.log('after back url:',p.url().slice(-40));
const st2=p.getByRole('button',{name:/Naya visit shuru|Visit jari|Visit dobara|jari rakhein/});
console.log('resume buttons:',await st2.count(), (await st2.allInnerTexts()).join('|'));
if(await st2.count()){await st2.first().click();await p.waitForTimeout(1200)}
console.log('group rows after resume:',await p.locator('[data-testid=group-card]').count(),'body has bridge:',await p.evaluate(()=>/Bridge/.test(document.body.innerText)));
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

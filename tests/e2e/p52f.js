const L=require('./lib2.js');
(async()=>{const r=await L.open(1280);const p=r.p||r.page||r;
let pid=await L.newPatient(p,'Mark2 '+Date.now().toString().slice(-4),'0308'+String(Date.now()).slice(-7));
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
await p.locator('[aria-label^="Upper Right Central Incisor"]').first().click();await p.waitForTimeout(400);
const fb=p.getByRole('button',{name:'Filling',exact:true});console.log('fill btns',await fb.count());
await fb.first().click();await p.waitForTimeout(500);
const card=p.locator('[data-testid=tooth-card]').first();
console.log('1',(await card.locator('input[list=cat-list]').evaluateAll(els=>els.map(e=>e.value).includes('Composite Filling'))), await fb.first().getAttribute('aria-pressed'));
await fb.first().click();await p.waitForTimeout(500);
console.log('2',(await card.locator('input[list=cat-list]').evaluateAll(els=>els.map(e=>e.value).includes('Composite Filling'))), await fb.first().getAttribute('aria-pressed'));
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

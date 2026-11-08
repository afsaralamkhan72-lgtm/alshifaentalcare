const L=require('./lib2.js');
(async()=>{const r=await L.open(1280);const p=r.p||r.page||r;
// 1) chart mark -> row per tooth
let pid=await L.newPatient(p,'Mark Test '+Date.now().toString().slice(-4),'0306'+String(Date.now()).slice(-7));
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
await p.locator('[aria-label^="Upper Right Central Incisor"]').first().click();await p.waitForTimeout(400);
await p.locator('button[aria-pressed]:has-text("Filling")').first().click();await p.waitForTimeout(500);
const card=p.locator('[data-testid=tooth-card]').first();
console.log('card has filling row:', (await card.innerText()).includes('Composite Filling'));
// remove via chart toggle
await p.locator('button[aria-pressed]:has-text("Filling")').first().click();await p.waitForTimeout(400);
console.log('after unmark cards left:', await p.locator('[data-testid=tooth-card]').count());
// 2) homeopathic visit
await p.goto('http://localhost:3055/admin/patients',{waitUntil:'networkidle'});
await p.getByRole('button',{name:'+ Naya Patient'}).click();await p.waitForTimeout(400);
await p.getByPlaceholder('Patient ka poora naam').fill('Homeo Fin '+Date.now().toString().slice(-4));await p.getByPlaceholder('03XX-XXXXXXX').fill('0307'+String(Date.now()).slice(-7));
await p.locator('button:has-text("Homeopathic")').first().click();
await p.getByRole('button',{name:'Patient save karein'}).click();await p.waitForURL(/patients\/[0-9a-f-]{36}/,{timeout:15000});await p.waitForTimeout(1500);
const hpid=p.url().split('/').pop();
const ok=await L.visit(p,hpid,{newTx:['Homeo Consult',500],pay:'full'});console.log('homeo visit',ok);
console.log(L.q(`select name,price from patient_treatments where patient_id='${hpid}'`));
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

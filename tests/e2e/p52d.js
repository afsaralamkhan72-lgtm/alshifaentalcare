const L=require('./lib2.js');
(async()=>{const r=await L.open(390);const p=r.p||r.page||r;
const pid=await L.newPatient(p,'Mouth Test '+Date.now().toString().slice(-4),'0305'+String(Date.now()).slice(-7));
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
await p.locator('[aria-label^="Upper Right Central Incisor"]').first().click();await p.waitForTimeout(300);
await p.locator('[aria-label^="Upper Left Central Incisor"]').first().click();await p.waitForTimeout(400);
const bk=p.getByRole('button',{name:/Band karein/});if(await bk.count())await bk.first().click();await p.waitForTimeout(300);
const c=p.locator('[data-testid=tooth-card]');
await c.nth(0).getByRole('button',{name:/Dental caries/}).click();
await c.nth(0).getByRole('button',{name:/Composite Filling/}).first().click();
await p.getByRole('button',{name:/Scaling & Polishing/}).first().click();await p.waitForTimeout(400);
await p.screenshot({path:'/tmp/prst/m1.png',fullPage:false});
console.log('overflowX', await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2));
await p.getByRole('button',{name:'Aadha muh'}).first().click();await p.waitForTimeout(300);
console.log('half hint',await p.getByText('Aadhe muh ki qeemat khud likhein').count());
// find price input of the mouth row
const row=p.locator('div.rounded-xl.border:has(button:has-text("Aadha muh"))').first();
await row.locator('input[type=number]').first().fill('800');await p.waitForTimeout(300);
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(800);
const t=await p.locator('main').innerText();console.log(t.slice(t.indexOf('Aaj ki treatments'),t.indexOf('Aaj ki treatments')+60).replace(/\n+/g,' | '));
await p.screenshot({path:'/tmp/prst/m2.png'});
console.log('overflowX bill', await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2));
await p.getByRole('button',{name:/Poora mil gaya/}).click();
await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(3500);
console.log(L.q(`select name,price,status from patient_treatments where patient_id='${pid}'`));
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

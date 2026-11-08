const L=require('./lib2.js');
(async()=>{for(const w of [1280,390]){const r=await L.open(w);const p=r.p;
const pid=await L.newPatient(p,'Kahan Test '+Date.now().toString().slice(-4),'0312'+String(Date.now()).slice(-7));
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2000);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(600)}
await p.getByTestId('loc-teeth-toggle').click();await p.waitForTimeout(300);
await p.locator('[data-testid=loc-teeth] [aria-label="UR 6"]').click();await p.locator('[data-testid=loc-teeth] [aria-label="LL 8"]').click();
console.log(w,'location text:',await p.getByPlaceholder('Neeche dayen ...').inputValue());
console.log(w,'overflow',await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth));
if(w===1280){
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(500);
 await p.getByRole('button',{name:'+ Treatment'}).click();await p.waitForTimeout(300);
 await p.getByPlaceholder(/Treatment \(list se/).fill('Next Chk');await p.getByPlaceholder('Qeemat Rs.').fill('100');
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(400);await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(500);
 const d=new Date(Date.now()+3*864e5).toISOString().slice(0,10);
 await p.locator('input[type=date]').first().fill(d);await p.waitForTimeout(300);
 const sel=p.locator('select').filter({has:p.locator('optgroup')}).first();
 console.log('optgroup options:',await sel.locator('optgroup option').count());
 await sel.selectOption({index:(await sel.locator('option').count())-1});
 await p.locator('text=Aaj kitne mile').first().locator('xpath=following::input[1]').fill('100');
 await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(3500);
 console.log('done:',await p.evaluate(()=>document.body.innerText.includes('Aaj ka visit mukammal ho gaya')));
 console.log(L.q(`select name,status,price from patient_treatments where patient_id='${pid}' order by created_at`));
}
await r.b.close()}process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

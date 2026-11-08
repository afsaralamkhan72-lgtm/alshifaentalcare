const L=require('./lib2.js');
(async()=>{for(const w of [1280,390]){const r=await L.open(w);const p=r.p;
let pid=await L.newPatient(p,'Mode Test '+Date.now().toString().slice(-4),'0310'+String(Date.now()).slice(-7));
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2000);
const hasHist=async()=>(await p.locator('.profile-extra').isVisible());
console.log(w,'draft open: mode attr',await p.evaluate(()=>document.documentElement.dataset.visitMode),'extra display',await p.evaluate(()=>getComputedStyle(document.querySelector('.profile-extra')).display),'back btn',await p.getByTestId('visit-back-profile').count());
await p.getByTestId('visit-back-profile').click();await p.waitForTimeout(500);
console.log(w,'after back: mode attr',await p.evaluate(()=>document.documentElement.dataset.visitMode),'extra display',await p.evaluate(()=>getComputedStyle(document.querySelector('.profile-extra')).display));
await p.getByRole('button',{name:/Naya visit shuru/}).click();await p.waitForTimeout(500);
for(let i=0;i<2;i++){await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(500)}
console.log(w,'rx step:',(await p.locator('button[aria-pressed]:has-text("Nahi")').innerText()).trim());
console.log(w,'overflow',await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth));
await r.b.close()}process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

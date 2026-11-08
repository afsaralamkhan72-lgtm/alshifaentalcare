const L=require('./lib2.js');
(async()=>{for(const w of [1280,390]){const r=await L.open(w);const p=r.p;
const pid=await L.newPatient(p,'Nxt '+Date.now().toString().slice(-4),'0311'+String(Date.now()).slice(-7));
const ok=await L.visit(p,pid,{newTx:['Orthodontic Braces',30000],pay:5000});console.log(w,'visit1 done',ok);
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2200);
const b=p.getByTestId('next-visit');console.log('btn',await b.count(),(await b.first().innerText().catch(()=>'')));
await b.first().click();await p.waitForTimeout(2500);
const txt=await p.locator('main').innerText();
console.log('url',p.url().replace('http://localhost:3055',''),'form open',/Agla|Daant aur kaam|Pehle se chalti/.test(txt),'ticked',await p.locator('input[type=checkbox]:checked').count());
console.log('overflow',await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1));}
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

const L=require('./lib2.js');
(async()=>{const {p}=await L.open(390);
const code=L.q("select verify_code from invoices where status='active' limit 1");
const rx=L.q("select id from prescriptions limit 1");const inv=L.q("select id from invoices where status='active' limit 1");
await p.goto('http://localhost:3055/admin/invoices/'+inv,{waitUntil:'networkidle'});await p.waitForTimeout(1500);
console.log('invoice QR img',await p.locator('img[alt="Verify QR"]').count());
if(rx){await p.goto('http://localhost:3055/admin/prescriptions/'+rx+'/print',{waitUntil:'networkidle'});await p.waitForTimeout(1500);console.log('rx QR',await p.locator('img[alt="Verify QR"]').count())}
const c2=await (await require('playwright').chromium.launch()).newContext({viewport:{width:390,height:800}});const q=await c2.newPage();
for(const c of [code,'abcdefghijklmnopqrstuvwxyz123456']){await q.goto('http://localhost:3055/verify/'+c,{waitUntil:'networkidle'});console.log(c.slice(0,6),'->',(await q.locator('[role=status]').innerText()),'overflow',await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));}
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

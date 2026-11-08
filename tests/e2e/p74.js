const U=require('./ui_r.js');const L=require('./lib2.js');
(async()=>{const {p}=await U.open(1280);
const pages='/admin/dashboard /admin/patients /admin/appointments /admin/lab /admin/inventory /admin/treatments /admin/recall /admin/loyalty /admin/prescriptions /admin/accounts /admin/billing /admin/invoices /admin/dues /admin/expenses /admin/closing /admin/summary /admin/reports /admin/insights /admin/ledger-check /admin/attendance /admin/payroll /admin/staff /admin/settings /admin/cms /admin/audit /admin/recycle-bin /admin/inventory/purchases /admin/inventory/count /admin/prices'.split(' ');
const out=[];for(const u of pages){await p.goto('http://localhost:3055'+u,{waitUntil:'domcontentloaded'}).catch(()=>{});await p.waitForTimeout(500);out.push(u+' -> '+new URL(p.url()).pathname)}
console.log(out.map(l=>{const [a,b]=l.split(' -> ');return (a===b?'OPEN   ':'REDIR  ')+a+(a===b?'':'  => '+b)}).join('\n'));
await p.goto('http://localhost:3055/admin/inventory',{waitUntil:'networkidle'});const t=await p.locator('main').innerText();
console.log('INVENTORY as receptionist: manage buttons visible?',['+ Naya Item','Badlein','Milayein','Delete','Kharid'].filter(x=>t.includes(x)));
const r=await p.request.get('http://localhost:3055/api/backup');console.log('backup api status',r.status());
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

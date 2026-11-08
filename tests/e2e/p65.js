const L=require('./lib2.js');
(async()=>{const {p}=await L.open(1280);
const inv=L.q("select id from invoices where status='active' and paid_amount>0 and total-paid_amount>0 order by created_at desc limit 1");
const q=(s)=>L.q(s.replace('$I',inv));
console.log('before',q("select paid_amount from invoices where id='$I'"),'refunds',q("select count(*) from payments where invoice_id='$I' and kind='refund'"));
await p.goto('http://localhost:3055/admin/invoices/'+inv,{waitUntil:'networkidle'});await p.waitForTimeout(1000);
await p.getByRole('button',{name:'Ulti karein'}).first().click();await p.waitForTimeout(400);
await p.getByPlaceholder('Wajah (zaroori)').fill('refund ui test');await p.getByRole('button',{name:'Confirm'}).click();await p.waitForTimeout(2500);
console.log('after',q("select paid_amount from invoices where id='$I'"),'refunds',q("select count(*) from payments where invoice_id='$I' and kind='refund'"));
console.log('txn net',q("select coalesce(sum(case when type='income' then amount else -amount end),0) from transactions where invoice_id='$I'"));
await p.goto('http://localhost:3055/admin/ledger-check',{waitUntil:'networkidle'});console.log((await p.locator('[data-testid=reconcile]').innerText()).slice(30,150).replace(/\n/g,' '));
// dashboard number check
await p.goto('http://localhost:3055/admin/dashboard',{waitUntil:'networkidle'});
const txt=await p.locator('main').innerText();console.log(txt.slice(0,500).replace(/\n+/g,' | '));
console.log('db: patients today',q("select count(distinct patient_id) from clinical_visits where visit_date=(now() at time zone 'Asia/Karachi')::date"));
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

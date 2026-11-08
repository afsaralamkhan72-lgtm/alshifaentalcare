const L=require('./lib2.js');
(async()=>{const {p}=await L.open(1280);
const inv=L.q("select id from invoices where status='active' and total-paid_amount>=500 order by created_at desc limit 1");
console.log('inv',inv.slice(0,8));
await p.goto('http://localhost:3055/admin/invoices/'+inv,{waitUntil:'networkidle'});await p.waitForTimeout(1200);
const before=L.q(`select total, discount_amount, paid_amount from invoices where id='${inv}'`);
const d=p.locator('[data-testid=bill-discount]');console.log('discount input',await d.count());
await d.fill('100');await p.getByPlaceholder('Discount ki wajah (zaroori)').fill('test overall');
console.log('amount auto',await p.getByPlaceholder('Raqam').inputValue());
await p.getByRole('button',{name:/Payment Save/}).click();await p.waitForTimeout(2500);
const after=L.q(`select total, discount_amount, paid_amount from invoices where id='${inv}'`);
console.log('before',before,'after',after);
console.log('reconcile rows',L.q(`select count(*) from invoice_reconcile() where invoice_id='${inv}'`).replace(/ERROR.*/,'(needs auth)'));
const wa=await p.locator('a:has-text("WhatsApp")').first().getAttribute('href');const txt=decodeURIComponent(wa.split('text=')[1]||'');console.log(txt);
await p.goto('http://localhost:3055/admin/ledger-check',{waitUntil:'networkidle'});console.log('reconcile box',(await p.locator('[data-testid=reconcile]').innerText()).slice(0,140).replace(/\n/g,' '));
for(const u of ['/admin/accounts','/admin/billing','/admin/invoices','/admin/dues','/admin/expenses','/admin/closing','/admin/summary','/admin/reports','/admin/insights','/admin/ledger-check']){await p.goto('http://localhost:3055'+u,{waitUntil:'networkidle'});console.log(u,'tabs',(await p.locator('[data-testid=section-tabs] a').allInnerTexts()).length)}
await p.goto('http://localhost:3055/admin/inventory',{waitUntil:'networkidle'});console.log('stock gap',await p.locator('[data-testid=stock-gap]').count());
// staff doctor sync
await p.goto('http://localhost:3055/admin/staff',{waitUntil:'networkidle'});
const nm='Dr Sync '+Date.now().toString().slice(-4);
await p.locator('input[name=full_name]').fill(nm);await p.locator('input[name=title]').fill('Doctor');
await p.locator('select[name=with_login]').selectOption('no');await p.getByRole('button',{name:'Staff banayein'}).click();await p.waitForTimeout(2500);
console.log('doctor synced',L.q(`select count(*) from treating_doctors where name='${nm}'`), 'staff_members',L.q(`select count(*) from staff_members where full_name='${nm}'`));
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

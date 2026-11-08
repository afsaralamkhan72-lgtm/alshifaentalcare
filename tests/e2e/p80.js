const L=require('./lib2.js');
(async()=>{const {p}=await L.open(1280);const s=Date.now().toString().slice(-5);
const X='UIR Syringe '+s;
L.q(`insert into inventory(item_name,category,quantity,unit,is_active) values ('${X}','dental',0,'pcs',true)`);
const id=L.q(`select id from inventory where item_name='${X}'`);
await p.goto('http://localhost:3055/admin/inventory',{waitUntil:'networkidle'});await p.waitForTimeout(800);
const row=p.locator('tr',{has:p.getByText(X)}).first();
// stock add via UI
await row.getByRole('button',{name:'Kharid',exact:true}).click();
await p.getByPlaceholder('Kitne pack').fill('10');await p.getByPlaceholder('Kul qeemat Rs.').fill('1000');
await p.getByRole('button',{name:/Stock \+ Kharcha Save/}).click();await p.waitForTimeout(1500);
console.log('after buy qty',L.q(`select quantity from inventory where id='${id}'`));
// damaged without reason
await row.getByTestId('item-return').click();
await p.getByLabel('Kitna').fill('2');await p.getByRole('button',{name:'Save',exact:true}).click();await p.waitForTimeout(400);
console.log('no-reason blocked:',await p.getByText('Kharabi ki wajah likhein').count());
await p.getByLabel('Wajah').fill('syringe toot gayi');
const sb=p.getByTestId('item-return-form').getByRole('button',{name:'Save',exact:true});
await sb.dblclick();await p.waitForTimeout(1800);
console.log('after damaged qty (expect 8):',L.q(`select quantity from inventory where id='${id}'`),'damaged movements (expect 1):',L.q(`select count(*) from inventory_movements where inventory_id='${id}' and kind='damaged'`));
// supplier return with refund
await p.goto('http://localhost:3055/admin/inventory',{waitUntil:'networkidle'});await p.waitForTimeout(800);
const row2=p.locator('tr',{has:p.getByText(X)}).first();
await row2.getByTestId('item-return').click();
await p.getByTestId('item-return-form').locator('select').first().selectOption('return_supplier');
await p.getByLabel('Kitna').fill('3');await p.getByLabel('Wapas mili raqam').fill('300');
await p.getByTestId('item-return-form').getByRole('button',{name:'Save',exact:true}).click();await p.waitForTimeout(1800);
console.log('after return qty (expect 5):',L.q(`select quantity from inventory where id='${id}'`));
console.log('refund tx:',L.q(`select category,amount,type from transactions where description like 'Supplier ko wapas: ${X}%'`));
// over-return
await p.goto('http://localhost:3055/admin/inventory',{waitUntil:'networkidle'});await p.waitForTimeout(800);
const row3=p.locator('tr',{has:p.getByText(X)}).first();
await row3.getByTestId('item-return').click();
await p.getByLabel('Kitna').fill('50');await p.getByLabel('Wajah').fill('x');
await p.getByTestId('item-return-form').getByRole('button',{name:'Save',exact:true}).click();await p.waitForTimeout(500);
console.log('over-return blocked:',await p.getByText(/Itna stock maujood nahi/).count());
console.log('qty still 5:',L.q(`select quantity from inventory where id='${id}'`),'reconcile gaps:',L.q(`select count(*) from inventory_reconcile() where inventory_id='${id}'`));
console.log('audit:',L.q(`select string_agg(action,',' order by id) from audit_log where record_id='${id}' and action like 'STOCK%'`));
await p.goto('http://localhost:3055/admin/audit',{waitUntil:'networkidle'});console.log('audit page label:',await p.getByText('Stock kharab/toota').count()>0);
await p.setViewportSize({width:390,height:800});await p.goto('http://localhost:3055/admin/inventory',{waitUntil:'networkidle'});
console.log('phone overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
process.exit(0)})();

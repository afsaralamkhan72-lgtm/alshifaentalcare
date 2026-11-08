const L=require('./lib2.js');
(async()=>{const {p}=await L.open(1280);const s=Date.now().toString().slice(-5);
const X='UIX Gloves '+s,Y='UIY Gloves '+s,Z='UIZ Mistake '+s;
L.q(`insert into inventory(item_name,category,quantity,unit,is_active) values ('${X}','dental',10,'box',true),('${Y}','dental',4,'box',true),('${Z}','dental',0,'box',true)`);
const xid=L.q(`select id from inventory where item_name='${X}'`),yid=L.q(`select id from inventory where item_name='${Y}'`);
L.q(`insert into inventory_movements(inventory_id,kind,qty_change,qty_after,note) values ('${xid}','opening',10,10,'ui'),('${yid}','opening',4,4,'ui')`);
const open=async()=>{await p.goto('http://localhost:3055/admin/inventory',{waitUntil:'networkidle'});await p.waitForTimeout(800)};
const row=(n)=>p.locator('tr',{has:p.getByText(n,{exact:false})}).first();
await open();
// dup add warning
await p.getByRole('button',{name:'+ Naya Item'}).click();await p.getByPlaceholder('Item ka naam').fill(X);await p.getByRole('button',{name:/Item save|Save|Add|Banayein/i}).last().click().catch(()=>{});await p.waitForTimeout(600);
console.log('dup-add warning',await p.getByText('pehle se maujood hai').count());
await open();
// Delete visible only for item without history
console.log('delete btn on X (has history):',await row(X).locator('[data-testid=item-delete]').count(),'| on Z (no history):',await row(Z).locator('[data-testid=item-delete]').count());
// rename X
await row(X).locator('[data-testid=item-edit]').click();await p.waitForTimeout(300);
await p.getByLabel('Item ka naam').fill('UIX Renamed '+s);await p.getByLabel('Tafseel').fill('naam theek kiya');await p.getByRole('button',{name:'Save',exact:true}).click();await p.waitForTimeout(1500);
console.log('rename db:',L.q(`select item_name||' | '||coalesce(description,'')||' | qty '||quantity from inventory where id='${xid}'`),'| movements',L.q(`select count(*) from inventory_movements where inventory_id='${xid}'`));
// merge Y into renamed X
await open();
await row(Y).locator('[data-testid=item-merge]').click();await p.waitForTimeout(300);
await p.getByLabel('Asli item').selectOption({index:1}).catch(e=>console.log('select?',e.message.slice(0,80)));
const opts=await p.getByLabel('Asli item').locator('option').allInnerTexts();console.log('merge options include X renamed:',opts.some(o=>o.includes('UIX Renamed')));
p.once('dialog',d=>d.accept());const val=await p.getByLabel('Asli item').locator('option',{hasText:'UIX Renamed '+s}).getAttribute('value');await p.getByLabel('Asli item').selectOption(val);
await p.locator('[data-testid=item-merge-form]').getByRole('button',{name:'Milayein',exact:true}).click();await p.waitForTimeout(1800);
console.log('after merge: X qty',L.q(`select quantity from inventory where id='${xid}'`),'| Y',L.q(`select quantity||' active='||is_active||' merged_into_X='||(merged_into='${xid}') from inventory where id='${yid}'`));
// delete Z via UI -> bin
await open();p.once('dialog',d=>d.accept());await row(Z).locator('[data-testid=item-delete]').click();await p.waitForTimeout(1500);
console.log('Z deleted_at set:',L.q(`select deleted_at is not null from inventory where item_name='${Z}'`));
await p.goto('http://localhost:3055/admin/recycle-bin',{waitUntil:'networkidle'});console.log('bin has Z:',await p.locator('[data-testid=bin-items]').getByText(Z).count());
await p.locator('[data-testid=bin-items]').getByText(Z).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]').getByRole('button',{name:'Restore'}).click();await p.waitForTimeout(1500);
console.log('Z restored:',L.q(`select deleted_at is null and is_active from inventory where item_name='${Z}'`));
// archive Y? archived list
await open();p.once('dialog',d=>d.accept());await row(Z).getByRole('button',{name:'Band',exact:true}).click();await p.waitForTimeout(1500);
await open();console.log('archived list count',await p.locator('[data-testid=archived-items]').count());
await p.locator('[data-testid=archived-items] summary').click();p.once('dialog',d=>d.accept());await p.locator('[data-testid=archived-items]').getByText(Z).locator('xpath=..').getByRole('button').click();await p.waitForTimeout(1500);
console.log('Z active again:',L.q(`select is_active from inventory where item_name='${Z}'`));
console.log('audit actions:',L.q(`select string_agg(distinct action,',') from audit_log where table_name='inventory' and record_id in ('${xid}','${yid}',(select id::text from inventory where item_name='${Z}'))`));
// audit page shows
await p.goto('http://localhost:3055/admin/audit?table=inventory',{waitUntil:'networkidle'});const at=await p.locator('main').innerText();console.log('audit page shows Items merge:',at.includes('Items merge'),'| Band (archive):',at.includes('Band (archive)'));
await p.setViewportSize({width:390,height:800});await open();console.log('phone overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,400));process.exit(1)});

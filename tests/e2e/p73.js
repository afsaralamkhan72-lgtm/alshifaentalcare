const L=require('./lib2.js');const {chromium}=require('playwright');
(async()=>{const {p}=await L.open(1280);
await p.goto('http://localhost:3055/admin/payroll',{waitUntil:'networkidle'});await p.waitForTimeout(800);
p.on('dialog',d=>d.accept());
const btn=p.getByRole('button',{name:/Link \+ PIN/}).first();await btn.click();await p.waitForTimeout(2500);
const txt=await p.locator('main').innerText();const pin=(txt.match(/PIN: (\d{6})/)||[])[1];
const url=await p.locator('main').evaluate(m=>[...m.querySelectorAll('input,code,p,span')].map(e=>e.value||e.innerText||'').find(t=>/\/staff\//.test(t))||'');
console.log('PIN issued',!!pin,'link',url.slice(0,60));
const link=url.match(/\/staff\/[A-Za-z0-9_-]+/)[0];
const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:800}});const q=await c.newPage();
const go=async()=>{await q.goto('http://localhost:3055'+link,{waitUntil:'networkidle'});await q.waitForTimeout(500)};
await go();console.log('before PIN shows data?',(await q.locator('body').innerText()).includes('Mahana')||(await q.locator('body').innerText()).includes('Salary'),'| has pin input',await q.locator('input').count());
// wrong pin x6
let msg='';for(let i=0;i<6;i++){await q.locator('input').first().fill('00000'+i);await q.getByRole('button').first().click();await q.waitForTimeout(700);msg=(await q.locator('body').innerText()).slice(0,300).replace(/\n+/g,' | ')}
console.log('after wrong PINs:',msg.slice(0,200));
console.log('locked_until set in DB:',L.q("select count(*) from staff_portal_access where locked_until>now()"));
// correct pin while locked
await q.locator('input').first().fill(pin);await q.getByRole('button').first().click();await q.waitForTimeout(1000);console.log('correct PIN while locked ->',(await q.locator('body').innerText()).slice(0,160).replace(/\n+/g,' | '));
// unlock via DB (test only), then correct pin
L.q("update staff_portal_access set locked_until=null");
await go();await q.locator('input').first().fill(pin);await q.getByRole('button').first().click();await q.waitForTimeout(2000);
const t2=await q.locator('body').innerText();console.log('after correct PIN shows own record:',t2.slice(0,260).replace(/\n+/g,' | '));
const ck=(await c.cookies()).find(x=>x.name==='staff_session');console.log('cookie httpOnly',ck&&ck.httpOnly,'path',ck&&ck.path);
// tamper cookie
await c.clearCookies();await c.addCookies([{name:'staff_session',value:ck.value.replace(/.$/,'x'),domain:'localhost',path:'/staff'}]);await go();console.log('tampered cookie shows data?',(await q.locator('body').innerText()).includes('PIN')?'asks PIN again (PASS)':'DATA SHOWN (FAIL)');
// wrong token
await q.goto('http://localhost:3055/staff/WRONGTOKEN123',{waitUntil:'networkidle'});console.log('wrong token page:',(await q.locator('body').innerText()).slice(0,100).replace(/\n+/g,' | '));
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,400));process.exit(1)});

const L=require('./lib2.js');
(async()=>{const r=await L.open(1280);const p=r.p||r.page||r;
const nm='Lab53 '+Date.now().toString().slice(-4);
const pid=await L.newPatient(p,nm,'0309'+String(Date.now()).slice(-7));
// visit: add Crown on tooth 11
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
await p.locator('[aria-label^="Upper Right Central Incisor"]').first().click();await p.waitForTimeout(400);
const crown=p.getByTestId('quick-tx').filter({hasText:/Crown/}).first();console.log('crown btn',await crown.count());
if(await crown.count()){await crown.click();await p.getByTestId('entry-add').click();await p.waitForTimeout(600)}
const ls=p.locator('[data-testid=lab-send]');console.log('lab-send',await ls.count());
const href=await ls.first().getAttribute('href').catch(()=>null);console.log('href',href);
if(href){await p.goto('http://localhost:3055'+href,{waitUntil:'networkidle'});await p.waitForTimeout(1200);
 console.log('form open',await p.getByText('New Lab Case').count());
 await p.locator('input[placeholder="Al Noor Dental Lab"]').fill('TestLab');
 console.log('teeth chip 11:',await p.getByText('11',{exact:true}).count());
 await p.getByRole('button',{name:/Create & Open/}).click();await p.waitForTimeout(2500);
 console.log('url',p.url());
 const body=await p.evaluate(()=>document.body.innerText);console.log('has Delete',/Delete/.test(body),'work',/Crown/.test(body));
}
await p.goto('http://localhost:3055/admin/lab',{waitUntil:'networkidle'});
const card=await p.evaluate(()=>document.body.innerText);console.log('LIST:',card.slice(0,500).replace(/\n/g,' | '));
await p.once('dialog',d=>d.accept());
await p.getByRole('button',{name:'Delete'}).first().click();await p.waitForTimeout(2000);
await p.goto('http://localhost:3055/admin/recycle-bin',{waitUntil:'networkidle'});
console.log('BIN:',(await p.evaluate(()=>document.body.innerText)).slice(0,400).replace(/\n/g,' | '));
await p.getByRole('button',{name:'Restore'}).first().click();await p.waitForTimeout(1500);
await p.goto('http://localhost:3055/admin/lab',{waitUntil:'networkidle'});
console.log('restored in list',(await p.evaluate(()=>document.body.innerText)).includes('TestLab'));
await p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Delete'}).first().click();await p.waitForTimeout(1800);
await p.goto('http://localhost:3055/admin/recycle-bin',{waitUntil:'networkidle'});
await p.once('dialog',d=>d.accept());await p.getByRole('button',{name:/Hamesha ke liye/}).first().click();await p.waitForTimeout(2000);
console.log('left in db',L.q("select count(*) from lab_cases where lab_name='TestLab'"));
// loyalty
await p.goto('http://localhost:3055/admin/loyalty',{waitUntil:'networkidle'});
console.log('LOY tabs:',await p.getByRole('tab').allInnerTexts());
await p.getByRole('tab',{name:/Patients/}).click();await p.waitForTimeout(300);
console.log('subs:',await p.getByRole('tab').allInnerTexts());
console.log('start btn',await p.getByRole('button',{name:'Loyalty shuru karein'}).count());
// phone
const r2=await L.open(390);const p2=r2.p||r2.page||r2;
for(const u of ['/admin/lab','/admin/loyalty','/admin/recycle-bin']){await p2.goto('http://localhost:3055'+u,{waitUntil:'networkidle'});await p2.waitForTimeout(500);
 console.log(u,'overflow',await p2.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1));}
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,400));process.exit(1)});

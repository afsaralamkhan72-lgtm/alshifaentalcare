const L=require('./lib2.js');
(async()=>{for(const w of [1280,390]){const {p}=await L.open(w);
await p.goto('http://localhost:3055/admin/team',{waitUntil:'networkidle'});console.log(w,'team ->',p.url().replace('http://localhost:3055',''));
console.log('tabs',await p.locator('nav[aria-label=Staff] a').allInnerTexts());
if(w===1280){const nm='Zed Staff '+Date.now().toString().slice(-4);
 await p.goto('http://localhost:3055/admin/staff',{waitUntil:'networkidle'});
 await p.getByLabel('Naam',{exact:true}).fill(nm);await p.getByLabel('Ohda').fill('Clinic Staff');await p.getByLabel('Mahana tankhwah').fill('20000');
 await p.locator('select[name=with_login]').selectOption('no');
 await p.getByRole('button',{name:'Staff banayein'}).click();await p.waitForTimeout(2500);
 console.log('msg:',(await p.locator('p.bg-emerald-50,p.bg-red-50').first().innerText().catch(()=>'none')));
 console.log('db:',L.q(`select full_name,title,monthly_salary,profile_id is null from staff_members where full_name='${nm}'`));
 await p.goto('http://localhost:3055/admin/payroll',{waitUntil:'networkidle'});
 console.log('in payroll:',(await p.evaluate(()=>document.body.innerText)).includes(nm));
 // same name again: no duplicate
 await p.goto('http://localhost:3055/admin/staff',{waitUntil:'networkidle'});
 await p.getByLabel('Naam',{exact:true}).fill(nm);await p.locator('select[name=with_login]').selectOption('no');
 await p.getByRole('button',{name:'Staff banayein'}).click();await p.waitForTimeout(2000);
 console.log('rows same name:',L.q(`select count(*) from staff_members where full_name='${nm}'`));}
for(const u of ['/admin/attendance','/admin/payroll','/admin/staff']){await p.goto('http://localhost:3055'+u,{waitUntil:'networkidle'});
 console.log(w,u,'overflow',await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),'active',await p.locator('nav[aria-label=Staff] a[aria-current=page]').allInnerTexts());}
}process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

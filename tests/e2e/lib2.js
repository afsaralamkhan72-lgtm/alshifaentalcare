const u=require('./ui.js');const {execSync}=require('child_process');
exports.q=s=>execSync(`runuser -u postgres -- /usr/lib/postgresql/16/bin/psql -h /tmp/pgt -p 5544 -U postgres -d a3 -At -F ' | ' -c "${s}"`).toString().trim();
exports.open=u.open;
exports.newPatient=async(p,name,phone)=>{await p.goto('http://localhost:3055/admin/patients',{waitUntil:'networkidle'});
await p.getByRole('button',{name:'+ Naya Patient'}).click();await p.waitForTimeout(500);
await p.getByPlaceholder('Patient ka poora naam').fill(name);await p.getByPlaceholder('03XX-XXXXXXX').fill(phone);
await p.getByRole('button',{name:'Patient save karein'}).click();await p.waitForURL(/patients\/[0-9a-f-]{36}/,{timeout:15000});await p.waitForTimeout(1500);return p.url().split('/').pop()};
exports.visit=async(p,pid,o)=>{await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 const again=p.getByRole('button',{name:/Aaj dobara naya visit/});if(await again.count()){await again.click();await p.waitForTimeout(1500)}
 else{const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}}
 const next=async()=>{await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(700)};
 await next(); // step2
 if(o.newTx){await p.getByRole('button',{name:'+ Treatment'}).click();await p.waitForTimeout(400);
  await p.getByPlaceholder(/Treatment \(list se/).fill(o.newTx[0]);await p.getByPlaceholder('Qeemat Rs.').fill(String(o.newTx[1]));
  const ag=p.getByRole('button',{name:'Aaj ho gayi'});if(await ag.count())await ag.first().click();await p.waitForTimeout(400)}
 if(o.tick){await p.locator('label').filter({hasText:o.tick}).locator('input[type=checkbox]').first().check();await p.waitForTimeout(300);
  if(o.done){await p.getByText('Ye treatment mukammal ho gayi').first().click();await p.waitForTimeout(300);await p.getByRole('button',{name:'Haan, mukammal'}).first().click();await p.waitForTimeout(300)}}
 await next(); // step3 (dawa)
 await next(); // step4
 if(o.pay==='full'){await p.getByRole('button',{name:/Poora mil gaya/}).click()}
 else if(o.pay!=null){await p.locator('text=Aaj kitne mile').first().locator('xpath=following::input[1]').fill(String(o.pay))}
 await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(3500);
 return (await p.evaluate(()=>document.body.innerText.includes('Aaj ka visit mukammal ho gaya')));};
exports.tap=async(p,n)=>{await p.locator('[aria-label^="'+n+'"]').first().click();await p.waitForTimeout(250)};
exports.addCard=async(p,o)=>{for(const n of o.teeth)await exports.tap(p,n);
 if(o.dx)await p.getByTestId('entry-dx').fill(o.dx);
 if(o.quick)await p.getByTestId('quick-tx').filter({hasText:o.quick}).first().click();
 if(o.pick)await p.getByTestId('entry-tx-select').selectOption(o.pick);
 await p.getByTestId('entry-add').click();await p.waitForTimeout(400)};
exports.addGroup=async(p,o)=>{for(const n of o.teeth||[])await exports.tap(p,n);
 await p.getByTestId(o.kind==='bridge'?'grp-bridge':'grp-denture').click();
 if(o.kind==='denture'&&o.complete)await p.getByTestId('dkind-complete').click();
 if(o.type)await p.getByTestId('grp-type').selectOption(o.type);
 if(o.mode)await p.getByTestId('gmode-'+o.mode).click();
 await p.getByTestId('entry-add').click();await p.waitForTimeout(500)};

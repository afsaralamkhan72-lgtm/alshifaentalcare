const L=require('./lib2.js');
(async()=>{
 const r=await L.open(1280);const p=r.p;
 const pid=await L.newPatient(p,'Ws '+Date.now().toString().slice(-4),'0309'+String(Date.now()).slice(-7));
 await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
 const d=new Date(Date.now()+5*864e5).toISOString().slice(0,10);
 await p.locator('input[type=date]').last().fill(d);await p.waitForTimeout(300);
 const f=p.locator('text=Aaj kitne mile').first();if(await f.count())await f.locator('xpath=following::input[1]').fill('0');
 await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(3500);
 const h=await p.getByTestId('visit-wa').getAttribute('href');
 console.log(decodeURIComponent(h).slice(0,900));
 process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,500));process.exit(1)});

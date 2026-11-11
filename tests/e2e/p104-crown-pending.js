const L=require('./lib2.js');
(async()=>{
 const r=await L.open(1280);const p=r.p;
 const pid=await L.newPatient(p,'Cr '+Date.now().toString().slice(-4),'0311'+String(Date.now()).slice(-7));
 L.q(`insert into patient_treatments(patient_id,name,teeth,status,completed_on) values('${pid}','Root Canal (RCT)','{36}','completed',current_date)`);
 await p.goto('http://localhost:3055/admin/dashboard',{waitUntil:'domcontentloaded'});await p.waitForTimeout(3500);
 console.log('crown card:',await p.getByTestId('crown-pending').count(),(await p.getByTestId('crown-pending').innerText().catch(()=>'')).slice(0,200));
 console.log('payroll reminder:',await p.getByTestId('payroll-reminder').count());
 L.q(`insert into patient_treatments(patient_id,name,teeth,status) values('${pid}','Crown','{36}','planned')`);
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForTimeout(3500);
 console.log('after crown plan, card lists patient:',(await p.getByTestId('crown-pending').innerText().catch(()=>'')).includes('Cr '));
 await p.goto('http://localhost:3055/admin/payroll',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 console.log('sofar lines:',await p.getByTestId('staff-sofar').count(),(await p.getByTestId('staff-sofar').first().innerText().catch(()=>'')));
 console.log('overflow:',await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth));
 process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,400));process.exit(1)});

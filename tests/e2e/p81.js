const L=require('./lib2.js');
(async()=>{const {p}=await L.open(1280);const s=Date.now().toString().slice(-6);
const pid=await L.newPatient(p,'Inst UI '+s,'0303'+s.padStart(7,'1'));
const plan='aaaaaaaa-1111-0000-0000-'+s.padStart(12,'0');
L.q(`insert into treatment_plans (id,patient_id,title,total_cost,advance_paid,duration_months,monthly_amount,treating_doctor) values ('${plan}','${pid}','UI Braces ${s}',9000,1000,2,4000,'Dr T')`);
L.q(`insert into installments (plan_id,installment_no,due_date,amount) values ('${plan}',1,current_date,4000),('${plan}',2,current_date+30,4000)`);
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'networkidle'});await p.waitForTimeout(1200);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
for(let i=0;i<3;i++){const b=p.getByRole('button',{name:'Agla →'});if(await b.count()){await b.click();await p.waitForTimeout(700)}}
console.log('plan card visible:',await p.getByText('Purane installment').count());
await p.getByRole('button',{name:'Payment Mili'}).first().click();
await p.getByRole('button',{name:'Save',exact:true}).first().dblclick();await p.waitForTimeout(2500);
console.log('installments:',L.q(`select string_agg(installment_no||':'||paid_amount,',' order by installment_no) from installments where plan_id='${plan}'`));
console.log('tx count (expect 1):',L.q(`select count(*) from transactions where patient_id='${pid}' and category='treatment-installment'`));
console.log('balance (expect 4000):',L.q(`select balance from patient_balances where patient_id='${pid}'`));
await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(1000);
for(let i=0;i<3;i++){const b=p.getByRole('button',{name:'Agla →'});if(await b.count()){await b.click();await p.waitForTimeout(700)}}
await p.getByRole('button',{name:'Payment Mili'}).first().click();
await p.locator('input[type=number]').last().fill('9999');
await p.getByRole('button',{name:'Save',exact:true}).first().click();await p.waitForTimeout(1500);
console.log('overpay error:',await p.getByRole('alert').first().innerText().catch(()=>'none'));
console.log('installment 2 untouched:',L.q(`select paid_amount from installments where plan_id='${plan}' and installment_no=2`));
process.exit(0)})();

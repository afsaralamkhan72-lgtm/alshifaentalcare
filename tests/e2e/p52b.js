const L=require('./lib2.js');
(async()=>{const r=await L.open(1280);const p=r.p||r.page||r;
const pid=await L.newPatient(p,'RCT Two '+Date.now().toString().slice(-4),'0303'+String(Date.now()).slice(-7));
let ok=await L.visit(p,pid,{newTx:['RCT Special',15000],pay:5000});console.log('v1',ok);
ok=await L.visit(p,pid,{tick:'RCT Special',done:true,pay:'full'});console.log('v2',ok);
console.log(L.q(`select name,status,price from patient_treatments where patient_id='${pid}'`));
console.log(L.q(`select count(*) from clinical_visits where patient_id='${pid}'`));
console.log(L.q(`select total,paid_amount,balance from invoices where patient_id='${pid}'`));
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

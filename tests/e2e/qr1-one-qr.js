const L=require('./lib2.js');let pass=0,fail=0;const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n)};
const B='http://localhost:3055';
(async()=>{const r=await L.open(1280);const p=r.p;
const rx=L.q("select r.id from prescriptions r join patients p on p.id=r.patient_id where p.deleted_at is null and r.verify_code is not null order by r.created_at desc limit 1");
await p.goto(B+'/admin/prescriptions/'+rx+'/print',{waitUntil:'networkidle'});await p.waitForTimeout(2000);
ok('"QR code lagayein" button nahi raha',await p.getByRole('button',{name:/QR code lagayein|Naya QR/}).count()===0);
const sel=p.locator('label:has-text("Template") select').first();
for(const id of await sel.locator('option').evaluateAll(o=>o.map(x=>x.value))){
 await sel.selectOption(id);await p.waitForTimeout(1200);
 const v=await p.locator('img[alt="Verify QR"]').count(),inside=await p.locator('#print-sheet img[alt="Verify QR"]').count(),o=await p.locator('img[alt="QR"]').count();
 ok(id+': poore page par sirf 1 QR, kaghaz ke andar, tasdeeq wala ('+v+','+inside+','+o+')',v===1&&inside===1&&o===0);
}
console.log('TOTAL',pass,'pass',fail,'fail');process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,400));process.exit(1)});

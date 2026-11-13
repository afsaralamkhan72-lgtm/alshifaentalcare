const L=require('./lib2.js');const fs=require('fs');let pass=0,fail=0;const ok=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(x?' | '+x:''))};
const B='http://localhost:3055';const S='/tmp/prst/shots/';
(async()=>{const r=await L.open(1280);const p=r.p;
const pid=L.q("select id from patients where full_name like 'Duo Mareez %' order by created_at desc limit 1");
const rx=L.q(`select id from prescriptions where patient_id='${pid}' limit 1`);
const inv=L.q(`select id from invoices where patient_id='${pid}' limit 1`);
const orig=L.q(`select items::text from prescriptions where id='${rx}'`);
const mk=(n)=>JSON.stringify(Array.from({length:n},(_,i)=>({name_en:'Test Dawa Number '+(i+1)+' 500mg',dosage:'1 tab',frequency:'Din mein 3 baar',duration:'5 din',instructions:'Khane ke baad pani ke sath'}))).replace(/"/g,'\\"');
const pages=async(f)=>{const buf=await p.pdf({format:'A4',preferCSSPageSize:true});if(f)fs.writeFileSync(S+f,buf);return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length};
const tplSel=()=>p.locator('label:has-text("Template") select').first();
for(const [n,lines,label] of [[10,6,'lamba'],[28,16,'bohat lamba']]){
 L.q(`update prescriptions set items='${mk(n)}'::jsonb where id='${rx}'`);
 L.q(`delete from invoice_items where invoice_id='${inv}' and name like 'Test Kaam %'`);
 for(let i=0;i<lines;i++)L.q(`insert into invoice_items(invoice_id,name,qty,unit_price,line_total) values('${inv}','Test Kaam ${i+1}',1,1000,1000)`);
 for(const tpl of ['duo','soft','pad_red','classic']){
  await p.goto(B+'/admin/prescriptions/'+rx+'/print?w=both&tpl=duo',{waitUntil:'networkidle'});await p.waitForTimeout(1200);
  if(tpl!=='duo'){await tplSel().selectOption(tpl);await p.waitForTimeout(1500)}
  const fit=await p.getByTestId('fit-wrap').getAttribute('data-fit');
  const pg=await pages(label==='lamba'||tpl==='duo'?('print-'+tpl+'-'+n+'.pdf'):null);
  const rows=await p.locator('#print-sheet [data-testid=bill-body] tbody tr').count();
  if(label==='lamba')ok(tpl+' '+n+' dawa + '+rows+' bill lines: 1 safha',pg===1,'fit='+fit+' pages='+pg);
  else ok(tpl+' '+n+' dawa + '+rows+' lines: had se zyada, toota nahi (2 safhe tak)',pg>=1&&pg<=2&&Number(fit)>=0.6,'fit='+fit+' pages='+pg);
  const all=await p.locator('#print-sheet').innerText();
  ok(tpl+' '+label+': aakhri dawa aur aakhri kaam maujood',all.includes('Test Dawa Number '+n+' ')&&all.includes('Test Kaam '+lines));
 }
}
L.q(`delete from invoice_items where invoice_id='${inv}' and name like 'Test Kaam %'`);
L.q(`update prescriptions set items='${orig.replace(/"/g,'\\"')}'::jsonb where id='${rx}'`);
// real print output of normal case
await p.goto(B+'/admin/prescriptions/'+rx+'/print?w=both&tpl=duo',{waitUntil:'networkidle'});await p.waitForTimeout(1500);
ok('aam: 1 safha',await pages('print-duo-normal.pdf')===1);
await p.goto(B+'/admin/invoices/'+inv+'?tpl=duo',{waitUntil:'networkidle'});await p.waitForTimeout(1500);
ok('bill duo print: 1 safha',await pages('print-bill-duo.pdf')===1);
console.log('TOTAL',pass,'pass',fail,'fail');process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,400));process.exit(1)});

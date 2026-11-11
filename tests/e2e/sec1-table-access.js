const R=require('./roles.js');
(async()=>{
 const tables=['patients','payments','invoices','expenses','staff_ledger','staff_members','clinical_visits','patient_treatments','prescriptions','audit_log','inventory','lab_cases','staff_permissions','treatment_steps','scratch_prizes','day_closings'];
 for(const role of ['anon','noperm','recep','doctor','admin']){
  const out=[];
  for(const t of tables){const r=await R.api(role,t+'?select=*&limit=1');out.push(t+':'+(r.s===200?(r.t==='[]'?'0':'ROWS'):r.s))}
  console.log(role.padEnd(7),out.join(' '));
 }
 // writes that must fail for low roles
 for(const role of ['anon','noperm','recep']){
  const a=await R.api(role,'expenses',{body:{amount:1,category:'x',note:'sec'}});
  const b=await R.api(role,'rpc/report_summary',{body:{p_from:'2026-11-01',p_to:'2026-11-10'}});
  const c=await R.api(role,'rpc/set_staff_permissions',{body:{p_user:R.IDS.noperm,p_perms:['billing.refund']}});
  const d=await R.api(role,'staff_profiles?id=eq.'+R.IDS.noperm,{body:null});
  const e=await R.api(role,'rpc/payroll_finalize_all',{body:{p_period:'2026-09'}});
  const f=await R.api(role,'scratch_prizes',{body:{title:'hack',kind:'free',value:0,weight:1}});
  console.log('WRITE',role.padEnd(7),'expense',a.s,'| report',b.s,'| setperms',c.s,c.t.slice(0,60),'| payroll',e.s,'| prize',f.s);
 }
 process.exit(0)})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});

const R=require('./roles.js');
(async()=>{
 for(const role of ['noperm','recep']){
  const c=await R.api(role,'rpc/set_staff_permissions',{body:{p_user:R.IDS[role],p_codes:['billing.refund','settings.manage']}});
  const a=await R.api(role,'rpc/add_expense',{body:{p_amount:5,p_category:'x'}});
  const v=await R.api(role,'rpc/purge_patient',{body:{p_id:'00000000-0000-0000-0000-000000000000',p_confirm:'DELETE'}});
  const g=await R.api(role,'staff_permissions?select=user_id&user_id=neq.'+R.IDS[role]+'&limit=1');
  const h=await R.api(role,'staff_permissions',{body:{user_id:R.IDS[role],perm_code:'billing.refund'}});
  const u=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/staff_profiles?id=eq.'+R.IDS[role],{method:'PATCH',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,Authorization:'Bearer '+R.token(R.IDS[role]),'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({role:'admin'})});
  console.log(role,'\n  setperms',c.s,c.t.slice(0,90),'\n  expense',a.s,a.t.slice(0,90),'\n  purge',v.s,v.t.slice(0,90),'\n  others perms',g.s,g.t.slice(0,60),'\n  insert perm',h.s,'\n  self->admin',u.status,(await u.text()).slice(0,100));
 }
 process.exit(0)})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});

const L=require('./lib2.js');const {execSync}=require('child_process');
(async()=>{
 execSync('runuser -u postgres -- /usr/lib/postgresql/16/bin/psql -h /tmp/pgt -p 5544 -U postgres -d a3 -q -f /tmp/prst/backdate.sql >/dev/null 2>&1');
 for(const w of [1280,390]){
  const r=await L.open(w);const p=r.p;
  console.log('== width',w);
  await p.goto('http://localhost:3055/admin/settings?s=space',{waitUntil:'networkidle'});await p.waitForTimeout(1500);
  console.log(' panel:',await p.getByTestId('cleanup-panel').count());
  console.log(' usage:',(await p.getByTestId('cleanup-panel').innerText()).replace(/\n+/g,' | ').slice(0,200));
  console.log(' overflow:',await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth));
  await p.locator('#cleanup-period').selectOption('12');
  await p.getByTestId('cleanup-preview').click();await p.waitForTimeout(1200);
  console.log(' preview:',(await p.getByTestId('cleanup-result').innerText()).replace(/\n+/g,' | ').slice(0,300));
  if(!(await p.getByTestId('cleanup-go').count())){console.log(' nothing left to archive (ok on rerun)');await r.b.close?.();continue}
  console.log(' go disabled at start:',await p.getByTestId('cleanup-go').isDisabled());
  await p.screenshot({path:'/tmp/prst/p98_'+w+'.png',fullPage:true});
  if(w===1280){
   const before=L.q("select count(*) from clinical_visits");
   await p.getByTestId('cleanup-backup').check();await p.getByTestId('cleanup-typed').fill('DEL');
   console.log(' go disabled w/ DEL:',await p.getByTestId('cleanup-go').isDisabled());
   await p.getByTestId('cleanup-typed').fill('DELETE');
   console.log(' go enabled:',!(await p.getByTestId('cleanup-go').isDisabled()));
   await p.getByTestId('cleanup-go').click();await p.waitForTimeout(6000);
   console.log(' msg:',(await p.locator('[role=status]').first().innerText().catch(()=> 'none')));
   console.log(' visits before/after:',before,L.q("select count(*) from clinical_visits"),' cards:',L.q("select count(*) from patient_archive_cards"),' invoices still:',L.q("select count(*) from invoices")>0);
   const pid=L.q("select patient_id from patient_archive_cards limit 1");
   await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
   console.log(' profile archive card:',await p.getByTestId('archive-card').count(),(await p.getByTestId('archive-card').first().innerText().catch(()=> '')).replace(/\n+/g,' | ').slice(0,250));
  }
  await r.b.close?.();
 }
 process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,400));process.exit(1)});

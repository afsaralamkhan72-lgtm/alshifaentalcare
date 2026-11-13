const L=require('./lib2.js');const fs=require('fs');const B='http://localhost:3055';const S='/tmp/prst/shots/';
(async()=>{
const rx=L.q("select r.id from prescriptions r join patients p on p.id=r.patient_id where p.full_name like 'Duo Mareez %' order by r.created_at desc limit 1");
for(const w of [1280,390]){
 const r=await L.open(w);const p=r.p;
 for(const [tpl,nm] of [['duo','duo'],['','soft']]){
  await p.goto(B+'/admin/prescriptions/'+rx+'/print?w=both'+(tpl?'&tpl='+tpl:''),{waitUntil:'networkidle'});await p.waitForTimeout(2000);
  if(w===390)await p.locator('#print-sheet').screenshot({path:S+'m-'+nm+'-'+w+'.png'});
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:60000}),p.getByRole('button',{name:/PDF download/}).click()]);
  const f=S+'pdf-'+nm+'-'+w+'.pdf';await dl.saveAs(f);
  const buf=fs.readFileSync(f).toString('latin1');console.log(w,nm,'pdf pages',(buf.match(/\/Type\s*\/Page[^s]/g)||[]).length,'bytes',buf.length);
 }
 await r.b.close();
}
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,400));process.exit(1)});

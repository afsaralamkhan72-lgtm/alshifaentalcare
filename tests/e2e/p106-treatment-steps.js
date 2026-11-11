const L=require('./lib2.js');
const T='Lower Right First Molar';
(async()=>{
 for(const w of [1280,390]){
  const r=await L.open(w);const p=r.p;
  console.log('== width',w);
  const pid=await L.newPatient(p,'Pr '+Date.now().toString().slice(-5),'0312'+String(Date.now()).slice(-7));
  await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
  let st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
  await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
  await L.addCard(p,{teeth:[T],dx:'Pulpitis',quick:/root canal|rct/i});
  await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
  await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(600);
  const f=p.locator('text=Aaj kitne mile').first();if(await f.count())await f.locator('xpath=following::input[1]').fill('300');
  await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(3500);
  await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
  const again=p.getByRole('button',{name:/Aaj dobara naya visit/});
  if(await again.count()){await again.click();await p.waitForTimeout(1500)}else{st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}}
  await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
  console.log(' make btn:',await p.getByTestId('steps-make').count());
  await p.getByTestId('steps-make').click();await p.waitForTimeout(1200);
  console.log(' box:',(await p.getByTestId('steps-box').innerText()));console.log(' rows:',await p.getByTestId('step-row').count(),'|',(await p.getByTestId('steps-box').innerText()).split('\n')[0]);
  await p.getByTestId('step-row').first().locator('input').check();await p.waitForTimeout(1200);
  console.log(' after tick:',(await p.getByTestId('steps-box').innerText()).split('\n')[0]);
  await p.getByLabel('Naya qadam likhein').fill('Post lagana');await p.getByTestId('step-add').click();await p.waitForTimeout(1200);
  console.log(' rows after add:',await p.getByTestId('step-row').count());
  console.log(' db:',L.q("select step_no,title,done_on is not null from treatment_steps where treatment_id=(select id from patient_treatments where patient_id='"+pid+"' limit 1) order by 1").replace(/\n/g,' ; '));
  console.log(' overflow:',await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth));
  await p.screenshot({path:'/tmp/prst/p106_'+w+'.png'});
 }
 process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,400));process.exit(1)});

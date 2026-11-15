const L=require('./lib2.js');let pass=0,fail=0;const ok=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(x?' | '+x:''))};
const B='http://localhost:3055';const S='/tmp/prst/shots/hd-';
(async()=>{const r=await L.open(1280);const p=r.p;const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));
const tag=Date.now().toString().slice(-5);const T=(id)=>p.getByTestId(id);
L.q("delete from site_settings where key in ('print_defaults','print_layout')");
const pid=await L.newPatient(p,'Hd Mareez '+tag,'03'+String(Date.now()).slice(-9));
await p.goto(B+'/admin/patients/'+pid,{waitUntil:'networkidle'});await p.waitForTimeout(1500);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
await L.mouth(p);await p.getByRole('button',{name:/^\+ (Treatment|Aur kaam)$/}).click();await p.waitForTimeout(400);
await p.getByPlaceholder(/Treatment \(list se/).fill('Hd Kaam '+tag);await p.getByPlaceholder('Qeemat Rs.').fill('4000');
const ag=p.getByRole('button',{name:'Aaj ho gayi'});if(await ag.count())await ag.first().click();await p.waitForTimeout(400);
const next=async()=>{await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(800)};
await next();await next();
if(await T('split-all').count())await T('split-all').click();
await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(5000);
const tid=L.q(`select id from patient_treatments where patient_id='${pid}' limit 1`);
const vid=L.q(`select id from clinical_visits where patient_id='${pid}' limit 1`);
const payid=L.q(`select p.id from payments p order by p.created_at desc limit 1`);
const pages={'ilaaj invoice':`/admin/patients/${pid}/treatment/${tid}/invoice`,'visit invoice':`/admin/visits/${vid}/invoice`,'raseed':`/admin/payments/${payid}/receipt`,'estimate':`/admin/patients/${pid}/estimate`};


const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';
L.q("delete from site_settings where key in ('print_defaults','print_layout','print_logo')");
await p.goto(B+pages['visit invoice'],{waitUntil:'networkidle'});await p.waitForTimeout(500);
ok('letterhead nahi: header normal',(await T('doc-head').getAttribute('data-doc-style'))==='soft'&&/Health Care/i.test(await T('doc-head').innerText()));
L.q("insert into site_settings(key,value) select 'print_layout', jsonb_build_object('letterhead', jsonb_build_object('data','"+PNG+"','top',40,'bottom',25,'left',12,'right',12))");
for(const k of Object.keys(pages)){ console.log('GOTO',k,pages[k]);
 await p.goto(B+pages[k],{waitUntil:'networkidle'});await p.waitForTimeout(900);
 const sheet=p.locator('#print-sheet,#history-sheet').first();if(!(await sheet.count())){console.log('NOSHEET',p.url(),(await p.locator('body').innerText()).slice(0,300));continue}
 const st=await sheet.evaluate(e=>({w:e.getBoundingClientRect().width,bg:getComputedStyle(e).backgroundImage.slice(0,20)}));
 ok(k+': letterhead par poora A4 kaghaz',st.bg.startsWith('url(')&&st.w>700,JSON.stringify(st));
 const txt=await sheet.innerText();
 ok(k+': apna header (naam/doctor) chhup gaya',!/Health Care|Rabita|Easypaisa|Dr\./i.test(txt),txt.slice(0,120).replace(/\n/g,' '));
 ok(k+': kaam ka matn maujood',/Hd Mareez|Patient|Raqam|Tafseel|Invoice|Receipt|Estimate|Record/i.test(txt));
 await p.setViewportSize({width:1280,height:900});
}
await p.goto(B+pages['visit invoice'],{waitUntil:'networkidle'});await p.waitForTimeout(900);
ok('style picker ab bhi hai (print mein nahi)',await T('doc-style-picker').count()===1);
await p.screenshot({path:S+'letterhead.png'});
L.q("delete from site_settings where key in ('print_defaults','print_layout','print_logo')");
ok('JS errors nahi',errs.length===0,errs.join(';'));
console.log('TOTAL '+(pass+fail)+' | FAIL '+fail);process.exit(0)})().catch(e=>{console.log('CRASH',e.message.slice(0,400));process.exit(1)});

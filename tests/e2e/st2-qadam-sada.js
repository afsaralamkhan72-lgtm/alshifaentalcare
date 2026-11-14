const L=require('./lib2.js');let pass=0,fail=0;const ok=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(x?' | '+x:''))};
const B='http://localhost:3055';const S='/tmp/prst/shots/st2-';const errs=[];
(async()=>{const r=await L.open(1280);const p=r.p;p.on('pageerror',e=>errs.push(e.message.slice(0,150)));
const tag=Date.now().toString().slice(-5);const T=(id)=>p.getByTestId(id);
const pid=await L.newPatient(p,'Qadam Do '+tag,'03'+String(Date.now()).slice(-9));
await p.goto(B+'/admin/patients/'+pid,{waitUntil:'networkidle'});await p.waitForTimeout(1500);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:/Marez ke profile par wapas/}).click();await p.waitForTimeout(400);
ok('"profile par wapas": bara card wapas',await p.locator('#s1').isVisible()&&!(await T('visit-strip').isVisible()));
await p.getByRole('button',{name:/Naya visit shuru/}).click();await p.waitForTimeout(600);
// ---- qadam 1
ok('visit ke dauran chhoti patti, bara card nahi',await T('visit-strip').isVisible()&&!(await T('total-hisab').isVisible().catch(()=>false))&&!(await p.locator('#s1').isVisible()));
const chips=await T('cc-chips').locator('button').count();ok('takleef: pehle sirf 7 + "Aur"',chips===8,'buttons='+chips);
ok('tafseel band (Kab se nahi dikhta)',await T('cc-detail').count()===0&&await T('cc-more').count()===1);
const order=await p.evaluate(()=>{const h=[...document.querySelectorAll('[data-visit-root] h2')].filter(e=>e.getBoundingClientRect().height>0).map(e=>e.textContent);return h.join(' > ')});
ok('takleef sab se pehle',order.startsWith('Mareez ko kya takleef hai?'),order);
await p.screenshot({path:S+'0-qadam1.png',fullPage:true});
await T('cc-chips').locator('button',{hasText:'Missing tooth'}).click();
await T('cc-all').click();await p.waitForTimeout(200);ok('"Aur": sab takleef',await T('cc-chips').locator('button').count()>12);
await T('cc-chips').locator('button',{hasText:'Abscess'}).click();await T('cc-all').click();await p.waitForTimeout(200);
ok('chuni hui takleef band karne par bhi dikhti hai',(await T('cc-chips').innerText()).includes('Abscess'));
await T('cc-more').click();await p.waitForTimeout(200);ok('tafseel khuli',await T('cc-detail').count()===1);
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
const vis=async()=>p.evaluate(()=>{const m=document.querySelector('[data-visit-root]')||document.querySelector('main');const v=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};return [...m.querySelectorAll('button')].filter(v).length});
const modes=await T('gb-modes').locator('button').allInnerTexts();
ok('5 bare button',modes.length===5,modes.join(' | '));
ok('shuru mein chart band, koi aur dabba nahi',await p.locator('text=Dental Chart').count()===0&&await T('tx-picker').count()===0&&await T('gb-idle').count()===1);
const n0=await vis();ok('screen par button 99 se bohat kam',n0<=25,'buttons='+n0);
ok('"Aaj ka kaam" khali',await T('work-empty').count()===1);
await p.screenshot({path:S+'1-shuru.png',fullPage:true});
// tooth
await T('gb-tooth').click();await p.waitForTimeout(500);
ok('Daant ka kaam: chart khula',await p.locator('text=Dental Chart').count()===1&&await T('gb-tooth-hint').count()===1);
await L.addCard(p,{teeth:['Upper Right First Molar'],quick:'illing'});
ok('daant ka card bana',await T('tooth-card').count()===1&&(await T('tooth-card').innerText()).toLowerCase().includes('filling'));
ok('button par ginti (1)',(await T('gb-tooth').innerText()).includes('1'));
await p.screenshot({path:S+'2-daant.png',fullPage:true});
// denture closes chart
await T('gb-denture').click();await p.waitForTimeout(400);
ok('Denture: chart band, Upper/Lower',await p.locator('text=Dental Chart').count()===0&&await T('gb-jaw').count()===2);
await T('gb-jaw').filter({hasText:'Upper'}).click();await T('gb-type').filter({hasText:/^Complete Denture$/}).click();await p.waitForTimeout(400);
ok('denture ki line, dabba band',await T('denture-card').count()===1&&await T('gb-idle').count()===1);
// bridge opens chart
await T('gb-bridge').click();await p.waitForTimeout(400);
ok('Bridge: chart khula',await p.locator('text=Dental Chart').count()===1);
await L.tap(p,'Lower Right First Molar');await L.tap(p,'Lower Right Second Molar');
await T('bridge-panel').locator('[data-testid=gb-type]').filter({hasText:'Zirconia Bridge'}).click();await p.waitForTimeout(500);
ok('bridge ki line, chart band',await T('group-card').count()===1&&await p.locator('text=Dental Chart').count()===0);
// mouth
await T('gb-mouth').click();await p.waitForTimeout(400);
ok('Poore munh ka kaam: chart nahi, kaam ke button',await p.locator('text=Dental Chart').count()===0&&await p.getByRole('button',{name:/Scaling/}).count()>0);
await p.screenshot({path:S+'3-poore-munh.png',fullPage:true});
await p.getByRole('button',{name:/\+ .*Scaling/}).first().click();await p.waitForTimeout(400);
ok('scaling lagi',(await p.locator('[data-visit-root], main').first().innerText()).includes('Scaling'));
await p.getByRole('button',{name:'+ Aur kaam'}).click();await p.waitForTimeout(300);
await p.locator('input[placeholder^="Treatment (list se"]:visible').last().fill('Test Baqi Kaam');await p.locator('input[placeholder="Qeemat Rs."]:visible').last().fill('700');
await T('gb-mouth').click();await p.waitForTimeout(400);
ok('band karne par bhi baqi kaam "Baqi kaam" mein dikhta hai',await p.locator('h2:has-text("Baqi kaam")').count()===1&&await p.getByRole('button',{name:'+ Aur kaam'}).count()===0);
ok('button par ginti (2)',(await T('gb-mouth').innerText()).includes('2'));
// checkup
ok('Checkup button hai',await T('gb-checkup').count()===1);
await T('gb-checkup').click();await p.waitForTimeout(300);
ok('Checkup laga (✓)',await T('gb-checkup').getAttribute('aria-pressed')==='true'&&(await p.locator('main').innerText()).match(/Consult|Check/i)!==null);
await T('gb-checkup').click();await p.waitForTimeout(300);ok('dobara dabane par hat gaya',await T('gb-checkup').getAttribute('aria-pressed')==='false');
await T('gb-checkup').click();
await p.screenshot({path:S+'4-sab-kaam.png',fullPage:true});
// re-open tooth: selection clean, earlier card intact
await T('gb-tooth').click();await p.waitForTimeout(400);
ok('dobara chart: pichla card mehfooz, koi daant chuna hua nahi',await T('tooth-card').count()===1&&await T('entry-panel').count()===0);
await T('gb-tooth').click();
// finish
const next=async()=>{await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(800)};
await next();await next();
const h4=await p.evaluate(()=>[...document.querySelectorAll('[data-visit-root] h2')].filter(e=>e.getBoundingClientRect().height>0).map(e=>e.textContent).join(' > '));
ok('qadam 4: bill sab se upar',/^(Bill|Paise|Hisaab|Aaj ka bill)/i.test(h4)||h4.indexOf('Material')>h4.search(/Bill|Paise|Hisaab/i),h4);
ok('aaj ke kaam hain to "koi kaam nahi" wali line nahi',await T('next-hint').count()===0);
const nopts=await p.locator('select:has(option[value^="row:"]) option[value^="row:"]').allInnerTexts();
ok('agli tareekh ke liye aaj ke kaam chune ja sakte hain',nopts.some(x=>x.includes('Complete Denture'))&&nopts.some(x=>x.includes('Zirconia Bridge')),nopts.join(' / '));
ok('ghalat likhai nahi',!(await p.locator('main').innerText()).includes('quot;'));
await p.screenshot({path:S+'4b-paise.png',fullPage:true});
const bt=await p.locator('main').innerText();
ok('bill mein sab kaam',['illing','Complete Denture - Upper','Zirconia Bridge','Scaling','Test Baqi Kaam'].every(x=>bt.includes(x)));
if(await T('split-all').count())await T('split-all').click();await p.waitForTimeout(300);
await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(5000);
ok('visit mukammal',(await p.locator('body').innerText()).includes('Aaj ka visit mukammal ho gaya'));
ok('visit ke baad poora profile wapas (patti chhupi)',await T('total-hisab').isVisible()&&!(await T('visit-strip').isVisible()));
const lr=await T('lab-remind-row').allInnerTexts();
ok('lab ki yaad-dahani: denture + bridge',lr.length===2&&lr.some(x=>x.includes('Complete Denture'))&&lr.some(x=>x.includes('Zirconia Bridge')),lr.join(' / ').replace(/\n/g,' '));
const href=await T('lab-remind-link').first().getAttribute('href');ok('link lab ki parchi par jata hai',/\/admin\/lab\?patient=.+&treatment=.+/.test(href),href);
await T('lab-remind').scrollIntoViewIfNeeded();await p.screenshot({path:S+'6-khatam.png'});
const cp=await p.context().newPage();await cp.goto(B+href,{waitUntil:'networkidle'});await cp.waitForTimeout(1500);
const lt=await cp.locator('main').innerText();ok('lab ka form khula, mareez pehle se chuna',/Qadam Do/i.test(lt),lt.slice(0,120).replace(/\n/g,' '));await cp.screenshot({path:S+'7-lab-form.png',fullPage:true});await cp.close();
const n=L.q(`select count(*) from invoice_items ii join invoices i on i.id=ii.invoice_id where i.patient_id='${pid}'`);
ok('invoice mein 5 lines (checkup ki qeemat test list mein 0 hai)',Number(n)===5,'lines='+n);
const bal=L.q(`select coalesce(sum(balance),0) from invoices where patient_id='${pid}' and status<>'void'`);ok('poora mil gaya: baqaya 0',Number(bal)===0,'bal='+bal);
// 390
const pid2=await L.newPatient(p,'Qadam Mob '+tag,'03'+String(Date.now()).slice(-9));
await p.setViewportSize({width:390,height:800});
await p.goto(B+'/admin/patients/'+pid2,{waitUntil:'networkidle'});await p.waitForTimeout(1800);
for(let i=0;i<3&&!(await T('gb-box').isVisible().catch(()=>false));i++){await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(700)}
ok('390: side scroll nahi',await p.evaluate(()=>document.documentElement.scrollWidth<=391));
const bb=await T('gb-box').boundingBox();ok('390: dabba screen mein',bb.x>=0&&bb.x+bb.width<=391);
await p.screenshot({path:S+'5-mobile.png'});
await T('gb-tooth').click();await p.waitForTimeout(500);await L.tap(p,'Upper Left First Molar');await p.waitForTimeout(400);
ok('390: chart + panel khula, side scroll nahi',await T('entry-panel').isVisible()&&await p.evaluate(()=>document.documentElement.scrollWidth<=391));
ok('koi page error nahi',errs.length===0,errs.join(' || '));
console.log('TOTAL',pass,'pass',fail,'fail');process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,600));console.log('so far',pass,fail,errs.join('|'));process.exit(1)});

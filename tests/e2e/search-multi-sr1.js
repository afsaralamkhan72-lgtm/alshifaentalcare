const L=require('./lib2.js');let pass=0,fail=0;const ok=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(x?' | '+x:''))};
const B='http://localhost:3055';const S='/tmp/prst/shots/sr-';
(async()=>{const r=await L.open(1280);const p=r.p;const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));
const tag=Date.now().toString().slice(-5);const T=(id)=>p.getByTestId(id);
const pid=await L.newPatient(p,'Sr Mareez '+tag,'03'+String(Date.now()).slice(-9));
await p.goto(B+'/admin/patients/'+pid,{waitUntil:'networkidle'});await p.waitForTimeout(1500);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
await L.tap(p,'Upper Right First Molar');
const res=async(q)=>{await T('pick-search').fill(q);await p.waitForTimeout(250);return T('pick-item').allInnerTexts()};
const a=await res('root canal treatment');ok('"root canal treatment" likhne par RCT milte hain',a.length>0&&a.every(x=>/root canal|rct|pulp/i.test(x)),a.join(' | '));
const b=await res('nerve');ok('"nerve" likhne par bhi',b.length>0&&b.every(x=>/root canal|rct|pulp/i.test(x)),b.join(' | '));
const c=await res('rct');ok('"rct"',c.length>0,c.join(' | '));
const d=await res('nikalna');ok('"nikalna" se Extraction',d.length>0&&d.every(x=>/extract|surgical|impact/i.test(x)),d.join(' | '));
const e=await res('bharai');ok('"bharai" se Filling',e.length>0&&e.every(x=>/fill|cavity|restor/i.test(x)),e.join(' | '));
const f=await res('zzzzqq');ok('jo na ho: khali',f.length===0&&(await T('pick-results').innerText()).includes('list mein nahi'));
const g=await res('post core');console.log('post core ->',g.join(' | '));
await res('');await T('quick-tx').filter({hasText:/filling/i}).first().click();await p.waitForTimeout(200);
const h=await res('post');console.log('post ->',h.join(' | '));
if(h.length){await T('pick-item').first().click();await p.waitForTimeout(250);
 ok('2 kaam chune: "Is daant par" bar',await T('picked-works').count()===1&&await T('picked-work').count()===2,(await T('picked-works').innerText()).replace(/\n/g,' '));
 await T('picked-work').first().click();await p.waitForTimeout(250);
 ok('ek hatane par ek bachta hai (bar band)',await T('picked-works').count()===0);
 await T('quick-tx').filter({hasText:/filling/i}).first().click();await p.waitForTimeout(250);}
await T('entry-add').scrollIntoViewIfNeeded();const bill=await T('entry-bill').innerText().catch(()=>'');console.log('bill:',bill);
await T('entry-add').click();await p.waitForTimeout(600);
const ct=await T('cards').innerText();console.log(ct.replace(/\n/g,' | ').slice(0,600));
ok('aik daant par 2 card/kaam bane (filling aur post)',/filling/i.test(ct)&&h.length&&new RegExp(h[0].replace(/[^a-z ]/gi,'.').slice(0,8),'i').test(ct));
const nrows=await T('cards').locator('input[aria-label=Qeemat]').count();ok('2 qeematon ki qataren',nrows>=2,String(nrows));
await T('day-note').scrollIntoViewIfNeeded().catch(()=>{});
// ek hi kaam: pehle jaisa
await L.tap(p,'Lower Left First Molar');await T('quick-tx').filter({hasText:/extraction/i}).first().click();await T('entry-add').click();await p.waitForTimeout(500);
ok('aik kaam pehle jaisa chalta hai',/extraction/i.test(await T('cards').innerText()));
await p.setViewportSize({width:390,height:800});await p.waitForTimeout(500);
ok('390: side scroll nahi',await p.evaluate(()=>document.documentElement.scrollWidth<=391));
ok('JS errors nahi',errs.length===0,errs.join(';'));
console.log('TOTAL',pass+fail,'| FAIL',fail);await r.b.close();process.exit(fail?1:0)})().catch(e=>{console.log('CRASH',e.message.slice(0,300));process.exit(2)});

const L=require('./lib2.js');let pass=0,fail=0;const ok=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(x?' | '+x:''))};
const B='http://localhost:3055';const S='/tmp/prst/shots/dt-';
(async()=>{const r=await L.open(1280);const p=r.p;const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));
const tag=Date.now().toString().slice(-5);const T=(id)=>p.getByTestId(id);
const pid=await L.newPatient(p,'Dt Mareez '+tag,'03'+String(Date.now()).slice(-9));
await p.goto(B+'/admin/patients/'+pid,{waitUntil:'networkidle'});await p.waitForTimeout(1500);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Lower'}).click();await p.waitForTimeout(300);
ok('chart nahi dikhta denture mein',await p.locator('[aria-label^="Lower Right First Molar"]').count()===0||!(await p.locator('[aria-label^="Lower Right First Molar"]').first().isVisible()));
ok('side popup (Masla / entry-panel) nahi',await T('entry-panel').count()===0);
// complete: seedha
await T('gb-type').filter({hasText:/^Complete Denture$/}).click();await p.waitForTimeout(400);
ok('Complete: daant nahi poochhe, seedha line',await T('gb-dteeth').count()===0&&await T('denture-card').filter({hasText:'Complete Denture - Lower'}).count()===1);
// partial: daant poochhe
await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Lower'}).click();
const types=await T('gb-types').locator('[data-testid=gb-type]').allInnerTexts();console.log('types',types.join(' | '));
const part=T('gb-type').filter({hasText:/Partial|Flexible|Cast/}).first();const pname=(await part.innerText()).trim();
await part.click();await p.waitForTimeout(400);
ok('Partial: "kaunse daant?" aaya, line abhi nahi bani',await T('gb-dteeth').count()===1&&await T('denture-card').filter({hasText:pname+' - Lower'}).count()===0,pname);
ok('add button band (0 daant)',await T('gb-dteeth-add').isDisabled());
ok('sirf neeche ke 16 daant',await T('gb-dtooth').count()===16&&(await T('gb-dtooth').allInnerTexts()).join('')==='8765432112345678');
await T('gb-dteeth').screenshot({path:S+'1-daant.png'});
for(const t of ['32','33','34','35','36','37']) await p.getByLabel('Denture daant '+t).click();
ok('6 daant chune: button par ginti',(await T('gb-dteeth-add').innerText()).includes('6 daant'));
await p.getByLabel('Denture daant 37').click();ok('dobara dabane se hat gaya (5)',(await T('gb-dteeth-add').innerText()).includes('5 daant'));
await T('gb-dteeth-add').click();await p.waitForTimeout(500);
const dc=T('denture-card').filter({hasText:pname+' - Lower'});
ok('Line bani: '+pname+' - Lower, daant 32-36',await dc.count()===1&&(await dc.innerText()).includes('Lower Left 2, 3, 4, 5, 6'),(await dc.innerText()).replace(/\n/g,' '));
const pr=await dc.locator('input[aria-label=Qeemat]').inputValue();console.log('price',pr);
ok('dabba band, daant picker band',await T('gb-dteeth').count()===0);
// skip
await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Upper'}).click();await T('gb-type').filter({hasText:/Partial|Flexible|Cast/}).first().click();await T('gb-dteeth-skip').click();await p.waitForTimeout(400);
ok('"Daant nahi batane": line bani, bina daant',await T('denture-card').filter({hasText:/- Upper/}).count()>=1);
// back
await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Lower'}).click();await T('gb-type').filter({hasText:/Cast/}).first().click().catch(()=>{});
// finish
const next=async()=>{await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(800)};
await next();await next();
if(await T('split-all').count())await T('split-all').click();
await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(5000);
ok('visit mukammal',(await p.locator('body').innerText()).includes('Aaj ka visit mukammal ho gaya'));
const tr=L.q(`select string_agg(name||'='||coalesce(array_to_string(teeth,','),'-')||'='||price::int,' ; ' order by name) from patient_treatments where patient_id='${pid}'`);console.log('treatments:',tr);
ok('treatment mein daant save (32..36)',/=32,33,34,35,36=/.test(tr));
const ii=L.q(`select string_agg(ii.name||'|'||coalesce(ii.tooth,'-')||'|'||ii.unit_price::int,' ; ') from invoice_items ii join invoices i on i.id=ii.invoice_id where i.patient_id='${pid}'`);console.log('items:',ii);
ok('bill line: poori qeemat ek dafa (daant ginne se nahi)',new RegExp(pname.replace(/[()]/g,'.')+' - Lower\\|[^|]*\\|'+Number(pr)).test(ii)||Number(pr)===0,ii);
await p.setViewportSize({width:390,height:800});
await p.goto(B+'/admin/patients/'+pid,{waitUntil:'networkidle'});await p.waitForTimeout(1000);
ok('JS errors nahi',errs.length===0,errs.join(';'));
console.log('TOTAL',pass+fail,'| FAIL',fail);await r.b.close();process.exit(fail?1:0)})().catch(e=>{console.log('CRASH',e.message.slice(0,300));process.exit(2)});

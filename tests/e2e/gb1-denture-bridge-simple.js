const L=require('./lib2.js');let pass=0,fail=0;const ok=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(x?' | '+x:''))};
const B='http://localhost:3055';const S='/tmp/prst/shots/gb-';
const errs=[];
(async()=>{const r=await L.open(1280);const p=r.p;
p.on('pageerror',e=>errs.push(e.message.slice(0,150)));
const tag=Date.now().toString().slice(-5);
L.q("update treatment_catalog set is_active=false, name=name||' (test '||left(id::text,6)||')' where name in ('Immediate Denture','Test Metal Bridge','Immediate Denture - Upper')");
L.q("update treatment_catalog set price=0 where name='Flexible Denture'");
const start=async(nm)=>{const pid=await L.newPatient(p,nm,'03'+String(Date.now()).slice(-9));await p.goto(B+'/admin/patients/'+pid,{waitUntil:'networkidle'});await p.waitForTimeout(1500);
 const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);return pid};
const pid=await start('Gb Mareez '+tag);
const T=(id)=>p.getByTestId(id);
ok('purana dabba nahi raha',await T('dent-region').count()===0&&await T('complete-denture-row').count()===0);
ok('naya dabba: sirf 2 button',await T('gb-box').locator('button').count()===2,(await T('gb-box').locator('button').allInnerTexts()).join(' | '));
await p.screenshot({path:S+'1-shuru.png'});
// ---- Denture
await T('gb-denture').click();await p.waitForTimeout(300);
ok('Denture: sirf Upper / Lower',(await T('gb-jaw').allInnerTexts()).join(',')==='Upper,Lower'&&await T('gb-type').count()===0);
await T('gb-jaw').filter({hasText:'Upper'}).click();await p.waitForTimeout(300);
const types=await T('gb-types').locator('[data-testid=gb-type]').allInnerTexts();
ok('qismein Price List se, saaf',types.length>=4&&!types.some(t=>/both|repair|relin|adjust| - |upper or lower/i.test(t))&&new Set(types).size===types.length,types.join(' | '));
await T('gb-box').screenshot({path:S+'2-denture-upper.png'});
await T('gb-type').filter({hasText:/^Complete Denture$/}).click();await p.waitForTimeout(500);
let cards=await T('denture-card').allInnerTexts();
ok('Complete Denture - Upper ki line bani',cards.length===1&&cards[0].includes('Complete Denture - Upper'),cards.join(' / ').replace(/\n/g,' '));
ok('qeemat Price List se (18000)',await T('denture-card').first().locator('input[aria-label=Qeemat]').inputValue()==='18000');
ok('dabba band ho gaya',await T('gb-jaw').count()===0&&await T('gb-denture').getAttribute('aria-pressed')==='false');
// duplicate
await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Upper'}).click();await T('gb-type').filter({hasText:/^Complete Denture$/}).click();await p.waitForTimeout(400);
ok('wahi dobara: double line nahi',await T('denture-card').count()===1);
// lower flexible (price 0)
await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Lower'}).click();await T('gb-type').filter({hasText:/^Flexible Denture$/}).click();await p.waitForTimeout(400);
const fl=T('denture-card').filter({hasText:'Flexible Denture - Lower'});
ok('Flexible - Lower bani, qeemat khali (list mein 0)',await fl.count()===1&&await fl.locator('input[aria-label=Qeemat]').inputValue()==='');
await fl.locator('input[aria-label=Qeemat]').fill('9000');
// similar name
await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Upper'}).click();await T('gb-new').click();await T('gb-new-name').fill('Flexibel Denture');await T('gb-new-price').fill('100');await T('gb-new-add').click();await p.waitForTimeout(400);
ok('milta julta naam: sawal aaya',await T('gb-sim').count()===1&&(await T('gb-sim-yes').allInnerTexts()).some(t=>t.includes('Flexible Denture')));
await T('gb-sim-yes').filter({hasText:'Flexible Denture'}).click();await p.waitForTimeout(400);
ok('Haan: purani qism lagi, naya naam nahi bana',await T('denture-card').filter({hasText:'Flexible Denture - Upper'}).count()===1&&await T('denture-card').filter({hasText:'Flexibel'}).count()===0);
await T('denture-card').filter({hasText:'Flexible Denture - Upper'}).getByText('hatao').first().click();await p.waitForTimeout(300);
// new type
await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Upper'}).click();await T('gb-new').click();
ok('naam ke baghair button band',await T('gb-new-add').isDisabled());
await T('gb-new-name').fill('Immediate');await T('gb-new-price').fill('30000');ok('naam ka namoona dikhta hai',(await T('gb-new-final').innerText()).includes('Immediate Denture'));
await T('gb-box').screenshot({path:S+'3-nayi-qism.png'});
await T('gb-new-add').click();await p.waitForTimeout(500);
const im=T('denture-card').filter({hasText:'Immediate Denture - Upper'});
ok('nayi qism: Immediate Denture - Upper, 30000',await im.count()===1&&await im.locator('input[aria-label=Qeemat]').inputValue()==='30000');
// ---- Bridge
await T('gb-bridge').click();await p.waitForTimeout(300);
ok('Bridge: hidayat aayi',(await T('gb-hint').innerText()).includes('chart'));
await L.tap(p,'Lower Right Second Premolar');
ok('bridge mode: purana panel nahi, bridge panel',await T('bridge-panel').count()===1&&await T('entry-panel').count()===0);
ok('1 daant: qism ke button band',await T('bridge-panel').locator('[data-testid=gb-type]').first().isDisabled());
await L.tap(p,'Lower Right First Molar');await L.tap(p,'Lower Right Second Molar');
ok('3 daant gine',(await T('gb-count').innerText()).startsWith('3 daant'),await T('gb-count').innerText());
const bt=await T('bridge-panel').locator('[data-testid=gb-type]').allInnerTexts();
ok('bridge ki qismein + khud hisaab (Zirconia 5000 x 3)',bt.some(t=>/Zirconia Bridge · Rs\. 15,000/.test(t)),bt.join(' | '));
await T('bridge-panel').scrollIntoViewIfNeeded();await p.screenshot({path:S+'4-bridge-3-daant.png'});
await T('bridge-panel').locator('[data-testid=gb-type]').filter({hasText:'Zirconia Bridge'}).click();await p.waitForTimeout(600);
let g=T('group-card');
ok('bridge ki EK line, 15000',await g.count()===1&&(await g.first().innerText()).includes('Zirconia Bridge')&&await g.first().locator('input[aria-label=Qeemat]').inputValue()==='15000');
ok('daant ka chunaav saaf, dabba band',await T('bridge-panel').count()===0&&await T('gb-hint').count()===0);
// new bridge type on 2 teeth
await T('gb-bridge').click();await L.tap(p,'Upper Left First Premolar');await L.tap(p,'Upper Left Second Premolar');
await T('gb-new').click();await T('gb-new-name').fill('Test Metal');await T('gb-new-price').fill('4000');await T('gb-new-add').click();await p.waitForTimeout(600);
g=T('group-card').filter({hasText:'Test Metal Bridge'});
ok('nayi bridge qism: 4000 x 2 = 8000',await g.count()===1&&await g.locator('input[aria-label=Qeemat]').inputValue()==='8000');
// normal tooth work still works, no Bridge button in old panel
await L.tap(p,'Upper Right Central Incisor');
ok('aam daant ka panel waisa hi, us mein Bridge button nahi',await T('entry-panel').count()===1&&await T('grp-bridge').count()===0&&await T('quick-tx').count()>0);
await T('quick-tx').filter({hasText:/filling/i}).first().click();await T('entry-add').click();await p.waitForTimeout(500);
ok('aam kaam (filling) ka card bana',await T('cards').innerText().then(t=>/filling/i.test(t)));
await p.screenshot({path:S+'5-sab-lines.png',fullPage:true});
// cancel
await T('gb-bridge').click();await L.tap(p,'Lower Left First Molar');await T('gb-cancel').click();await p.waitForTimeout(300);
ok('"Bridge nahi lagana": band, koi line nahi bani',await T('bridge-panel').count()===0&&await T('group-card').count()===2);
// ---- finish
const next=async()=>{await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(800)};
await next();await next();
const billTxt=await p.locator('main').innerText();
ok('bill mein sab lines',['Complete Denture - Upper','Flexible Denture - Lower','Immediate Denture - Upper','Zirconia Bridge','Test Metal Bridge'].every(x=>billTxt.includes(x)));
if(await T('split-all').count()){await T('split-all').click()}else{await p.locator('text=Aaj kitne mile').first().locator('xpath=following::input[1]').fill('20000')}await p.waitForTimeout(400);await p.screenshot({path:S+'5b-paise.png',fullPage:true});
await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(5000);
ok('visit mukammal',(await p.locator('body').innerText()).includes('Aaj ka visit mukammal ho gaya'));
const items=L.q(`select string_agg(ii.name||'='||ii.qty||'x'||ii.unit_price,' ; ' order by ii.name) from invoice_items ii join invoices i on i.id=ii.invoice_id where i.patient_id='${pid}'`);
console.log('items:',items);
const total=L.q(`select sum(total) from invoices where patient_id='${pid}' and status<>'void'`);
const fill=Number(L.q("select price from treatment_catalog where name ~* 'filling' order by sort_order,name limit 1"))||0;
ok('kul bill = 18000+9000+30000+15000+8000+filling',Number(total)>=80000,'total='+total);
const cat=L.q("select string_agg(name||'|'||price::int||'|'||coalesce(category,'')||'|'||coalesce(applies_to,''),' ; ' order by name) from treatment_catalog where name in ('Immediate Denture','Test Metal Bridge','Flexible Denture','Immediate Denture - Upper','Flexible Denture - Lower')");
console.log('catalog:',cat);
ok('Price List: Immediate Denture 30000 save hui (hisse ke baghair)',cat.includes('Immediate Denture|30000|Denture|jaw')&&!cat.includes('Immediate Denture - Upper'));
ok('Price List: Test Metal Bridge fi daant 4000',cat.includes('Test Metal Bridge|4000|Crown & Bridge|tooth'));
ok('Price List: Flexible Denture ki khali qeemat 9000 ho gayi',cat.includes('Flexible Denture|9000'));
const tr=L.q(`select count(*) from patient_treatments where patient_id='${pid}'`);ok('har kaam ka alag treatment',Number(tr)>=6,'treatments='+tr);
// ---- next patient sees new types
await start('Gb Dosra '+tag);
await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Lower'}).click();await p.waitForTimeout(300);
ok('agli dafa: Immediate Denture button ban gaya',(await T('gb-types').locator('[data-testid=gb-type]').allInnerTexts()).includes('Immediate Denture'));
await T('gb-type').filter({hasText:/^Immediate Denture$/}).click();await p.waitForTimeout(400);
ok('aur qeemat khud 30000',await T('denture-card').locator('input[aria-label=Qeemat]').inputValue()==='30000');
await T('gb-bridge').click();await L.tap(p,'Lower Right First Molar');await L.tap(p,'Lower Right Second Molar');
ok('agli dafa: Test Metal Bridge button, 8000',(await T('bridge-panel').locator('[data-testid=gb-type]').allInnerTexts()).some(t=>/Test Metal Bridge · Rs\. 8,000/.test(t)));
await T('gb-cancel').click();
// plan mode
await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Upper'}).click();await T('gb-plan').click();await T('gb-type').filter({hasText:/^Complete Denture$/}).click();await p.waitForTimeout(400);
ok('Sirf plan: line par "sirf plan" likha',(await T('denture-card').filter({hasText:'Complete Denture - Upper'}).innerText()).includes('sirf plan'));
await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Upper'}).click();await T('gb-today').click();await T('gb-denture').click();
// ---- 390
await p.setViewportSize({width:390,height:800});await p.waitForTimeout(600);
await T('gb-denture').scrollIntoViewIfNeeded();await T('gb-denture').click();await T('gb-jaw').filter({hasText:'Upper'}).click();await T('gb-new').click();await p.waitForTimeout(400);
ok('390: side scroll nahi',await p.evaluate(()=>document.documentElement.scrollWidth<=391),String(await p.evaluate(()=>document.documentElement.scrollWidth)));
const bb=await T('gb-box').boundingBox();ok('390: dabba screen ke andar',bb.x>=0&&bb.x+bb.width<=391);
await T('gb-box').screenshot({path:S+'6-mobile-390.png'});
await T('gb-denture').click();await T('gb-bridge').click();await p.waitForTimeout(300);
await L.tap(p,'Lower Left First Molar');await L.tap(p,'Lower Left Second Molar');await p.waitForTimeout(500);
ok('390: bridge panel khula, qism dab sakti hai',await T('bridge-panel').isVisible());
await p.screenshot({path:S+'7-mobile-bridge.png'});
await T('bridge-panel').locator('[data-testid=gb-type]').filter({hasText:'Zirconia Bridge'}).click();await p.waitForTimeout(600);
ok('390: bridge ki line bani',await T('group-card').filter({hasText:'Zirconia Bridge'}).count()===1);
ok('390: bridge ke baad side scroll nahi',await p.evaluate(()=>document.documentElement.scrollWidth<=391));
ok('koi page error nahi',errs.length===0,errs.join(' || '));
L.q("update treatment_catalog set is_active=false, name=name||' (test '||left(id::text,6)||')' where name in ('Immediate Denture','Test Metal Bridge','Immediate Denture - Upper')");L.q("update treatment_catalog set price=0 where name='Flexible Denture'");
console.log('TOTAL',pass,'pass',fail,'fail');process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,600));console.log('so far',pass,fail,errs.join('|'));process.exit(1)});

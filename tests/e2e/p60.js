const L=require('./lib2.js');
(async()=>{const {p}=await L.open(390);
const pid=await L.newPatient(p,'Chart Ph '+Date.now(),'0301'+String(Date.now()).slice(-7));
await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(700);
await p.getByRole('button',{name:/Daant|Chart/i}).first().click().catch(()=>{});
await p.mouse.click(200,315);await p.waitForTimeout(800);
await p.screenshot({path:'/tmp/prst/ph2.png'});
const sh=p.locator('div.fixed.bottom-0.z-40');console.log('sheet',await sh.count(),await sh.count()?JSON.stringify(await sh.first().boundingBox()):'');
console.log('overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(500);await p.screenshot({path:'/tmp/prst/ph3.png'});
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

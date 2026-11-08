const L=require('./lib2.js');
(async()=>{const {p}=await L.open(1280);
const r=await p.request.get('http://localhost:3055/api/backup');console.log('status',r.status());
const j=JSON.parse(await r.text());console.log('problems',JSON.stringify(j.problems));
let bad=0;for(const [t,n] of Object.entries(j.counts)){const d=Number(L.q(`select count(*) from ${t}`));if(d!==n){bad++;console.log('MISMATCH',t,n,d)}}
console.log('tables',Object.keys(j.counts).length,'mismatch',bad,'patients',j.counts.patients,'payment_plans',j.counts.payment_plans);
// anon must be refused
const c2=await (await require('playwright').chromium.launch()).newContext();const r2=await c2.request.get('http://localhost:3055/api/backup');console.log('anon status',r2.status());
process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

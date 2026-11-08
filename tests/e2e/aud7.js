const L=require('./lib2.js');
const pages='/admin /admin/dashboard /admin/accounts /admin/appointments /admin/attendance /admin/audit /admin/billing /admin/birthdays /admin/closing /admin/cms /admin/dues /admin/expenses /admin/follow-ups /admin/insights /admin/inventory /admin/inventory/count /admin/inventory/purchases /admin/invoices /admin/lab /admin/lab/hisaab /admin/ledger-check /admin/loyalty /admin/patients /admin/payroll /admin/payroll/report /admin/prescriptions /admin/prices /admin/recall /admin/recycle-bin /admin/reminders /admin/reports /admin/settings /admin/staff /admin/summary /admin/team /admin/treatments'.split(' ');
const bad=/undefined|\bnull\b|\bNaN\b|\[object|Unknown|chhoot|riyayat|Something went wrong|Application error/;
(async()=>{for(const w of [1280,390]){const {p}=await L.open(w);const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,120))});
 for(const u of pages){errs.length=0;const t=Date.now();let st='';try{const r=await p.goto('http://localhost:3055'+u,{waitUntil:'networkidle',timeout:25000});st=r.status()}catch(e){st='TIMEOUT'}
  const ms=Date.now()-t;const info=await p.evaluate(()=>({ov:document.documentElement.scrollWidth>window.innerWidth+1,txt:document.body.innerText,btn:document.querySelectorAll('button,a').length,small:[...document.querySelectorAll('button,a')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.height<28)}).length})).catch(()=>({txt:'',ov:false,btn:0,small:0}));
  const m=info.txt.match(bad);
  const flags=[st!==200?'st'+st:'',info.ov?'OVERFLOW':'',m?'WORD:'+m[0]:'','',ms>6000?'SLOW'+ms:'',info.txt.length<200?'EMPTY':''].filter(Boolean);
  if(flags.length)console.log(w,u,flags.join(' | '));}
 console.log('done',w)}
process.exit(0)})();

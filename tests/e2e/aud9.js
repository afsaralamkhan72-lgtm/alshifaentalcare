const L=require('./lib2.js');
const pages=require('fs').readFileSync('aud7.js','utf8').match(/const pages='([^']*)'/)[1].split(' ');
(async()=>{const {p}=await L.open(1280);
const errs=[],bad=[];let cur='';
p.on('console',m=>{if(m.type()==='error')errs.push(cur+' CONSOLE '+m.text().slice(0,140))});
p.on('pageerror',e=>errs.push(cur+' PAGEERROR '+String(e).slice(0,140)));
p.on('response',r=>{const s=r.status();if(s>=400&&!/favicon|\/_next\/image/.test(r.url()))bad.push(cur+' '+s+' '+r.url().replace('http://localhost:3055','').slice(0,110))});
const links=new Set();
for(const u of pages){cur=u;try{await p.goto('http://localhost:3055'+u,{waitUntil:'networkidle',timeout:25000})}catch(e){errs.push(u+' TIMEOUT');continue}
 const r=await p.evaluate(()=>{const ids={};document.querySelectorAll('[id]').forEach(e=>ids[e.id]=(ids[e.id]||0)+1);const dup=Object.keys(ids).filter(k=>ids[k]>1);const hrefs=[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h&&h.startsWith('/')&&!h.startsWith('//'));return {dup,hrefs}});
 if(r.dup.length)errs.push(u+' DUPLICATE_IDS '+r.dup.slice(0,4).join(','));r.hrefs.forEach(h=>links.add(h.split('#')[0].split('?')[0]))}
console.log('pages',pages.length,'unique internal links',links.size);
const broken=[];
for(const h of links){if(/\/patients\/[0-9a-f-]{36}|\/visits\/|\/invoices\/|\/staff\/|print|logout|\/api\/|\/r\/|\/portal|\/hazri/.test(h))continue;const st=await p.evaluate(async h=>{try{const r=await fetch(h,{redirect:'manual'});return r.status||'redirect'}catch(e){return 'ERR'}},h);if(!(st===200||st===0||st==='redirect'))broken.push(h+' '+st)}
console.log('BROKEN LINKS:',broken.length?broken.join(' | '):'none');
console.log('CONSOLE/PAGE ERRORS:',errs.length);errs.slice(0,15).forEach(e=>console.log(' ',e));
console.log('HTTP >=400:',bad.length);bad.slice(0,15).forEach(e=>console.log(' ',e));
process.exit(0)})();

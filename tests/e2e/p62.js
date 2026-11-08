const L=require('./lib2.js');
const pages=require('fs').readFileSync('aud7.js','utf8').match(/const pages='([^']*)'/)[1].split(' ');
(async()=>{for(const w of [390,820]){const {p}=await L.open(w);let tot=0;
 for(const u of pages){try{await p.goto('http://localhost:3055'+u,{waitUntil:'networkidle',timeout:25000})}catch(e){console.log(u,'TIMEOUT');continue}
  const r=await p.evaluate(()=>{const out=[];document.querySelectorAll('button,a[href],input:not([type=hidden]),select').forEach(e=>{const b=e.getBoundingClientRect();if(b.width==0||b.height==0)return;const cs=getComputedStyle(e);if(cs.visibility==='hidden')return;if(e.closest('aside'))return;if(e.type==='checkbox'||e.type==='radio')return;if(b.height<32)out.push((e.innerText||e.getAttribute('aria-label')||e.name||e.tagName).slice(0,20)+':'+Math.round(b.height))});return {ov:document.documentElement.scrollWidth>innerWidth+1,small:out}});
  tot+=r.small.length;if(r.ov||r.small.length)console.log(w,u,r.ov?'OVERFLOW':'','small',r.small.length,r.small.slice(0,4).join(' | '))}
 console.log('width',w,'total small',tot)}
process.exit(0)})();

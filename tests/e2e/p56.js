const L=require('./lib2.js');
(async()=>{for(const w of [1280,390]){const {p}=await L.open(w);await p.goto('http://localhost:3055/admin/inventory',{waitUntil:'networkidle'});
console.log(w,'rows',await p.locator('tbody tr').count(),'overflow',await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),(await p.getByText('Root canal (RCT)').count()));}
process.exit(0)})();

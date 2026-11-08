const L=require('./lib2.js');const fs=require('fs');
(async()=>{const {p}=await L.open(1280);const r=await p.request.get('http://localhost:3055/api/backup');const b=await r.body();fs.writeFileSync('/tmp/prst/backup.json',b);console.log('status',r.status(),'bytes',b.length);process.exit(0)})();

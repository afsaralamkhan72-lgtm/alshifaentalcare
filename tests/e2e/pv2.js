const L=require('./lib2.js');
(async()=>{const r=await L.open(1280);const p=r.p;
const pid=await L.newPatient(p,'Pv Two '+Date.now().toString().slice(-4),'0309'+String(Date.now()).slice(-7));
let res=[];for(let i=0;i<3;i++){await p.goto('http://localhost:3055/admin/patients/'+pid,{waitUntil:'networkidle'});await p.waitForTimeout(1500);res.push(await p.getByRole('button',{name:'Agla →'}).count())}
console.log(res.every(x=>x===0)?'PASS 3 baar kholne par form khud nahi khula':'FAIL '+res);process.exit(0)})();

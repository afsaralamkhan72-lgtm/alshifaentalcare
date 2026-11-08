const {chromium}=require('playwright');const tok=require('./tok.json');
const sess={access_token:tok.user,refresh_token:'r',expires_in:2592000,expires_at:Math.floor(Date.now()/1000)+2592000,token_type:'bearer',user:{id:'11111111-1111-1111-1111-111111111111',aud:'authenticated',role:'authenticated',email:'t@t.com'}};
exports.open=async(w=390)=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:w,height:800}});
await c.addCookies([{name:'sb-127-auth-token',value:encodeURIComponent(JSON.stringify(sess)),domain:'localhost',path:'/'}]);
await c.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/,r=>r.abort());
const p=await c.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message.slice(0,200)));return {b,p}};
exports.ctrl=async(p)=>p.evaluate(()=>[...document.querySelectorAll('button,a,input,select,textarea')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.tagName[0]+':'+(e.innerText||e.placeholder||e.name||e.getAttribute('aria-label')||e.type||'').slice(0,28).replace(/\n/g,' ')+(e.href?'>'+e.getAttribute('href'):'')));

const {chromium}=require('playwright');const {execSync}=require('child_process');
const q=s=>execSync(`runuser -u postgres -- /usr/lib/postgresql/16/bin/psql -h /tmp/pgt -p 5544 -U postgres -d a3 -At -c "${s}"`).toString().trim();
let pass=0,fail=0;const ok=(n,c,x)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x||'')}};
const B='http://localhost:3055';
(async()=>{const b=await chromium.launch();
async function attempt(p,pw){await p.goto(B+'/login',{waitUntil:'networkidle'});await p.locator('input[type=email]').fill('t@t.com');await p.locator('input[type=password]').fill(pw);await p.getByRole('button',{name:'Login'}).click();await p.waitForTimeout(1800);return {url:p.url(),txt:await p.locator('body').innerText()}}
async function fresh(){const c=await b.newContext({viewport:{width:390,height:800}});await c.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/,r=>r.abort());return c.newPage()}
q("drop table if exists public.login_guard cascade");
let p=await fresh();
for(let i=0;i<7;i++){const r=await attempt(p,'bad'+i);if(i==6)ok('guard SQL nahi: 7 ghalat ke baad bhi wohi aam message',/Email ya password ghalat/.test(r.txt))}
let r=await attempt(p,'GoodPass1');ok('guard SQL nahi: sahi password se login chalta hai (fail-open)',/dashboard/.test(r.url),r.url);
execSync("runuser -u postgres -- /usr/lib/postgresql/16/bin/psql -h /tmp/pgt -p 5544 -U postgres -d a3 -q -f /home/claude/w/code/sql-security/SECURITY-2-login-limit.sql");
await new Promise(r=>setTimeout(r,1500));
p=await fresh();
r=await attempt(p,'GoodPass1');ok('guard ke baad sahi password se login',/dashboard/.test(r.url),r.url);
p=await fresh();
let msgs=[];for(let i=0;i<5;i++){const x=await attempt(p,'bad'+i);msgs.push(/Email ya password ghalat hai\./.test(x.txt))}
ok('5 ghalat: har baar wohi aam message',msgs.every(Boolean));
ok('5 ke baad lock lag gaya (DB)',q("select count(*) from login_guard where locked_until>now() and k like 'ei:%'")==='1');
r=await attempt(p,'GoodPass1');ok('lock mein sahi password bhi qabool nahi',!/dashboard/.test(r.url)&&/Email ya password ghalat hai\./.test(r.txt),r.url);
ok('message mein waqt/minute/lock lafz nahi',!/minute|lock|block|band|wait|koshish/i.test(r.txt.replace(/Login/g,'')),r.txt.slice(0,200));
q("update login_guard set locked_until=now()-interval '1 minute'");
r=await attempt(p,'GoodPass1');ok('15 minute baad (guzar jane par) sahi password se khud khul gaya',/dashboard/.test(r.url),r.url);
ok('sahi login ke baad counter saaf',q("select count(*) from login_guard where k like 'ei:%'")==='0');
ok('anon/authenticated guard functions nahi chala sakte',q("select has_function_privilege('anon','public.login_guard_check(text[])','execute') or has_function_privilege('authenticated','public.login_guard_fail(text,integer,integer)','execute')")==='f');
console.log('TOTAL '+(pass+fail)+' | FAIL '+fail);await b.close();process.exit(0)})().catch(e=>{console.log('CRASH',e.message.slice(0,300));process.exit(1)});

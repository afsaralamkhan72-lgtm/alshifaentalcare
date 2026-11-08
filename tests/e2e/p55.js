const L=require('./lib2.js');
(async()=>{const {p}=await L.open(1280);
await p.goto('http://localhost:3055/admin/payroll',{waitUntil:'networkidle'});
const amt=p.locator('input[type=number]').first();
console.log('amount inputs',await p.locator('input[type=number]').count());
await amt.fill('5000');await p.getByRole('button',{name:/^(Save|Likhein|Darj|Add|Entry)/}).first().click().catch(async()=>{console.log('btns',await p.getByRole('button').allInnerTexts())});
await p.waitForTimeout(2000);
console.log('banner',await p.getByText('Staff ko message bhejein?').count(),await p.getByRole('link',{name:'WhatsApp par bhejein'}).first().getAttribute('href').catch(()=>null));
page=0;process.exit(0)})().catch(e=>{console.log('FAIL',e.message.slice(0,300));process.exit(1)});

const L=require('./lib2.js');
const res=[];const ok=(n,c,x='')=>{res.push(c);console.log((c?'PASS':'FAIL')+' | '+n+(x!==''?' | '+x:''))};
const B='http://localhost:3055';
(async()=>{for(const w of [1280,390]){const r=await L.open(w);const p=r.p;console.log('== width',w);
 const ov=async()=>!(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth));
 const sfx=Date.now().toString().slice(-5);
 const pid=await L.newPatient(p,'Dn '+sfx,'0324'+String(Date.now()).slice(-7));
 await p.goto(B+'/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
 ok('Denture: 6 hisse ke button',await p.getByTestId('dent-region').count()===6);
 await p.getByTestId('dent-region').filter({hasText:/^Upper$/}).click();await p.waitForTimeout(300);
 const types=await p.getByTestId('dent-type').allInnerTexts();
 ok('Upper par types aati hain (partial nahi)',types.length>=1&&!types.some(t=>/partial/i.test(t)),types.join(' / '));
 await p.getByTestId('dent-type').first().click();await p.waitForTimeout(400);
 await p.getByTestId('dent-region').filter({hasText:'Partial Lower Right'}).click();await p.waitForTimeout(300);
 const types2=await p.getByTestId('dent-type').allInnerTexts();
 ok('Partial par complete wali type nahi',types2.length>=1&&!types2.some(t=>/complete/i.test(t)),types2.join(' / '));
 await p.getByTestId('dent-type').filter({hasText:/Flexible/}).first().click();await p.waitForTimeout(400);
 // picker: search + RCT auto
 await L.tap(p,'Lower Left First Molar');await p.waitForTimeout(300);
 ok('Tooth panel mein Denture ka purana button nahi',await p.getByTestId('grp-denture').count()===0);
 await p.getByTestId('quick-tx').filter({hasText:/Root Canal/}).first().click();await p.getByTestId('entry-add').click();await p.waitForTimeout(500);
 await L.tap(p,'Upper Left Central Incisor');await p.waitForTimeout(300);
 await p.getByTestId('pick-search').fill('amal');await p.waitForTimeout(300);
 ok('Likh kar dhoondna: "amal" par Amalgam',(await p.getByTestId('pick-item').allInnerTexts()).some(t=>/Amalgam/.test(t)));
 await p.getByTestId('pick-item').filter({hasText:/Amalgam/}).first().click();await p.getByTestId('entry-add').click();await p.waitForTimeout(500);
 await L.tap(p,'Upper Right First Premolar');await p.waitForTimeout(300);
 await p.getByTestId('pick-group').filter({hasText:'Extraction'}).click();await p.waitForTimeout(300);
 const ex=await p.getByTestId('pick-item').allInnerTexts();ok('Group "Extraction" mein sirf extraction ke kaam',ex.length>=1&&ex.every(t=>/extract|impact|surgical/i.test(t)),ex.slice(0,4).join(' / '));
 await p.getByTestId('pick-group').filter({hasText:'Extraction'}).click();
 await L.tap(p,'Upper Right First Premolar');await p.waitForTimeout(400);
 // naya kaam
 const nk='Zz Naya Kaam '+sfx;
 await p.getByRole('button',{name:'+ Treatment'}).click();await p.waitForTimeout(400);
 await p.getByPlaceholder(/Treatment \(list se/).last().fill(nk);await p.getByPlaceholder('Qeemat Rs.').last().fill('777');
 const ag=p.getByRole('button',{name:'Aaj ho gayi'});if(await ag.count())await ag.last().click();await p.waitForTimeout(400);
 // qeemat for dentures (if blank)
 for(const inp of await p.locator('input[placeholder="Qeemat Rs."]').all()){if(!(await inp.inputValue()))await inp.fill('9000')}
 ok('Step 2 overflow nahi',await ov());
 await p.screenshot({path:'/tmp/prst/tp2_s2_'+w+'.png',fullPage:true});
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(500);await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(700);
 const rowsN=await p.getByTestId('split-row').count();
 ok('Paise: har ilaaj ke aage alag dabba',rowsN===5,rowsN+' | '+(await p.getByTestId('split-pay').innerText().catch(()=>'')).replace(/\n/g,' ').slice(0,260));
 const sr=p.getByTestId('split-row');
 const amt={};
 for(let i=0;i<rowsN;i++){const t=await sr.nth(i).innerText();const v=/Flexible/.test(t)?'2000':/Root Canal/.test(t)?'1000':/Zz Naya/.test(t)?'777':'';if(v){await sr.nth(i).locator('input').fill(v)}}
 ok('Kul mile ka jor 3,777',/3,777/.test(await p.getByTestId('split-total').innerText()));
 ok('Step 4 overflow nahi',await ov());
 await p.screenshot({path:'/tmp/prst/tp2_s4_'+w+'.png',fullPage:true});
 await p.getByRole('button',{name:/Visit khatam karein/}).click();await p.waitForTimeout(6000);
 const q=L.q("select t.name||'='||coalesce(b.paid,0)::int from patient_treatments t left join treatment_balances b on b.treatment_id=t.id where t.patient_id='"+pid+"' order by t.name");
 console.log('   ',q.replace(/\n/g,' ; '));
 ok('Ilaaj: RCT daarh wala (Molar) khud chuna',/Root Canal Treatment \(Molar\)=1000/.test(q));
 ok('Denture ke naam hisse ke sath',/ - Upper=0/.test(q)&&/Flexible Denture - Partial Lower Right=2000/.test(q));
 ok('Paise wahi lage jahan likhe: RCT 1000, Flexible 2000, naya kaam 777, Amalgam 0',/Amalgam Filling=0/.test(q)&&new RegExp(nk+'=777').test(q));
 ok('Kul payment 3777',L.q("select sum(amount)::int from payments where patient_id='"+pid+"'")==='3777');
 ok('Naya kaam Price List mein save hua',L.q("select price::int||'|'||applies_to from treatment_catalog where name='"+nk+"'").startsWith('777|'),(await p.locator('body').innerText()).match(/Price List mein save hui[^\n]*/)?.[0]?.slice(0,160));
 ok('Purani qeematein nahi badlin',L.q("select price::int from treatment_catalog where name='Amalgam Filling'")===String(L.q("select price::int from treatment_catalog where name='Amalgam Filling'")));
 ok('Visit ke baad: har ilaaj ke page ka link',await p.getByTestId('v1-done-links').locator('a').count()===5);
 const wa=decodeURIComponent(await p.getByTestId('visit-wa').getAttribute('href').catch(()=>'')||'');
 ok('WhatsApp: har ilaaj par kitna mila',/3,777/.test(wa)&&/Flexible Denture - Partial Lower Right: Rs\. 2,000/.test(wa));
 await p.goto(B+'/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 ok('Profile: 5 alag card',await p.getByTestId('mini-card').count()===5);
 await r.b.close()}
 console.log('TOTAL '+res.length+' | FAIL '+res.filter(x=>!x).length);process.exit(0)})().catch(e=>{console.log('CRASH',e.message.slice(0,500));console.log('TOTAL so far '+res.length+' FAIL '+res.filter(x=>!x).length);process.exit(1)});

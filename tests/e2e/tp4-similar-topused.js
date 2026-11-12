const L=require('./lib2.js');
const res=[];const ok=(n,c,x='')=>{res.push(c);console.log((c?'PASS':'FAIL')+' | '+n+(x!==''?' | '+x:''))};
const B='http://localhost:3055';
(async()=>{for(const w of [1280,390]){const r=await L.open(w);const p=r.p;console.log('== width',w);
 const sfx=Date.now().toString().slice(-5);
 const pid=await L.newPatient(p,'Sm '+sfx,'0325'+String(Date.now()).slice(-7));
 await p.goto(B+'/admin/patients/'+pid,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1800);
 const st=p.getByRole('button',{name:/Naya visit shuru/});if(await st.count()){await st.click();await p.waitForTimeout(800)}
 await p.getByRole('button',{name:'Agla →'}).click();await p.waitForTimeout(900);
 // top used
 const top=L.q("select t.name from patient_treatments t join treatment_catalog c on lower(c.name)=lower(t.name) and coalesce(c.applies_to,'tooth')='tooth' and c.department<>'homeopathic' where t.status<>'cancelled' and t.created_at>now()-interval '365 days' and t.name !~* 'bridge|denture' group by t.name order by count(*) desc limit 3").split('\n');
 await L.tap(p,'Lower Left First Molar');await p.waitForTimeout(400);
 const quick=await p.getByTestId('quick-tx').allInnerTexts();
 const has=n=>quick.some(q=>q.includes(n)||(/root canal/i.test(n)&&/Root Canal/.test(q)));
 ok('Upar ke button: sab se zyada chalne wale kaam shamil',top.every(has),'zyada: '+top.join(' / ')+' || button: '+quick.join(' / '));
 ok('Button 8 se zyada nahi',quick.length<=8,quick.length+'');
 await L.tap(p,'Lower Left First Molar');await p.waitForTimeout(300);
 // similar name: yes
 const price=L.q("select price::int from treatment_catalog where name='Flexible Denture'");
 await p.getByRole('button',{name:'+ Treatment'}).click();await p.waitForTimeout(400);
 const nm=p.getByPlaceholder(/Treatment \(list se/).last();
 await nm.fill('Flexi denture');await p.waitForTimeout(400);
 ok('Milta julta naam: sawal aaya',await p.getByTestId('similar-box').count()===1,(await p.getByTestId('similar-box').innerText().catch(()=>'')).replace(/\n/g,' ').slice(0,140));
 await p.getByTestId('similar-yes').filter({hasText:'Flexible Denture'}).first().click();await p.waitForTimeout(400);
 ok('"Haan" par list wala naam lag gaya, sawal hat gaya',await nm.inputValue()==='Flexible Denture'&&await p.getByTestId('similar-box').count()===0);
 if(Number(price)>0)ok('"Haan" par list ki qeemat lag gayi',await p.getByPlaceholder('Qeemat Rs.').last().inputValue()===price,price);
 // similar name: no -> new
 const nk='Composit Filing '+sfx;
 await p.getByRole('button',{name:'+ Treatment'}).click();await p.waitForTimeout(400);
 const nm2=p.getByPlaceholder(/Treatment \(list se/).last();
 await nm2.fill('Composit Filing');await p.waitForTimeout(400);
 ok('Spelling ke farq par bhi sawal',await p.getByTestId('similar-box').count()===1&&/Composite Filling/.test(await p.getByTestId('similar-box').innerText()));
 await p.getByTestId('similar-no').click();await p.waitForTimeout(300);
 ok('"Nahi, naya kaam" par sawal hat gaya, naam wahi raha',await p.getByTestId('similar-box').count()===0&&await nm2.inputValue()==='Composit Filing');
 await nm2.fill(nk);await p.waitForTimeout(300);
 // unrelated: no question
 await p.getByRole('button',{name:'+ Treatment'}).click();await p.waitForTimeout(400);
 const nm3=p.getByPlaceholder(/Treatment \(list se/).last();await nm3.fill('Bone Graft Special '+sfx);await p.waitForTimeout(400);
 ok('Bilkul alag naam par sawal nahi',await p.getByTestId('similar-box').count()<=1&&!(await p.getByTestId('similar-box').allInnerTexts()).join(' ').includes('Bone'));
 ok('Overflow nahi',!(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)));
 await p.screenshot({path:'/tmp/prst/tp4_'+w+'.png',fullPage:true});
 await r.b.close()}
 console.log('TOTAL '+res.length+' | FAIL '+res.filter(x=>!x).length);process.exit(0)})().catch(e=>{console.log('CRASH',e.message.slice(0,500));console.log('TOTAL so far '+res.length+' FAIL '+res.filter(x=>!x).length);process.exit(1)});

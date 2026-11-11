const L=require('./lib2.js');
const res=[];const ok=(n,c,x='')=>{res.push(c);console.log((c?'PASS':'FAIL')+' | '+n+(x!==''?' | '+x:''))};
const B='http://localhost:3055';
(async()=>{for(const w of [1280,390]){const r=await L.open(w);const p=r.p;console.log('== width',w);
 const row=L.q("select p.full_name||'|'||t.id||'|'||p.id from patients p join patient_treatments t on t.patient_id=p.id where p.full_name like 'Fl %' and t.status='active' and t.name ilike '%crown%' and not exists(select 1 from lab_cases l where l.treatment_id=t.id) order by p.created_at desc limit 1").split('|');
 await p.goto(B+'/admin/lab',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2000);
 await p.getByRole('button',{name:/New Lab Case|Naya lab case|\+ /}).first().click();await p.waitForTimeout(600);
 ok('Mareez chunne se pehle ilaaj ka khana nahi',await p.getByTestId('lab-treatment').count()===0);
 await p.getByPlaceholder('Naam, phone ya MR number likhein...').fill(row[0]);await p.waitForTimeout(1500);
 await p.getByRole('button',{name:new RegExp(row[0])}).first().click();await p.waitForTimeout(1500);
 ok('Mareez chunte hi crown khud chun liya',await p.getByTestId('lab-treatment').inputValue().catch(()=>'')===row[1]);
 const opts=await p.getByTestId('lab-treatment').locator('option').allInnerTexts();
 ok('List mein sirf lab wala ilaaj',opts.filter(o=>o.trim()&&o.trim()!=='—').length===1,opts.join(' / '));
 ok('Overflow nahi',!(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)));
 await p.getByRole('button',{name:'Badlein'}).click();await p.waitForTimeout(300);
 ok('Mareez badalne par ilaaj saaf',await p.getByTestId('lab-treatment').count()===0);
 await r.b.close()}
 console.log('TOTAL '+res.length+' | FAIL '+res.filter(x=>!x).length);process.exit(0)})().catch(e=>{console.log('CRASH',e.message.slice(0,400));process.exit(1)});

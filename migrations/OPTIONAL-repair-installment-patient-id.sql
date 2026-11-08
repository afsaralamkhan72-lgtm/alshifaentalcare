-- OPTIONAL, sirf aap ki ijazat se. Ye FINAL58 se pehle ki qist payments theek karta hai jin mein patient ka naam transaction par nahi laga tha.
-- 1) Pehle PREVIEW chalayein (sirf dekhta hai, kuch nahi badalta). Har qist ke saath kitni transaction milti hain wo dikhata hai.
-- 2) Agar sirf wahi qistein aayein jin ko aap pehchante hain (match_count = 1), tab neeche wala UPDATE chalayein.
-- Backup lekar hi. Ye sirf transactions.patient_id khali se bharta hai, raqam ya tareekh nahi badalta.

-- PREVIEW
select t.id as tx_id, t.transaction_date, t.amount, t.description, p.id as patient_id, p.full_name, count(*) over (partition by t.id) as match_count
from public.transactions t
join public.treatment_plans tp on t.description like tp.title || ', installment #%'
join public.installments i on i.plan_id = tp.id and t.description like '%installment #' || i.installment_no || ' (%' and i.paid_amount = t.amount and i.paid_date = t.transaction_date
join public.patients p on p.id = tp.patient_id and t.description like '%(' || p.full_name || ')'
where t.type = 'income' and t.category = 'treatment-installment' and t.patient_id is null;

-- UPDATE (sirf jahan ek hi patient match ho)
with m as (
  select t.id as tx_id, tp.patient_id, count(*) over (partition by t.id) as c
  from public.transactions t
  join public.treatment_plans tp on t.description like tp.title || ', installment #%'
  join public.installments i on i.plan_id = tp.id and t.description like '%installment #' || i.installment_no || ' (%' and i.paid_amount = t.amount and i.paid_date = t.transaction_date
  join public.patients p on p.id = tp.patient_id and t.description like '%(' || p.full_name || ')'
  where t.type = 'income' and t.category = 'treatment-installment' and t.patient_id is null
)
update public.transactions t set patient_id = m.patient_id from m where t.id = m.tx_id and m.c = 1;

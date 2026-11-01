-- =====================================================================
-- PHASE 4: PATIENT LEDGER + AIK HI BALANCE FORMULA
-- Al Shifa Health Care
--
-- SIRF do "view" (sirf parhne wali list) banata hai. Koi table, row ya column nahi badalta.
-- Dobara chalane se koi nuqsan nahi.
-- Pehle phase2 aur phase3 chali honi chahiye.
-- PEHLE test (staging) project par chalayein.
--
-- FORMULA (har screen par yahi):
--   PURANA HISAAB (jo naye invoice system se pehle ka hai):
--     charges = treatment plans ki total_cost (cancelled ko chhor kar)
--             + walk-in bills (rate - discount)
--     paid    = plan ki advance + installments jo mile
--             + baqaya/walk-in payments (jo installment ki dohri entry nahi)
--     purana baqaya = max(0, charges - paid)
--   NAYA HISAAB: active invoices ka (total - mile)
--   KUL BAQAYA = purana baqaya + naya baqaya
--
-- "legacy_balance": purani screens ka formula, sirf muqabile ke liye (farq dekhne ke liye).
-- =====================================================================

create or replace view public.patient_balances
with (security_invoker = true)
as
with plan as (
  select patient_id,
         coalesce(sum(case when status <> 'cancelled' then total_cost else 0 end), 0)            as charges,
         coalesce(sum(coalesce(advance_paid, 0)), 0)                                              as advance,
         coalesce(sum(total_cost), 0)                                                             as all_charges
  from public.treatment_plans
  group by patient_id
),
inst as (
  select p.patient_id, coalesce(sum(i.paid_amount), 0) as paid
  from public.installments i
  join public.treatment_plans p on p.id = i.plan_id
  group by p.patient_id
),
tx as (
  select patient_id,
         coalesce(sum(case when rate is not null then rate - coalesce(discount_amount, 0) else 0 end), 0) as charges,
         coalesce(sum(case when treatment_name ~* '\((month|advance) ?[0-9]*\)\s*$'
                             or category = 'treatment-installment' then 0
                           else amount end), 0)                                                         as paid
  from public.transactions
  where type = 'income' and patient_id is not null and invoice_id is null
  group by patient_id
),
legacy as (
  select patient_id,
         coalesce(sum(case when rate is not null then rate - coalesce(discount_amount, 0) else 0 end), 0) as charges,
         coalesce(sum(amount), 0)                                                                         as paid
  from public.transactions
  where type = 'income' and patient_id is not null
  group by patient_id
),
inv as (
  select patient_id,
         coalesce(sum(case when status = 'active' then total else 0 end), 0)       as total,
         coalesce(sum(case when status = 'active' then paid_amount else 0 end), 0) as paid,
         coalesce(sum(balance), 0)                                                 as balance
  from public.invoices
  group by patient_id
)
select
  pt.id                                                              as patient_id,
  coalesce(plan.charges, 0) + coalesce(tx.charges, 0)                as old_charges,
  coalesce(plan.advance, 0) + coalesce(inst.paid, 0) + coalesce(tx.paid, 0) as old_paid,
  greatest(0, coalesce(plan.charges, 0) + coalesce(tx.charges, 0)
              - coalesce(plan.advance, 0) - coalesce(inst.paid, 0) - coalesce(tx.paid, 0)) as old_balance,
  coalesce(inv.total, 0)                                             as new_total,
  coalesce(inv.paid, 0)                                              as new_paid,
  coalesce(inv.balance, 0)                                           as new_balance,
  coalesce(plan.charges, 0) + coalesce(tx.charges, 0) + coalesce(inv.total, 0) as total_charges,
  coalesce(plan.advance, 0) + coalesce(inst.paid, 0) + coalesce(tx.paid, 0) + coalesce(inv.paid, 0) as total_paid,
  greatest(0, coalesce(plan.charges, 0) + coalesce(tx.charges, 0)
              - coalesce(plan.advance, 0) - coalesce(inst.paid, 0) - coalesce(tx.paid, 0))
    + coalesce(inv.balance, 0)                                       as balance,
  greatest(0, coalesce(plan.all_charges, 0) + coalesce(legacy.charges, 0) - coalesce(legacy.paid, 0)) as legacy_balance
from public.patients pt
left join plan   on plan.patient_id   = pt.id
left join inst   on inst.patient_id   = pt.id
left join tx     on tx.patient_id     = pt.id
left join legacy on legacy.patient_id = pt.id
left join inv    on inv.patient_id    = pt.id
where pt.deleted_at is null;

-- ---------------------------------------------------------------------
-- Patient ki poori timeline: kab kya charge hua, kab kitna mila.
-- source = 'old' (purana hisaab) ya 'new' (naya invoice system)
-- Running balance screen par dikhai jati hai.
-- ---------------------------------------------------------------------
create or replace view public.patient_ledger
with (security_invoker = true)
as
-- Treatment plans
select p.patient_id, p.start_date as entry_date, p.created_at as sort_at, 'old'::text as source,
       'plan'::text as kind, p.title as label,
       case when p.status <> 'cancelled' then p.total_cost else 0 end as charge,
       0::numeric as payment, p.id as ref_id
from public.treatment_plans p
union all
select p.patient_id, p.start_date, p.created_at, 'old', 'plan_advance', 'Advance: ' || p.title,
       0, p.advance_paid, p.id
from public.treatment_plans p where coalesce(p.advance_paid, 0) > 0
union all
select p.patient_id, coalesce(i.paid_date, p.start_date), coalesce(i.created_at, p.created_at), 'old', 'installment',
       p.title || ' - installment #' || i.installment_no, 0, i.paid_amount, i.id
from public.installments i join public.treatment_plans p on p.id = i.plan_id
where i.paid_amount > 0
union all
-- Purane bills aur payments (installment ki dohri entry chhor kar, wo upar aa chuki)
select t.patient_id, t.transaction_date, t.created_at, 'old',
       case when t.rate is not null then 'bill' else 'payment' end,
       coalesce(t.treatment_name, t.description, t.category, 'Entry'),
       case when t.rate is not null then t.rate - coalesce(t.discount_amount, 0) else 0 end,
       t.amount, t.id
from public.transactions t
where t.type = 'income' and t.patient_id is not null and t.invoice_id is null
  and not (t.treatment_name ~* '\((month|advance) ?[0-9]*\)\s*$' or t.category = 'treatment-installment')
union all
-- Naye invoices
select i.patient_id, i.invoice_date, i.created_at, 'new',
       case when i.status = 'void' then 'invoice_void' else 'invoice' end,
       i.invoice_number || case when i.status = 'void' then ' (cancel)' else '' end,
       case when i.status = 'void' then 0 else i.total end, 0, i.id
from public.invoices i
union all
select pay.patient_id, pay.paid_on, pay.created_at, 'new',
       case when pay.kind = 'payment' then 'invoice_payment' else 'refund' end,
       (case when pay.kind = 'payment' then 'Payment ' else 'Refund ' end) || i.invoice_number,
       0, case when pay.kind = 'payment' then pay.amount else -pay.amount end, pay.id
from public.payments pay join public.invoices i on i.id = pay.invoice_id
where i.status = 'active';

grant select on public.patient_balances, public.patient_ledger to authenticated;
revoke all on public.patient_balances, public.patient_ledger from anon;

-- Patient portal (service key) bhi ye views parh sake
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.patient_balances, public.patient_ledger to service_role;
  end if;
end $$;

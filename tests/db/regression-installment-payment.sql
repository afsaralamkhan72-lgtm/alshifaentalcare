-- Al Shifa: qist (installment) aur purane baqaya ki payment, atomic RPC. SIRF TEST project. Aakhir mein ROLLBACK.
begin;
select set_config('request.jwt.claim.sub', (select id::text from public.staff_profiles where role in ('admin','doctor') and is_active order by created_at limit 1), true);
select set_config('role', 'authenticated', true);
do $$
declare pid uuid; plan uuid; i1 uuid; i2 uuid; tx uuid; tx2 uuid; due uuid; n int; ok boolean; v record; before_income numeric; pb record;
begin
  insert into public.patients (full_name, phone, department) values ('RT Inst', '0300' || (random()*9999999)::int, 'dental') returning id into pid;
  insert into public.treatment_plans (patient_id, title, total_cost, advance_paid, duration_months, monthly_amount, treating_doctor)
    values (pid, 'RT Plan', 12000, 2000, 2, 5000, 'Dr RT') returning id into plan;
  insert into public.installments (plan_id, installment_no, due_date, amount) values (plan, 1, current_date, 5000) returning id into i1;
  insert into public.installments (plan_id, installment_no, due_date, amount) values (plan, 2, current_date + 30, 5000) returning id into i2;
  select coalesce(sum(amount),0) into before_income from public.transactions where type='income';

  tx := public.pay_installment(i1, 5000, 'cash', 'visit note test', i1::text);
  select * into v from public.installments where id = i1;
  select count(*) into n from public.transactions where id = tx and patient_id = pid and amount = 5000 and category = 'treatment-installment';
  if v.paid_amount = 5000 and n = 1 then raise notice 'PASS installment paid: installment + transaction (with patient_id) created together'; else raise exception 'FAIL pay %', v; end if;

  select count(*) into n from public.visit_notes where plan_id = plan and procedure = 'visit note test';
  if n = 1 then raise notice 'PASS visit note saved with payment'; else raise exception 'FAIL visit note'; end if;

  tx2 := public.pay_installment(i1, 5000, 'cash', null, i1::text);
  select count(*) into n from public.transactions where description like 'RT Plan, installment #1';
  if tx2 = tx and n = 1 then raise notice 'PASS duplicate click / retry returns same payment, no second transaction'; else raise exception 'FAIL duplicate click'; end if;

  ok := false; begin perform public.pay_installment(i1, 100, 'cash', null, 'other-key'); exception when others then ok := true; end;
  if ok then raise notice 'PASS already-paid installment cannot be paid again'; else raise exception 'FAIL double pay'; end if;

  ok := false; begin perform public.pay_installment(i2, 6000, 'cash'); exception when others then ok := true; end;
  if ok then raise notice 'PASS overpay beyond plan balance blocked'; else raise exception 'FAIL overpay'; end if;
  ok := false; begin perform public.pay_installment(i2, 0, 'cash'); exception when others then ok := true; end;
  if ok then raise notice 'PASS zero amount blocked'; else raise exception 'FAIL zero'; end if;
  ok := false; begin perform public.pay_installment(i2, 100, 'crypto'); exception when others then ok := true; end;
  if ok then raise notice 'PASS bad method blocked'; else raise exception 'FAIL method'; end if;
  select paid_amount into v from public.installments where id = i2;
  if v.paid_amount = 0 then raise notice 'PASS failed attempts left installment untouched'; else raise exception 'FAIL partial write'; end if;

  select * into pb from public.patient_balances where patient_id = pid;
  if pb.balance = 12000 - 2000 - 5000 then raise notice 'PASS patient balance = total - advance - installment (%)', pb.balance; else raise exception 'FAIL balance %', pb.balance; end if;
  select coalesce(sum(amount),0) - before_income into pb.old_paid from public.transactions where type='income';
  if pb.old_paid = 5000 then raise notice 'PASS income increased by exactly 5000 (no double count)'; else raise exception 'FAIL income delta %', pb.old_paid; end if;

  -- purana baqaya
  insert into public.transactions (patient_id, type, category, treatment_name, amount, balance_due, rate, payment_method, treating_doctor)
    values (pid, 'income', 'treatment', 'RT Old', 1000, 3000, 4000, 'cash', 'Dr RT') returning id into due;
  tx := public.pay_legacy_due(due, 1000, 'cash', 'k1');
  tx2 := public.pay_legacy_due(due, 1000, 'cash', 'k1');
  select balance_due into v from public.transactions where id = due;
  if tx = tx2 and v.balance_due = 2000 then raise notice 'PASS legacy due: balance reduced once, retry safe'; else raise exception 'FAIL legacy due %', v; end if;
  ok := false; begin perform public.pay_legacy_due(due, 5000, 'cash'); exception when others then ok := true; end;
  if ok then raise notice 'PASS legacy due overpay blocked'; else raise exception 'FAIL legacy overpay'; end if;
end $$;
rollback;

create or replace function public.pay_installment(p_installment_id uuid, p_amount numeric, p_method text, p_note text default null, p_idempotency_key text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_inst public.installments%rowtype;
  v_plan public.treatment_plans%rowtype;
  v_amt numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_paid numeric(12,2);
  v_tx uuid;
begin
  if not (public.is_owner() or public.has_perm('billing.collect')) then
    raise exception 'Aap ko payment lene ki permission nahi';
  end if;
  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtext('inst:' || p_idempotency_key));
    select id into v_tx from public.transactions where idempotency_key = 'inst:' || p_idempotency_key;
    if found then return v_tx; end if;
  end if;
  select * into v_inst from public.installments where id = p_installment_id for update;
  if not found then raise exception 'Qist nahi mili'; end if;
  select * into v_plan from public.treatment_plans where id = v_inst.plan_id for update;
  if v_plan.status = 'cancelled' then raise exception 'Ye plan cancel ho chuka hai'; end if;
  if coalesce(v_inst.paid_amount, 0) > 0 then raise exception 'Is qist ki payment pehle se likhi ja chuki hai'; end if;
  if v_amt <= 0 then raise exception 'Raqam 0 se zyada honi chahiye'; end if;
  if coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;
  select coalesce(sum(paid_amount), 0) into v_paid from public.installments where plan_id = v_plan.id;
  if v_amt > v_plan.total_cost - coalesce(v_plan.advance_paid, 0) - v_paid then
    raise exception 'Raqam plan ke baqaya (Rs. %) se zyada hai', v_plan.total_cost - coalesce(v_plan.advance_paid, 0) - v_paid;
  end if;

  update public.installments
     set paid_amount = v_amt, paid_date = v_today, payment_method = p_method, recorded_by = v_uid
   where id = v_inst.id;

  insert into public.transactions
    (patient_id, type, category, treatment_name, description, amount, balance_due, payment_method,
     doctor_id, treating_doctor, transaction_date, settled_at, recorded_by, idempotency_key)
  values
    (v_plan.patient_id, 'income', 'treatment-installment',
     v_plan.title || ' (month ' || v_inst.installment_no || ')',
     v_plan.title || ', installment #' || v_inst.installment_no,
     v_amt, 0, p_method, v_plan.doctor_id, v_plan.treating_doctor, v_today, now(), v_uid,
     case when p_idempotency_key is null then null else 'inst:' || p_idempotency_key end)
  returning id into v_tx;

  if nullif(btrim(coalesce(p_note, '')), '') is not null then
    insert into public.visit_notes (patient_id, plan_id, visit_date, procedure, next_visit, doctor_id)
    values (v_plan.patient_id, v_plan.id, v_today, btrim(p_note), v_today + interval '1 month', v_uid);
  end if;
  return v_tx;
end $$;
grant execute on function public.pay_installment(uuid, numeric, text, text, text) to authenticated;

create or replace function public.pay_legacy_due(p_tx_id uuid, p_amount numeric, p_method text, p_idempotency_key text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_tx public.transactions%rowtype;
  v_amt numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_new numeric(12,2);
  v_id uuid;
begin
  if not (public.is_owner() or public.has_perm('billing.collect')) then
    raise exception 'Aap ko payment lene ki permission nahi';
  end if;
  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtext('due:' || p_idempotency_key));
    select id into v_id from public.transactions where idempotency_key = 'due:' || p_idempotency_key;
    if found then return v_id; end if;
  end if;
  select * into v_tx from public.transactions where id = p_tx_id for update;
  if not found then raise exception 'Entry nahi mili'; end if;
  if v_tx.invoice_id is not null then raise exception 'Ye naye invoice ki entry hai; invoice se payment lein'; end if;
  if v_tx.type <> 'income' or coalesce(v_tx.balance_due, 0) <= 0 then raise exception 'Is entry ka koi baqaya nahi'; end if;
  if v_amt <= 0 then raise exception 'Raqam 0 se zyada honi chahiye'; end if;
  if v_amt > v_tx.balance_due then raise exception 'Raqam baqaya (Rs. %) se zyada hai', v_tx.balance_due; end if;
  if coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;
  v_new := v_tx.balance_due - v_amt;
  update public.transactions
     set balance_due = v_new, settled_at = case when v_new = 0 then now() else null end
   where id = v_tx.id;
  insert into public.transactions
    (patient_id, type, category, treatment_name, amount, balance_due, payment_method, treating_doctor,
     transaction_date, settled_at, recorded_by, idempotency_key)
  values
    (v_tx.patient_id, 'income', 'treatment',
     case when v_tx.treatment_name is not null then v_tx.treatment_name || ' (baqaya)' else 'Baqaya payment' end,
     v_amt, 0, p_method, v_tx.treating_doctor, v_today, now(), v_uid,
     case when p_idempotency_key is null then null else 'due:' || p_idempotency_key end)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.pay_legacy_due(uuid, numeric, text, text) to authenticated;

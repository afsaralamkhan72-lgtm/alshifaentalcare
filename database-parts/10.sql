SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: open_clinical_visit(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.open_clinical_visit(p_patient_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v uuid;
begin
  if not public.has_perm('clinical.edit') then raise exception 'Aap ko visit likhne ki permission nahi'; end if;
  if not exists (select 1 from public.patients where id = p_patient_id and deleted_at is null) then raise exception 'Patient nahi mila'; end if;
  perform pg_advisory_xact_lock(hashtext('cv:' || p_patient_id::text));
  select id into v from public.clinical_visits
   where patient_id = p_patient_id and status = 'draft' and visit_date = public._karachi_today()
   order by created_at desc limit 1;
  if found then return v; end if;
  insert into public.clinical_visits (patient_id, created_by, doctor)
  values (p_patient_id, auth.uid(), (select full_name from public.staff_profiles where id = auth.uid() and role in ('admin','doctor')))
  returning id into v;
  return v;
end $$;


--
-- Name: pay_installment(uuid, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pay_installment(p_installment_id uuid, p_amount numeric, p_method text, p_note text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: pay_lab_case(uuid, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pay_lab_case(p_case_id uuid, p_amount numeric, p_method text DEFAULT 'cash'::text, p_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_c     public.lab_cases%rowtype;
  v_amt   numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_pname text;
  v_id    uuid;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;
  if v_amt <= 0 then raise exception 'Raqam 0 se zyada honi chahiye'; end if;
  if coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('lab:' || p_key));
    select id into v_id from public.transactions where idempotency_key = p_key;
    if found then return v_id; end if;
  end if;

  select * into v_c from public.lab_cases where id = p_case_id and deleted_at is null for update;
  if not found then raise exception 'Lab case nahi mila'; end if;
  if v_amt > v_c.cost - v_c.lab_paid then
    raise exception 'Raqam lab ke baqaya (Rs. %) se zyada hai', v_c.cost - v_c.lab_paid;
  end if;
  select full_name into v_pname from public.patients where id = v_c.patient_id;

  perform set_config('app.lab_fn', 'on', true);
  update public.lab_cases set lab_paid = lab_paid + v_amt, updated_at = now() where id = p_case_id;
  insert into public.transactions
    (type, category, amount, payment_method, description, transaction_date, recorded_by, source, idempotency_key)
  values
    ('expense', 'Lab', v_amt, p_method,
     'Lab ' || coalesce(v_c.case_number, '') || ': ' || v_c.lab_name || coalesce(' (' || v_pname || ')', '') || ' - baqaya payment',
     v_today, auth.uid(), 'lab', p_key)
  returning id into v_id;
  perform set_config('app.lab_fn', 'off', true);
  return v_id;
end;
$$;


--
-- Name: pay_lab_total(text, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pay_lab_total(p_lab_name text, p_amount numeric, p_method text DEFAULT 'cash'::text, p_key text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_left numeric(12,2) := round(coalesce(p_amount,0),2); v_owed numeric(12,2); r record; v_part numeric(12,2); n int := 0;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin ye kar sakta hai'; end if;
  if v_left <= 0 then raise exception 'Raqam 0 se zyada honi chahiye'; end if;
  if btrim(coalesce(p_lab_name,'')) = '' then raise exception 'Lab ka naam chahiye'; end if;
  if p_key is not null then perform pg_advisory_xact_lock(hashtext('labtot:' || p_key)); end if;
  select coalesce(sum(cost - lab_paid),0) into v_owed from public.lab_cases
   where lower(btrim(lab_name)) = lower(btrim(p_lab_name)) and deleted_at is null and cost > lab_paid;
  if v_left > v_owed then raise exception 'Raqam lab ke kul baqaye (Rs. %) se zyada hai', v_owed; end if;
  for r in select id, cost - lab_paid as due from public.lab_cases
            where lower(btrim(lab_name)) = lower(btrim(p_lab_name)) and deleted_at is null and cost > lab_paid
            order by created_at, id loop
    exit when v_left <= 0;
    v_part := least(v_left, r.due); n := n + 1;
    perform public.pay_lab_case(r.id, v_part, coalesce(p_method,'cash'), case when p_key is null then null else p_key || ':' || n end);
    v_left := v_left - v_part;
  end loop;
  return n;
end $$;


--
-- Name: pay_legacy_due(uuid, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pay_legacy_due(p_tx_id uuid, p_amount numeric, p_method text, p_idempotency_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: pay_treatment(uuid, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pay_treatment(p_treatment_id uuid, p_amount numeric, p_method text DEFAULT 'cash'::text, p_note text DEFAULT NULL::text, p_key text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.has_perm('billing.collect') then raise exception 'Aap ko payment lene ki permission nahi'; end if;
  if p_key is not null then perform pg_advisory_xact_lock(hashtext('ptp:' || p_key)); end if;
  if not exists (select 1 from public.patient_treatments where id = p_treatment_id) then raise exception 'Treatment nahi mili'; end if;
  perform public._pay_treatment_core(p_treatment_id, p_amount, coalesce(p_method,'cash'), p_note, p_key);
end $$;


--
-- Name: payroll_calc(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_calc(p_period text, p_staff uuid DEFAULT NULL::uuid) RETURNS TABLE(staff_id uuid, full_name text, title text, monthly_salary numeric, track boolean, eff_from date, month_min integer, eff_min integer, rate_per_min numeric, work_days integer, present integer, half integer, absent integer, leave_paid integer, leave_unpaid integer, unmarked integer, missing_out integer, late_days integer, late_min integer, early_min integer, absent_min integer, ot_min integer, entitled numeric, cut_late numeric, cut_early numeric, cut_absent numeric, cut_total numeric, ot_amount numeric, net numeric, finalized boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
#variable_conflict use_column
declare r public.attendance_rules%rowtype; v_from date;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin dekh sakta hai'; end if;
  if p_period is null or p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Mahina YYYY-MM likhein'; end if;
  v_from := (p_period || '-01')::date;
  select * into r from public.attendance_rules where id = 1;
  return query
  with ag as (
    select x.staff_id sid,
      coalesce(sum(case when x.open_day then x.shift_min end), 0)::int mm,
      coalesce(sum(case when x.open_day and x.in_range then x.shift_min end), 0)::int em,
      (count(*) filter (where x.open_day and x.in_range))::int wd,
      (count(*) filter (where x.status = 'present'))::int pr,
      (count(*) filter (where x.status = 'half' and x.open_day))::int hf,
      (count(*) filter (where x.status = 'absent' and x.open_day))::int ab,
      (count(*) filter (where x.status = 'leave' and x.open_day and coalesce(x.leave_paid, true)))::int lp,
      (count(*) filter (where x.status = 'leave' and x.open_day and not coalesce(x.leave_paid, true)))::int lu,
      (count(*) filter (where x.unmarked))::int um,
      (count(*) filter (where x.missing_out))::int mo,
      (count(*) filter (where x.late_min > 0))::int ld,
      coalesce(sum(x.late_min), 0)::int lm,
      coalesce(sum(x.early_min), 0)::int em2,
      coalesce(sum(x.absent_min), 0)::int am,
      coalesce(sum(x.ot_min), 0)::int om
    from public._att_days(p_period, p_staff) x group by x.staff_id
  ), c as (
    select s.full_name fn, s.title tt, s.monthly_salary sal, s.attendance_on trk,
           greatest(v_from, coalesce(s.joined_on, v_from)) ef, ag.*,
           round(s.monthly_salary * ag.em / nullif(ag.mm, 0), 0) ent,
           round(s.monthly_salary * ag.lm / nullif(ag.mm, 0), 0) cl,
           round(s.monthly_salary * ag.em2 / nullif(ag.mm, 0), 0) ce,
           round(s.monthly_salary * ag.am / nullif(ag.mm, 0), 0) ca,
           round(s.monthly_salary * ag.om / nullif(ag.mm, 0) * r.overtime_mult, 0) oa
      from public.staff_members s join ag on ag.sid = s.id
  )
  select c.sid, c.fn, c.tt, c.sal, c.trk, c.ef, c.mm, c.em,
         round(c.sal / nullif(c.mm, 0), 4),
         c.wd, c.pr, c.hf, c.ab, c.lp, c.lu, c.um, c.mo, c.ld, c.lm, c.em2, c.am, c.om,
         coalesce(c.ent, 0), coalesce(c.cl, 0), coalesce(c.ce, 0), coalesce(c.ca, 0),
         coalesce(c.cl, 0) + coalesce(c.ce, 0) + coalesce(c.ca, 0),
         coalesce(c.oa, 0),
         coalesce(c.ent, 0) - (coalesce(c.cl, 0) + coalesce(c.ce, 0) + coalesce(c.ca, 0)) + coalesce(c.oa, 0),
         exists (select 1 from public.payroll_periods p where p.staff_id = c.sid and p.period = p_period)
    from c order by c.fn;
end $_$;


--
-- Name: payroll_finalize(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_finalize(p_staff uuid, p_period text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  v_row record; v_to date; v_name text; v_has_sal boolean; v_old_cut boolean;
  v_made text[] := '{}'; v_note text; v_snap jsonb;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin mahina tayyar kar sakta hai'; end if;
  if p_period is null or p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Mahina YYYY-MM likhein'; end if;
  v_to := ((p_period || '-01')::date + interval '1 month')::date;
  if v_to > public._att_today() then raise exception 'Mahina khatam hone ke baad hi tayyar hota hai'; end if;
  if exists (select 1 from public.payroll_periods where staff_id = p_staff and period = p_period) then
    raise exception 'Ye mahina is staff ke liye pehle hi tayyar ho chuka hai';
  end if;
  select * into v_row from public.payroll_calc(p_period, p_staff) x where x.staff_id = p_staff;
  if not found then raise exception 'Staff nahi mila ya band hai'; end if;
  perform 1 from public.staff_members where id = p_staff for update;
  select exists (select 1 from public.staff_ledger where staff_id = p_staff and period = p_period and kind = 'salary_due') into v_has_sal;
  v_old_cut := exists (select 1 from public.staff_ledger where idempotency_key = 'att:' || p_staff || ':' || p_period);
  if not v_has_sal and v_row.entitled > 0 then
    perform public.staff_add_entry(p_staff, 'salary_due', v_row.entitled, null, p_period, null,
      'Mahine ki tankhwah (' || v_row.eff_min || ' minute / ' || v_row.month_min || ')', 'sal2:' || p_staff || ':' || p_period);
    v_made := array_append(v_made, 'salary');
  end if;
  if v_row.cut_total > 0 and not v_old_cut then
    v_note := 'Hazri ke hisab se ' || p_period || ':';
    if v_row.late_min > 0 then v_note := v_note || ' late ' || v_row.late_min || ' minute;'; end if;
    if v_row.early_min > 0 then v_note := v_note || ' jaldi gaye ' || v_row.early_min || ' minute;'; end if;
    if v_row.absent_min > 0 then v_note := v_note || ' ghair-hazri/bagair tankhwah ' || v_row.absent_min || ' minute;'; end if;
    perform public.staff_add_entry(p_staff, 'deduction', v_row.cut_total, null, p_period, null, v_note, 'att2:' || p_staff || ':' || p_period);
    v_made := array_append(v_made, 'katauti');
  end if;
  if v_row.ot_amount > 0 then
    perform public.staff_add_entry(p_staff, 'bonus', v_row.ot_amount, null, p_period, null,
      'Overtime ' || v_row.ot_min || ' minute (' || p_period || ')', 'ot2:' || p_staff || ':' || p_period);
    v_made := array_append(v_made, 'overtime');
  end if;
  v_snap := to_jsonb(v_row) || jsonb_build_object('salary_existed', v_has_sal, 'old_cut_existed', v_old_cut, 'made', to_jsonb(v_made));
  insert into public.payroll_periods(staff_id, period, finalized_by, snapshot) values (p_staff, p_period, auth.uid(), v_snap);
  return v_snap;
end $_$;


--
-- Name: payroll_finalize_all(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.payroll_finalize_all(p_period text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare s record; n int := 0;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin mahina tayyar kar sakta hai'; end if;
  for s in select x.staff_id from public.payroll_calc(p_period) x where not x.finalized and (x.entitled > 0 or x.cut_total > 0 or x.ot_amount > 0) loop
    perform public.payroll_finalize(s.staff_id, p_period);
    n := n + 1;
  end loop;
  return n;
end $$;


--
-- Name: pre_req(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pre_req() RETURNS void
    LANGUAGE plpgsql
    AS $$ declare c json := nullif(current_setting('request.jwt.claims',true),'')::json; begin perform set_config('request.jwt.claim.sub', coalesce(c->>'sub',''), true); perform set_config('app.uid', coalesce(c->>'sub',''), true); perform set_config('app.perm','all', true); end $$;


--
-- Name: purge_inventory_item(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purge_inventory_item(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v public.inventory%rowtype;
begin
  if not public.is_owner() then raise exception 'Sirf owner item hamesha ke liye hata sakta hai'; end if;
  select * into v from public.inventory where id = p_id for update;
  if not found or v.deleted_at is null then raise exception 'Pehle item ko recycle bin mein bhejein'; end if;
  if public._inv_has_history(p_id) then raise exception 'Is item par record hai, hamesha ke liye nahi hat sakta'; end if;
  delete from public.inventory_meta where inventory_id = p_id;
  delete from public.inventory where id = p_id;
  perform public._inv_audit('PURGE', p_id, to_jsonb(v), null);
end $$;



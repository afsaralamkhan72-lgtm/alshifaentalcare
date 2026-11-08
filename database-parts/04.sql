SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: _loyalty_card(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._loyalty_card(p_patient uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  prog public.loyalty_program%rowtype;
  v_cycle int; v_now int; v_total int; v_next record; v_ready jsonb; v_today boolean;
begin
  select * into prog from public.loyalty_program where id = 1;
  select coalesce(max(cycle), 1) into v_cycle from public.loyalty_stamps where patient_id = p_patient;
  select count(*) into v_now from public.loyalty_stamps where patient_id = p_patient and cycle = v_cycle and voided_at is null;
  select count(*) into v_total from public.loyalty_stamps where patient_id = p_patient and voided_at is null;
  select exists (select 1 from public.loyalty_stamps where patient_id = p_patient and stamp_date = public._karachi_today() and voided_at is null) into v_today;
  select title, stamps_required into v_next from public.loyalty_rewards
   where is_active and stamps_required > v_now and (prog.reset_after is null or stamps_required <= prog.reset_after)
   order by stamps_required limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'expires_at', expires_at) order by unlocked_at), '[]'::jsonb)
    into v_ready from public.loyalty_unlocks
   where patient_id = p_patient and redeemed_at is null and (expires_at is null or expires_at > now());
  return jsonb_build_object(
    'stamps', v_now, 'total', v_total, 'cycle_size', prog.reset_after, 'stamped_today', v_today,
    'next_title', v_next.title, 'next_at', v_next.stamps_required,
    'remaining', case when v_next.stamps_required is null then null else v_next.stamps_required - v_now end,
    'ready', v_ready);
end $$;


--
-- Name: _loyalty_digits(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._loyalty_digits(p text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select right(regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g'), 10);
$$;


--
-- Name: _loyalty_has_visit(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._loyalty_has_visit(p_patient uuid, p_date date) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.appointments a
                  where a.patient_id = p_patient and a.preferred_date = p_date
                    and a.status in ('arrived', 'completed') and a.deleted_at is null)
      or exists (select 1 from public.clinical_visits v where v.patient_id = p_patient and v.visit_date = p_date);
$$;


--
-- Name: _pay_treatment_core(uuid, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._pay_treatment_core(p_treatment uuid, p_amount numeric, p_method text, p_note text, p_key text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_left numeric(12,2) := round(coalesce(p_amount,0), 2); v_bal numeric(12,2); v_part numeric(12,2); r record; n int := 0;
begin
  if v_left <= 0 then raise exception 'Raqam 0 se zyada honi chahiye'; end if;
  if p_key is not null and exists (select 1 from public.payments where idempotency_key like p_key || ':%') then
    return; -- dobara click: pehle ho chuka
  end if;
  select coalesce(sum(total - paid_amount), 0) into v_bal from public.invoices
   where patient_treatment_id = p_treatment and status = 'active';
  if v_left > v_bal then raise exception 'Raqam baqaya (Rs. %) se zyada hai', v_bal; end if;
  for r in select id, total - paid_amount as due from public.invoices
            where patient_treatment_id = p_treatment and status = 'active' and total > paid_amount
            order by invoice_date, created_at loop
    exit when v_left <= 0;
    v_part := least(v_left, r.due);
    n := n + 1;
    perform public.record_payment(r.id, v_part, p_method, p_note, case when p_key is null then null else p_key || ':' || n end);
    v_left := v_left - v_part;
  end loop;
end $$;


--
-- Name: _payroll_periods_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._payroll_periods_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'Tayyar kiye hue mahine mein tabdeeli ya delete allowed nahi hai';
end $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    patient_id uuid NOT NULL,
    invoice_date date NOT NULL,
    treating_doctor text,
    subtotal numeric(12,2) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) NOT NULL,
    paid_amount numeric(12,2) DEFAULT 0 NOT NULL,
    balance numeric(12,2) GENERATED ALWAYS AS (
CASE
    WHEN (status = 'void'::text) THEN (0)::numeric
    ELSE (total - paid_amount)
END) STORED,
    due_date date,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    idempotency_key text,
    mirror_tx_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    voided_at timestamp with time zone,
    voided_by uuid,
    void_reason text,
    patient_treatment_id uuid,
    clinical_visit_id uuid,
    verify_code text DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text),
    CONSTRAINT invoices_check CHECK ((total = (subtotal - discount_amount))),
    CONSTRAINT invoices_check1 CHECK ((paid_amount <= total)),
    CONSTRAINT invoices_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT invoices_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT invoices_paid_amount_check CHECK ((paid_amount >= (0)::numeric)),
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['active'::text, 'void'::text]))),
    CONSTRAINT invoices_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT invoices_total_check CHECK ((total >= (0)::numeric))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    kind text NOT NULL,
    amount numeric(12,2) NOT NULL,
    method text,
    paid_on date NOT NULL,
    note text,
    reverses_payment_id uuid,
    mirror_tx_id uuid,
    idempotency_key text,
    received_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payments_kind_check CHECK ((kind = ANY (ARRAY['payment'::text, 'refund'::text]))),
    CONSTRAINT payments_method_check CHECK ((method = ANY (ARRAY['cash'::text, 'bank'::text, 'easypaisa'::text, 'jazzcash'::text])))
);


--
-- Name: _reverse_payment_core(public.payments, public.invoices, text, uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._reverse_payment_core(v_pay public.payments, v_inv public.invoices, p_reason text, v_uid uuid, v_today date) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_ref uuid;
begin
  perform set_config('app.invoice_ins_fn', 'on', true);  -- naye invoice/payment sirf is function se bante hain
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;

  perform set_config('app.invoice_fn', 'on', true);
  if v_pay.mirror_tx_id = v_inv.mirror_tx_id then
    -- pehli payment invoice wali entry mein hi likhi gayi thi
    update public.transactions
       set amount = greatest(0, amount - v_pay.amount)
     where id = v_inv.mirror_tx_id;
  else
    update public.transactions
       set amount = 0,
           description = coalesce(description, '') || ' [ULTI: ' || btrim(p_reason) || ']'
     where id = v_pay.mirror_tx_id;
  end if;

  update public.transactions
     set balance_due = balance_due + v_pay.amount,
         settled_at  = null,
         due_date    = coalesce(due_date, v_today + 7)
   where id = v_inv.mirror_tx_id;
  perform set_config('app.invoice_fn', 'off', true);

  insert into public.payments
    (invoice_id, patient_id, kind, amount, method, paid_on, note, reverses_payment_id, received_by)
  values
    (v_pay.invoice_id, v_pay.patient_id, 'refund', v_pay.amount, v_pay.method, v_today,
     btrim(p_reason), v_pay.id, v_uid)
  returning id into v_ref;

  perform set_config('app.invoice_row_fn', 'on', true);
  update public.invoices set paid_amount = paid_amount - v_pay.amount where id = v_inv.id;
  perform set_config('app.invoice_row_fn', 'off', true);
  return v_ref;
end;
$$;


--
-- Name: _staff_clock(uuid, text, numeric, numeric, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._staff_clock(p_staff uuid, p_action text, p_lat numeric, p_lng numeric, p_reason text, p_source text, p_by uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  r public.attendance_rules%rowtype; s public.staff_members%rowtype; a public.staff_attendance%rowtype;
  v_ts timestamp := (now() at time zone 'Asia/Karachi');
  v_now time := date_trunc('second', v_ts)::time;
  v_d date := v_ts::date;
  v_dist int; v_ss time; v_se time; v_open boolean; v_late int := 0; v_msg text; v_status text;
  v_worked int; v_early int := 0; v_ot int := 0; v_grace time;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into r from public.attendance_rules where id = 1;
  select * into s from public.staff_members where id = p_staff;
  if not found or not s.is_active then
    return jsonb_build_object('ok', false, 'code', 'NOSTAFF', 'message', 'Staff nahi mila ya band hai.');
  end if;
  if not s.attendance_on then
    return jsonb_build_object('ok', false, 'code', 'NOTRACK', 'message', 'Aap ki hazri software mein nahi lagti.');
  end if;
  if p_action not in ('in', 'out') then
    return jsonb_build_object('ok', false, 'code', 'BAD', 'message', 'Action ghalat hai.');
  end if;
  if r.require_location then
    if r.clinic_lat is null or r.clinic_lng is null then
      return jsonb_build_object('ok', false, 'code', 'NOCLINIC', 'message', 'Clinic ki location abhi set nahi. Doctor sahab se kahein.');
    end if;
    if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
      return jsonb_build_object('ok', false, 'code', 'NOLOC', 'message', 'Phone ki location nahi mili. Location on karke dobara koshish karein, ya darkhwast bhejein.');
    end if;
    v_dist := public._geo_m(p_lat, p_lng, r.clinic_lat, r.clinic_lng);
    if v_dist > r.radius_m then
      return jsonb_build_object('ok', false, 'code', 'FAR', 'distance', v_dist,
        'message', 'Aap clinic se lagbhag ' || v_dist || ' meter door hain. Hazri sirf clinic ke andar lag sakti hai.');
    end if;
  end if;
  v_ss := coalesce(s.shift_start, r.work_start);
  v_se := coalesce(s.shift_end, r.shift_end);
  v_open := public._clinic_open(v_d, coalesce(s.weekly_off, r.weekly_off));
  v_grace := v_ss + make_interval(mins => r.grace_minutes);
  select * into a from public.staff_attendance where staff_id = p_staff and att_date = v_d;
  if p_action = 'in' then
    if found and a.check_in is not null and a.status in ('present', 'half') then
      return jsonb_build_object('ok', false, 'code', 'ALREADY',
        'message', 'Aap ki hazri aaj ' || public._tt(a.check_in) || ' par pehle hi lag chuki hai.');
    end if;
    insert into public.staff_attendance(staff_id, att_date, status, check_in, marked_by, source, in_lat, in_lng, in_dist, late_reason)
    values (p_staff, v_d, 'present', v_now, p_by, p_source, p_lat, p_lng, v_dist, v_reason)
    on conflict (staff_id, att_date) do update
      set status = 'present', check_in = excluded.check_in, marked_by = excluded.marked_by, marked_at = now(),
          source = excluded.source, in_lat = excluded.in_lat, in_lng = excluded.in_lng, in_dist = excluded.in_dist,
          late_reason = excluded.late_reason, leave_type_id = null;
    if v_open and v_now > v_grace then
      v_late := floor(extract(epoch from (v_now - case when r.late_from = 'after_grace' then v_grace else v_ss end)) / 60)::int;
    end if;
    if not v_open then
      v_status := 'closed_day';
      v_msg := 'Aap ki hazri ' || public._tt(v_now) || ' par lagi. Aaj clinic band/chhutti ka din hai'
               || case when r.overtime_on then ', ye waqt overtime mein gina jayega.' else ', ye sirf record hua.' end;
    elsif v_late > 0 then
      v_status := 'late';
      v_msg := 'Aap ki hazri ' || public._tt(v_now) || ' par lagi. Shift ' || public._tt(v_ss) || ', aap ' || v_late || ' minute late hain.';
    elsif v_now > v_ss then
      v_status := 'on_time';
      v_msg := 'Aap ki hazri ' || public._tt(v_now) || ' par lagi. Shift ' || public._tt(v_ss) || '. Waqt par (mohlat ke andar).';
    else
      v_status := 'on_time';
      v_msg := 'Aap ki hazri ' || public._tt(v_now) || ' par lagi. Waqt par. Shukriya.';
    end if;
    return jsonb_build_object('ok', true, 'action', 'in', 'status', v_status, 'time', v_now::text, 'time_txt', public._tt(v_now),
      'shift_txt', public._tt(v_ss), 'late_minutes', v_late, 'message', v_msg);
  end if;
  if not found or a.check_in is null or a.status not in ('present', 'half') then
    return jsonb_build_object('ok', false, 'code', 'NOIN', 'message', 'Pehle hazri (aaya) lagayein.');
  end if;
  if a.check_out is not null then
    return jsonb_build_object('ok', false, 'code', 'ALREADY',
      'message', 'Aap aaj ' || public._tt(a.check_out) || ' par pehle hi ja chuke hain.');
  end if;
  update public.staff_attendance set check_out = v_now, marked_at = now() where id = a.id;
  v_worked := greatest(floor(extract(epoch from (v_now - a.check_in)) / 60)::int, 0);
  if v_open and v_now < v_se then v_early := floor(extract(epoch from (v_se - v_now)) / 60)::int; end if;
  if v_open and v_now > v_se then v_ot := floor(extract(epoch from (v_now - v_se)) / 60)::int; end if;
  if not v_open then v_ot := v_worked; end if;
  v_msg := 'Aap ki chhutti ' || public._tt(v_now) || ' par lagi. Aaj kul ' || (v_worked / 60) || ' ghante ' || (v_worked % 60) || ' minute kaam.';
  if v_early > 0 then v_msg := v_msg || ' Shift ' || public._tt(v_se) || ' se ' || v_early || ' minute pehle.'; end if;
  return jsonb_build_object('ok', true, 'action', 'out', 'time', v_now::text, 'time_txt', public._tt(v_now),
    'worked_minutes', v_worked, 'early_minutes', v_early, 'overtime_minutes', v_ot, 'message', v_msg);
end $$;


--
-- Name: _treatment_appointment(uuid, uuid, text, date, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._treatment_appointment(p_patient uuid, p_treatment uuid, p_name text, p_date date, p_time text DEFAULT NULL::text, p_visit uuid DEFAULT NULL::uuid, p_doctor text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_p record;
begin
  if p_date is null then return; end if;
  if p_visit is not null and exists (select 1 from public.appointments where visit_id = p_visit) then return; end if;
  select full_name, phone, department into v_p from public.patients where id = p_patient;
  insert into public.appointments (patient_name, phone, department, treatment_name, preferred_date, preferred_time, status, source,
                                   patient_id, treatment_id, visit_id, doctor)
  values (v_p.full_name, v_p.phone, case when v_p.department in ('dental','homeopathic') then v_p.department end,
          p_name, p_date, nullif(btrim(coalesce(p_time,'')),''), 'confirmed', 'clinic', p_patient, p_treatment, p_visit, p_doctor);
end $$;


--
-- Name: _tt(time without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._tt(t time without time zone) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select to_char(date '2000-01-01' + t, 'FMHH12:MI AM')
$$;


--
-- Name: add_expense(numeric, text, text, text, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_expense(p_amount numeric, p_category text, p_method text DEFAULT 'cash'::text, p_note text DEFAULT NULL::text, p_date date DEFAULT NULL::date, p_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_amt   numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_cat   text;
  v_id    uuid;
begin
  if not (public.is_owner() or public.has_perm('expenses.manage')) then
    raise exception 'Sirf doctor/admin kharcha likh sakta hai';
  end if;
  if v_amt <= 0 or v_amt > 100000000 then raise exception 'Raqam ghalat hai'; end if;
  if coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;
  if p_date is not null and p_date > v_today + 1 then
    raise exception 'Aane wali tareekh nahi likh sakte';
  end if;

  select name into v_cat from public.expense_categories
   where lower(btrim(name)) = lower(btrim(coalesce(p_category, ''))) and is_active;
  if v_cat is null then raise exception 'Category list mein nahi hai'; end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('exp:' || p_key));
    select id into v_id from public.transactions where idempotency_key = p_key;
    if found then return v_id; end if;
  end if;

  insert into public.transactions
    (type, category, amount, payment_method, description, transaction_date, recorded_by, idempotency_key)
  values
    ('expense', v_cat, v_amt, p_method, nullif(btrim(coalesce(p_note, '')), ''),
     coalesce(p_date, v_today), auth.uid(), p_key)
  returning id into v_id;
  return v_id;
end;
$$;



SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: create_payment_plan(uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_payment_plan(p_treatment uuid, p_items jsonb, p_note text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_t public.patient_treatments%rowtype;
  v_bal numeric(12,2); v_paid numeric(12,2); v_sum numeric(12,2) := 0;
  v_id uuid; it jsonb; n int := 0; v_amt numeric(12,2); v_d date;
begin
  if not public.has_perm('billing.create') then raise exception 'Aap ko qiston ka plan banane ki permission nahi'; end if;
  select * into v_t from public.patient_treatments where id = p_treatment for update;
  if not found then raise exception 'Treatment nahi mili'; end if;
  if v_t.status = 'cancelled' then raise exception 'Cancel shuda treatment par plan nahi ban sakta'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Kam az kam ek qist likhein'; end if;
  if jsonb_array_length(p_items) > 36 then raise exception 'Zyada se zyada 36 qistein'; end if;
  if exists (select 1 from public.payment_plans where patient_treatment_id = p_treatment and status = 'active') then
    raise exception 'Is treatment ka plan pehle se chal raha hai. Pehle usay band karein';
  end if;
  select coalesce(sum(total - paid_amount),0), coalesce(sum(paid_amount),0) into v_bal, v_paid
    from public.invoices where patient_treatment_id = p_treatment and status = 'active';
  for it in select * from jsonb_array_elements(p_items) loop
    v_amt := round((it->>'amount')::numeric, 2);
    v_d := (it->>'due_date')::date;
    if v_amt is null or v_amt <= 0 then raise exception 'Har qist ki raqam 0 se zyada ho'; end if;
    if v_d is null then raise exception 'Har qist ki tareekh likhein'; end if;
    v_sum := v_sum + v_amt;
  end loop;
  if v_bal <= 0 then raise exception 'Is treatment ka baqaya nahi hai'; end if;
  if v_sum > v_bal then raise exception 'Qiston ka jama (%) baqaya (%) se zyada hai', v_sum, v_bal; end if;
  insert into public.payment_plans(patient_id, patient_treatment_id, planned_amount, base_paid, note, created_by)
    values (v_t.patient_id, p_treatment, v_sum, v_paid, nullif(btrim(coalesce(p_note,'')),''), auth.uid()) returning id into v_id;
  for it in select * from jsonb_array_elements(p_items) order by (value->>'due_date') loop
    n := n + 1;
    insert into public.payment_plan_items(plan_id, no, due_date, amount)
      values (v_id, n, (it->>'due_date')::date, round((it->>'amount')::numeric,2));
  end loop;
  return v_id;
end $$;


--
-- Name: create_share_link(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_share_link(p_patient uuid, p_prescription uuid DEFAULT NULL::uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare v_days int := 3; v_cfg jsonb; v_tok text;
begin
  if not (public.is_owner() or public.has_perm('prescriptions.view')) then raise exception 'Aap ko ye karne ki ijazat nahi'; end if;
  if not exists (select 1 from public.patients where id = p_patient and deleted_at is null) then raise exception 'Patient nahi mila'; end if;
  if p_prescription is not null and not exists (select 1 from public.prescriptions where id = p_prescription and patient_id = p_patient) then
    raise exception 'Prescription is patient ki nahi'; end if;
  select value into v_cfg from public.site_settings where key = 'share_cfg';
  if v_cfg is not null and (v_cfg ->> 'days') ~ '^[0-9]+$' then v_days := greatest(1, least(30, (v_cfg ->> 'days')::int)); end if;
  v_tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.share_links(token, patient_id, prescription_id, expires_at, created_by)
  values (v_tok, p_patient, p_prescription, now() + make_interval(days => v_days), auth.uid());
  return v_tok;
end $_$;


--
-- Name: day_closings_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.day_closings_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'Closing mein tabdeeli ya delete allowed nahi hai';
end;
$$;


--
-- Name: day_summary(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.day_summary(p_date date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_date date := coalesce(p_date, (now() at time zone 'Asia/Karachi')::date);
  v_open numeric(12,2);
  v_in numeric(12,2); v_out numeric(12,2); v_oin numeric(12,2); v_oout numeric(12,2);
  v_inv_n int; v_inv_total numeric(12,2);
  v_closed public.day_closings%rowtype;
  v_late int := 0;
begin
  if not (public.is_owner() or public.has_perm('reports.view')) then raise exception 'Sirf doctor/admin'; end if;

  -- Opening = pichli closing ka ginti shuda cash (pehli dafa 0)
  select counted_cash into v_open from public.day_closings
   where close_date < v_date order by close_date desc limit 1;
  v_open := coalesce(v_open, 0);

  select coalesce(sum(amount) filter (where type = 'income'  and coalesce(payment_method,'cash') = 'cash'), 0),
         coalesce(sum(amount) filter (where type = 'expense' and coalesce(payment_method,'cash') = 'cash'), 0),
         coalesce(sum(amount) filter (where type = 'income'  and coalesce(payment_method,'cash') <> 'cash'), 0),
         coalesce(sum(amount) filter (where type = 'expense' and coalesce(payment_method,'cash') <> 'cash'), 0)
    into v_in, v_out, v_oin, v_oout
    from public.transactions where transaction_date = v_date;

  select count(*), coalesce(sum(total), 0) into v_inv_n, v_inv_total
    from public.invoices where invoice_date = v_date and status <> 'void';

  select * into v_closed from public.day_closings where close_date = v_date;
  if v_closed.id is not null then
    select count(*) into v_late from public.transactions
     where transaction_date = v_date and created_at > v_closed.closed_at;
  end if;

  return jsonb_build_object(
    'date', v_date,
    'opening_cash', v_open,
    'cash_in', v_in, 'cash_out', v_out,
    'expected_cash', v_open + v_in - v_out,
    'other_in', v_oin, 'other_out', v_oout,
    'invoices_count', v_inv_n, 'invoices_total', v_inv_total,
    'closed', v_closed.id is not null,
    'counted_cash', v_closed.counted_cash,
    'difference', v_closed.difference,
    'closed_at', v_closed.closed_at,
    'late_entries', v_late
  );
end;
$$;


--
-- Name: delete_inventory_item(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_inventory_item(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v public.inventory%rowtype;
begin
  if not public.is_owner() then raise exception 'Sirf owner item delete kar sakta hai'; end if;
  select * into v from public.inventory where id = p_id for update;
  if not found or v.deleted_at is not null then raise exception 'Item nahi mila'; end if;
  if public._inv_has_history(p_id) then raise exception 'Is item par stock, kharid ya istemal ka record hai, delete nahi ho sakta. "Band (Archive)" karein, record mehfooz rahega'; end if;
  update public.inventory set deleted_at = now(), is_active = false, last_updated = now() where id = p_id;
  perform public._inv_audit('DELETE_TO_BIN', p_id, to_jsonb(v), null);
end $$;


--
-- Name: find_similar_patients(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_similar_patients(p_name text, p_phone text) RETURNS TABLE(id uuid, full_name text, phone text, mr_number text, age integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select p.id, p.full_name, p.phone, p.mr_number, p.age
    from public.patients p
   where public.has_perm('patients.view') and p.deleted_at is null
     and ( (length(regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g')) >= 10
            and right(regexp_replace(p.phone, '[^0-9]', '', 'g'), 10) = right(regexp_replace(p_phone, '[^0-9]', '', 'g'), 10))
        or (length(btrim(coalesce(p_name,''))) >= 3 and lower(btrim(p.full_name)) = lower(btrim(p_name))) )
   order by p.created_at desc
   limit 5;
$$;


--
-- Name: finish_clinical_visit(uuid, jsonb, jsonb, jsonb, jsonb, numeric, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finish_clinical_visit(p_id uuid, p_data jsonb DEFAULT '{}'::jsonb, p_rx jsonb DEFAULT NULL::jsonb, p_extra jsonb DEFAULT '[]'::jsonb, p_treatments jsonb DEFAULT '[]'::jsonb, p_discount numeric DEFAULT 0, p_paid numeric DEFAULT 0, p_method text DEFAULT 'cash'::text, p_key text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v public.clinical_visits%rowtype; p record;
  v_items jsonb := '[]'::jsonb; it jsonb; m public.medicines%rowtype;
  v_sub numeric(12,2) := 0; v_disc numeric(12,2) := round(coalesce(p_discount,0),2); v_paid numeric(12,2) := round(coalesce(p_paid,0),2);
  v_inv uuid; v_rx uuid; v_appt uuid; v_due numeric(12,2); v_left numeric(12,2); v_part numeric(12,2); r record; n int := 0;
  v_qty numeric; v_price numeric(12,2); v_name text; v_has_rx boolean; tr jsonb; ti int := 0; v_teeth text[];
begin
  if not public.has_perm('clinical.edit') then raise exception 'Aap ko visit likhne ki permission nahi'; end if;
  select * into v from public.clinical_visits where id = p_id for update;
  if not found then raise exception 'Visit nahi mila'; end if;
  if v.status = 'finished' and p_key is not null and v.finish_key = p_key then
    return jsonb_build_object('visit_id', v.id, 'invoice_id', v.invoice_id, 'appointment_id', v.appointment_id, 'again', true);
  end if;
  select id, full_name, phone, department into p from public.patients where id = v.patient_id;

  -- 1. clinical baatein
  perform public.save_clinical_visit(p_id, coalesce(p_data, '{}'::jsonb));
  select * into v from public.clinical_visits where id = p_id;

  -- 2. prescription (aik visit = aik prescription; pehle se ho to dobara nahi)
  v_has_rx := p_rx is not null and jsonb_typeof(p_rx -> 'items') = 'array' and jsonb_array_length(p_rx -> 'items') > 0;
  select id into v_rx from public.prescriptions where clinical_visit_id = p_id limit 1;
  if v_has_rx and v_rx is null then
    if not public.has_perm('prescriptions.write') then raise exception 'Aap ko prescription likhne ki permission nahi'; end if;
    insert into public.prescriptions (patient_id, department, items, notes_en, notes_ur, prescribed_by, prescribed_date, clinical_visit_id)
    values (v.patient_id,
            case when coalesce(p_rx ->> 'category', p.department) = 'homeopathic' then 'homeopathic' else 'dental' end,
            p_rx -> 'items', nullif(btrim(coalesce(p_rx ->> 'notes_en','')),''), nullif(btrim(coalesce(p_rx ->> 'notes_ur','')),''),
            auth.uid(), public._karachi_today(), p_id)
    returning id into v_rx;

    -- 3. clinic se di gayi dawaiyan -> bill (qeemat Settings se, us waqt ki; sirf "dispense" wali)
    for it in select * from jsonb_array_elements(p_rx -> 'items') loop
      continue when coalesce(it ->> 'mode', 'rx') <> 'dispense';
      v_qty := coalesce(nullif(it ->> 'qty','')::numeric, 1);
      if v_qty <= 0 then continue; end if;
      if nullif(it ->> 'medicine_id','') is not null then
        select * into m from public.medicines where id = (it ->> 'medicine_id')::uuid for update;
        if not found then raise exception 'Dawa list mein nahi mili'; end if;
        v_price := m.price;
        v_name := m.name || coalesce(' ' || nullif(m.strength,''), '') || coalesce(' ' || nullif(m.potency,''), '');
        if m.stock_qty is not null then
          if m.stock_qty < v_qty then raise exception 'Stock kam hai: % (sirf % bacha)', m.name, m.stock_qty; end if;
          perform set_config('app.med_stock_fn', 'on', true);
          update public.medicines set stock_qty = stock_qty - v_qty where id = m.id;
        end if;
      else
        v_price := round(coalesce(nullif(it ->> 'price','')::numeric, 0), 2);
        v_name := btrim(coalesce(it ->> 'name', 'Dawa'));
      end if;
      if v_qty <> trunc(v_qty) then raise exception 'Dawa ki ginti poori honi chahiye'; end if;
      v_items := v_items || jsonb_build_array(jsonb_build_object('treatment_id', null, 'name', 'Dawa: ' || v_name, 'qty', v_qty::int, 'unit_price', v_price));
      v_sub := v_sub + v_qty * v_price;
    end loop;
  end if;

  -- 3b. treatments (naye / jaari): sab isi visit ke bill mein; payment neeche aik hi jagah se
  for tr in select * from jsonb_array_elements(coalesce(p_treatments, '[]'::jsonb)) loop
    ti := ti + 1;
    if nullif(tr ->> 'treatment_id','') is not null then
      continue when coalesce((tr ->> 'skip')::boolean, false);
      if (select status from public.patient_treatments where id = (tr ->> 'treatment_id')::uuid) = 'planned' then
        perform public.begin_planned_treatment((tr ->> 'treatment_id')::uuid, round(coalesce(nullif(tr ->> 'price','')::numeric, 0), 2), 0, 'cash',
                nullif(btrim(coalesce(tr ->> 'notes','')),''), null, null, nullif(tr ->> 'condition',''),
                case when p_key is null then null else p_key || ':t' || ti end);
        continue;
      end if;
      perform public.continue_treatment((tr ->> 'treatment_id')::uuid, nullif(btrim(coalesce(tr ->> 'notes','')),''), nullif(btrim(coalesce(tr ->> 'procedure','')),''),
              null, round(coalesce(nullif(tr ->> 'extra','')::numeric, 0), 2), nullif(btrim(coalesce(tr ->> 'extra_label','')),''), 0, 'cash',
              case when p_key is null then null else p_key || ':t' || ti end, null);
    else
      continue when btrim(coalesce(tr ->> 'name','')) = '';
      v_teeth := coalesce(array(select jsonb_array_elements_text(coalesce(tr -> 'teeth','[]'::jsonb))), '{}');
      perform public.start_treatment(v.patient_id, btrim(tr ->> 'name'), nullif(tr ->> 'catalog_id','')::uuid, v_teeth,
              round(coalesce(nullif(tr ->> 'price','')::numeric, 0), 2), 0, 'cash', v.doctor, nullif(btrim(coalesce(tr ->> 'notes','')),''),
              null, nullif(tr ->> 'condition',''), case when p_key is null then null else p_key || ':t' || ti end, null,
              coalesce((tr ->> 'planned')::boolean, false));
    end if;
  end loop;

  -- 4. extra charges
  if v.invoice_id is null then
    for it in select * from jsonb_array_elements(coalesce(p_extra, '[]'::jsonb)) loop
      v_price := round(coalesce(nullif(it ->> 'amount','')::numeric, 0), 2);
      continue when v_price <= 0;
      v_items := v_items || jsonb_build_array(jsonb_build_object('treatment_id', null,
                   'name', coalesce(nullif(btrim(it ->> 'label'),''), 'Extra charge'), 'qty', 1, 'unit_price', v_price));
      v_sub := v_sub + v_price;
    end loop;

    -- 5. aik visit bill (dawaiyan + extra), discount sirf owner
    if jsonb_array_length(v_items) > 0 then
      if not public.has_perm('billing.create') then raise exception 'Aap ko bill banane ki permission nahi'; end if;
      if v_disc < 0 or v_disc > v_sub then raise exception 'Discount ghalat hai'; end if;
      if v_disc > 0 and public._disc_pct(v_sub, v_sub - v_disc) > public.my_discount_limit() then raise exception 'Discount aap ki had (% %%) se zyada hai', public.my_discount_limit(); end if;
      v_inv := public.create_invoice(v.patient_id, v_items, case when v_sub > 0 then v_disc * 100 / v_sub else 0 end, 0, 'cash',
                                     v.doctor, public._karachi_today() + 7, 'Visit ' || to_char(v.visit_date, 'DD/MM/YYYY'),
                                     case when p_key is null then null else p_key || ':inv' end);
      update public.invoices set clinical_visit_id = p_id where id = v_inv;
      update public.clinical_visits set invoice_id = v_inv where id = p_id;
      if v_rx is not null then update public.prescriptions set invoice_id = v_inv where id = v_rx; end if;
    end if;
  end if;

  -- 6. aaj ki payment: pehle aaj ke bill, phir purana baqaya (purane se pehle)
  if v_paid > 0 then
    if not public.has_perm('billing.collect') then raise exception 'Aap ko payment lene ki permission nahi'; end if;
    select coalesce(sum(total - paid_amount), 0) into v_due from public.invoices where patient_id = v.patient_id and status = 'active';
    if v_paid > v_due then raise exception 'Raqam kul baqaya (Rs. %) se zyada hai', v_due; end if;
    v_left := v_paid;
    for r in select id, total - paid_amount as due from public.invoices
              where patient_id = v.patient_id and status = 'active' and total > paid_amount
              order by (clinical_visit_id = p_id) desc nulls last, (invoice_date = public._karachi_today()) desc, invoice_date, created_at loop
      exit when v_left <= 0;
      v_part := least(v_left, r.due); n := n + 1;
      perform public.record_payment(r.id, v_part, coalesce(p_method,'cash'), 'Visit ' || to_char(v.visit_date, 'DD/MM'),
                                    case when p_key is null then null else p_key || ':pay:' || n end);
      v_left := v_left - v_part;
    end loop;
  end if;

  -- 7. agli appointment (is visit ki aik hi; dobara Finish par tareekh badli to reschedule, history ke saath)
  if v.next_date is not null then
    select id into v_appt from public.appointments where clinical_visit_id = p_id;
    if v_appt is null then
      insert into public.appointments (patient_name, phone, department, treatment_name, preferred_date, preferred_time, status, source,
                                       patient_id, treatment_id, clinical_visit_id, doctor)
      values (p.full_name, p.phone, case when p.department in ('dental','homeopathic') then p.department end,
              (select name from public.patient_treatments where id = v.next_treatment_id),
              v.next_date, v.next_time, 'confirmed', 'clinic', v.patient_id, v.next_treatment_id, p_id, v.doctor)
      returning id into v_appt;
    else
      update public.appointments set preferred_date = v.next_date, preferred_time = v.next_time
       where id = v_appt and (preferred_date is distinct from v.next_date or preferred_time is distinct from v.next_time);
    end if;
    update public.clinical_visits set appointment_id = v_appt where id = p_id;
  end if;

  update public.clinical_visits
     set status = 'finished', finished_at = coalesce(finished_at, now()), finished_by = auth.uid(), finish_key = p_key, updated_at = now()
   where id = p_id;
  return jsonb_build_object('visit_id', p_id, 'invoice_id', coalesce(v_inv, v.invoice_id), 'prescription_id', v_rx, 'appointment_id', v_appt);
end $$;


--
-- Name: generate_mr_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_mr_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  prefix text;
  next_val int;
begin
  prefix := case when new.department = 'dental' then 'AS-D-' else 'AS-H-' end;
  next_val := nextval('patient_mr_seq');
  new.mr_number := prefix || lpad(next_val::text, 4, '0');
  return new;
end;
$$;


--
-- Name: generate_portal_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_portal_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';  -- o/0, i/l/1 jaise confusing nahi
  bytes bytea;
  code text;
  i int;
begin
  loop
    bytes := gen_random_bytes(12);
    code := '';
    for i in 0..11 loop
      code := code || substr(alphabet, 1 + (get_byte(bytes, i) % length(alphabet)), 1);
      if i in (3, 7) then code := code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.patients where portal_code = code);
  end loop;
  return code;
end;
$$;


--
-- Name: give_consent(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.give_consent(p_patient uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not (public.has_perm('clinical.edit') or public.has_perm('patients.edit')) then raise exception 'Aap ko permission nahi'; end if;
  update public.patients set consent_at = coalesce(consent_at, now()), consent_by = coalesce(consent_by, auth.uid())
   where id = p_patient and deleted_at is null;
end $$;



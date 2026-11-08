SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: audit_row_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_row_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_old     jsonb;
  v_new     jsonb;
  v_src     jsonb;
  v_changed text[];
  v_pat     uuid;
  v_name    text;
  v_role    text;
begin
  begin
    if TG_OP = 'INSERT' then
      v_new := to_jsonb(NEW);
    elsif TG_OP = 'UPDATE' then
      v_old := to_jsonb(OLD);
      v_new := to_jsonb(NEW);
      if v_old = v_new then
        return NEW; -- kuch badla hi nahi
      end if;
      select array_agg(k order by k) into v_changed
      from jsonb_object_keys(v_new) as k
      where v_new -> k is distinct from v_old -> k;
    else
      v_old := to_jsonb(OLD);
    end if;

    v_src := coalesce(v_new, v_old);

    if TG_TABLE_NAME = 'patients' then
      v_pat := nullif(v_src ->> 'id', '')::uuid;
    else
      v_pat := nullif(v_src ->> 'patient_id', '')::uuid;
    end if;

    select full_name, role into v_name, v_role
    from public.staff_profiles where id = auth.uid();

    insert into public.audit_log
      (actor_id, actor_name, actor_role, action, table_name, record_id,
       patient_id, changed_fields, old_data, new_data)
    values
      (auth.uid(), v_name, v_role, TG_OP, TG_TABLE_NAME,
       coalesce(v_src ->> 'id', v_src ->> 'key'),
       v_pat, v_changed, v_old, v_new);
  exception when others then
    raise warning 'audit_row_change skipped: %', sqlerrm;
  end;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;


--
-- Name: begin_planned_treatment(uuid, numeric, numeric, text, text, date, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.begin_planned_treatment(p_treatment_id uuid, p_price numeric DEFAULT 0, p_paid numeric DEFAULT 0, p_method text DEFAULT 'cash'::text, p_notes text DEFAULT NULL::text, p_next_visit date DEFAULT NULL::date, p_next_time text DEFAULT NULL::text, p_chart_condition text DEFAULT NULL::text, p_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare t public.patient_treatments%rowtype; v_price numeric(12,2) := round(coalesce(p_price,0),2); v_paid numeric(12,2) := round(coalesce(p_paid,0),2);
begin
  if not public.has_perm('clinical.edit') then raise exception 'Aap ko treatment likhne ki permission nahi'; end if;
  if v_price > 0 and not public.has_perm('billing.create') then raise exception 'Aap ko qeemat (bill) likhne ki permission nahi'; end if;
  if v_paid > 0 and not public.has_perm('billing.collect') then raise exception 'Aap ko payment lene ki permission nahi'; end if;
  if p_key is not null then perform pg_advisory_xact_lock(hashtext('beg:' || p_key)); end if;
  select * into t from public.patient_treatments where id = p_treatment_id for update;
  if not found then raise exception 'Treatment nahi mili'; end if;
  if t.status = 'active' then return null; end if;   -- dobara click: pehle shuru ho chuki
  if t.status <> 'planned' then raise exception 'Sirf plan wali treatment shuru ho sakti hai'; end if;
  if v_price < 0 or v_paid < 0 or v_paid > v_price then raise exception 'Raqam ghalat hai'; end if;
  if t.list_price > 0 and public._disc_pct(t.list_price, v_price) > public.my_discount_limit() and v_price < t.list_price then
    raise exception 'Discount aap ki had (% %%) se zyada hai', public.my_discount_limit();
  end if;
  update public.patient_treatments set status = 'active', price = v_price, started_on = public._karachi_today() where id = t.id;
  return public._begin_treatment(t.id, v_price, v_paid, p_method, null, p_notes, p_next_visit, p_next_time, p_chart_condition, p_key);
end $$;


--
-- Name: block_patient_hard_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.block_patient_hard_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'Patient ko hamesha ke liye delete nahi kiya ja sakta. Recycle bin wala (soft) delete istemal karein.';
end $$;


--
-- Name: cancel_payment_plan(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_payment_plan(p_plan uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.has_perm('billing.create') then raise exception 'Aap ko plan band karne ki permission nahi'; end if;
  update public.payment_plans set status = 'cancelled', cancelled_at = now() where id = p_plan and status = 'active';
  if not found then raise exception 'Chalta hua plan nahi mila'; end if;
end $$;


--
-- Name: clinic_closed_suspects(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clinic_closed_suspects() RETURNS TABLE(day date)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
#variable_conflict use_column
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin dekh sakta hai'; end if;
  return query
  select g::date
    from generate_series((public._att_today() - 7)::timestamp, (public._att_today() - 1)::timestamp, interval '1 day') g
   where public._clinic_open(g::date, null)
     and not exists (select 1 from public.clinic_days c where c.day = g::date)
     and exists (select 1 from public.staff_members s where s.is_active and s.attendance_on)
     and not exists (select 1 from public.staff_attendance a where a.att_date = g::date)
     and not exists (select 1 from public.clinical_visits v where v.visit_date = g::date)
     and not exists (select 1 from public.payments p where p.paid_on = g::date)
     and not exists (select 1 from public.appointments ap where ap.preferred_date = g::date and ap.deleted_at is null and ap.status in ('confirmed','completed'))
   order by g;
end $$;


--
-- Name: clinic_set_days(date, date, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clinic_set_days(p_from date, p_to date, p_closed boolean, p_reason text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare d date; n int := 0;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin din band kar sakta hai'; end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Tareekhein ghalat hain'; end if;
  if p_to - p_from > 62 then raise exception 'Aik baar mein 62 din tak'; end if;
  if p_from < public._att_today() - 120 then raise exception 'Bohat purani tareekh'; end if;
  for d in select g::date from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') g loop
    if exists (select 1 from public.payroll_periods where period = to_char(d, 'YYYY-MM')) then
      raise exception 'Mahina % tayyar (lock) ho chuka hai, is mein din nahi badal sakte', to_char(d, 'YYYY-MM');
    end if;
    insert into public.clinic_days(day, closed, reason, set_by) values (d, p_closed, nullif(btrim(coalesce(p_reason, '')), ''), auth.uid())
    on conflict (day) do update set closed = excluded.closed, reason = excluded.reason, set_by = excluded.set_by, set_at = now();
    n := n + 1;
  end loop;
  return n;
end $$;


--
-- Name: close_day(date, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_day(p_date date, p_counted_cash numeric, p_note text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_s jsonb;
  v_id uuid;
  v_name text;
  v_diff numeric;
begin
  if not (public.is_owner() or public.has_perm('billing.collect')) then raise exception 'Aap ko din band karne ki permission nahi'; end if;
  if p_date is null then raise exception 'Tareekh zaroori hai'; end if;
  if p_date > v_today then raise exception 'Aane wale din ki closing nahi ho sakti'; end if;
  if p_counted_cash is null or p_counted_cash < 0 then raise exception 'Ginti shuda cash ghalat hai'; end if;
  if exists (select 1 from public.day_closings where close_date = p_date) then
    raise exception 'Is din ki closing pehle ho chuki hai';
  end if;

  v_s := public.day_summary(p_date);  -- invoker, par yahan owner hi hai
  v_diff := round(p_counted_cash,2) - (v_s->>'expected_cash')::numeric;
  if v_diff <> 0 and (p_note is null or btrim(p_note) = '') then
    raise exception 'Cash mein farq hai (Rs. %). Wajah note mein likhna zaroori hai', v_diff;
  end if;

  select full_name into v_name from public.staff_profiles where id = auth.uid();

  insert into public.day_closings
    (close_date, opening_cash, cash_in, cash_out, expected_cash, counted_cash, other_in, other_out, note, closed_by, closed_by_name)
  values
    (p_date, (v_s->>'opening_cash')::numeric, (v_s->>'cash_in')::numeric, (v_s->>'cash_out')::numeric,
     (v_s->>'expected_cash')::numeric, round(p_counted_cash,2),
     (v_s->>'other_in')::numeric, (v_s->>'other_out')::numeric,
     nullif(btrim(p_note), ''), auth.uid(), v_name)
  returning id into v_id;
  return v_id;
end;
$$;


--
-- Name: collect_payment(uuid, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.collect_payment(p_invoice_id uuid, p_amount numeric, p_method text DEFAULT 'cash'::text, p_note text DEFAULT NULL::text, p_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.has_perm('billing.collect') then raise exception 'Aap ko payment lene ki permission nahi'; end if;
  return public.record_payment(p_invoice_id, p_amount, coalesce(p_method,'cash'), p_note, p_key);
end $$;


--
-- Name: collect_with_discount(uuid, numeric, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.collect_with_discount(p_invoice_id uuid, p_discount numeric, p_amount numeric DEFAULT 0, p_method text DEFAULT 'cash'::text, p_reason text DEFAULT NULL::text, p_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_inv public.invoices%rowtype; v_d numeric(12,2) := round(coalesce(p_discount,0),2); v_a numeric(12,2) := round(coalesce(p_amount,0),2);
  v_out numeric(12,2); v_pct numeric; v_lim numeric; v_pay uuid; s record; v_newbal numeric(12,2);
begin
  if not public.has_perm('billing.collect') then raise exception 'Aap ko payment lene ki permission nahi'; end if;
  if v_d < 0 or v_a < 0 then raise exception 'Raqam ghalat hai'; end if;
  if v_d = 0 and v_a = 0 then raise exception 'Discount ya payment likhein'; end if;
  if p_key is not null then perform pg_advisory_xact_lock(hashtext('cwd:' || p_key)); end if;
  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice nahi mila'; end if;
  if v_inv.status <> 'active' then raise exception 'Ye invoice cancel ho chuka hai'; end if;
  v_out := v_inv.total - v_inv.paid_amount;
  if v_d + v_a > v_out then raise exception 'Discount + payment baqaya (Rs. %) se zyada hai', v_out; end if;
  if v_d > 0 then
    if v_inv.subtotal <= 0 then raise exception 'Is invoice par discount nahi ho sakti'; end if;
    v_lim := public.my_discount_limit();
    v_pct := round((v_inv.discount_amount + v_d) * 100 / v_inv.subtotal, 2);
    if v_pct > v_lim then raise exception 'Discount aap ki had (% %%) se zyada hai (is bill par kul % %% banti hai)', v_lim, v_pct; end if;
    if p_reason is null or btrim(p_reason) = '' then raise exception 'Discount ki wajah likhein'; end if;
    perform set_config('app.invoice_row_fn', 'on', true);
    update public.invoices set discount_amount = discount_amount + v_d, total = total - v_d, discount_percent = least(100, v_pct)
     where id = v_inv.id;
    perform set_config('app.invoice_row_fn', 'off', true);
    v_newbal := v_out - v_d;
    if v_inv.mirror_tx_id is not null then
      perform set_config('app.invoice_fn', 'on', true);
      update public.transactions
         set discount_amount = coalesce(discount_amount,0) + v_d, discount_pct = least(100, v_pct),
             balance_due = v_newbal, settled_at = case when v_newbal = 0 then coalesce(settled_at, now()) else settled_at end
       where id = v_inv.mirror_tx_id;
      perform set_config('app.invoice_fn', 'off', true);
    end if;
    select full_name, role into s from public.staff_profiles where id = auth.uid();
    insert into public.discount_log(kind, patient_id, invoice_id, base_amount, discount_amount, percent, given_by, given_by_name, given_by_role, note)
    values ('bill', v_inv.patient_id, v_inv.id, v_inv.total, v_d, round(v_d * 100 / v_inv.subtotal, 2), auth.uid(), s.full_name, s.role, btrim(p_reason));
  end if;
  if v_a > 0 then
    v_pay := public.record_payment(v_inv.id, v_a, coalesce(p_method,'cash'), nullif(btrim(coalesce(p_reason,'')),''), p_key);
  end if;
  return v_pay;
end $$;


--
-- Name: continue_treatment(uuid, text, text, date, numeric, text, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.continue_treatment(p_treatment_id uuid, p_notes text DEFAULT NULL::text, p_procedure text DEFAULT NULL::text, p_next_visit date DEFAULT NULL::date, p_extra_charge numeric DEFAULT 0, p_extra_label text DEFAULT NULL::text, p_paid numeric DEFAULT 0, p_method text DEFAULT 'cash'::text, p_key text DEFAULT NULL::text, p_next_time text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_t public.patient_treatments%rowtype; v_v uuid; v_no int; v_inv uuid; v_today date := public._karachi_today();
  v_extra numeric(12,2) := round(coalesce(p_extra_charge, 0), 2);
  v_paid  numeric(12,2) := round(coalesce(p_paid, 0), 2);
  v_label text;
begin
  if not public.has_perm('clinical.edit') then raise exception 'Aap ko visit likhne ki permission nahi'; end if;
  if v_extra > 0 and not public.has_perm('billing.create') then raise exception 'Aap ko extra charge likhne ki permission nahi'; end if;
  if v_paid > 0 and not public.has_perm('billing.collect') then raise exception 'Aap ko payment lene ki permission nahi'; end if;
  if v_extra < 0 or v_paid < 0 then raise exception 'Raqam ghalat hai'; end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('vis:' || p_key));
    select id into v_v from public.visit_notes where idempotency_key = p_key;
    if found then return v_v; end if;
  end if;

  select * into v_t from public.patient_treatments where id = p_treatment_id for update;
  if not found then raise exception 'Treatment nahi mili'; end if;
  if v_t.status <> 'active' then raise exception 'Ye treatment chal nahi rahi (plan, band ya cancel). Pehle shuru / dobara kholein.'; end if;

  select coalesce(max(visit_no), 0) + 1 into v_no from public.visit_notes where treatment_id = v_t.id;

  insert into public.visit_notes (patient_id, treatment_id, visit_no, visit_date, procedure, notes, next_visit, doctor_id, idempotency_key)
  values (v_t.patient_id, v_t.id, v_no, v_today, coalesce(nullif(btrim(coalesce(p_procedure,'')),''), v_t.name),
          nullif(btrim(coalesce(p_notes,'')),''), p_next_visit, auth.uid(), p_key)
  returning id into v_v;

  if v_extra > 0 then
    select string_agg(public.tooth_label(x), ', ' order by x) into v_label from unnest(v_t.teeth) x;
    v_inv := public.create_invoice(
      v_t.patient_id,
      jsonb_build_array(jsonb_build_object('treatment_id', v_t.catalog_id,
        'name', v_t.name || ' - ' || coalesce(nullif(btrim(coalesce(p_extra_label,'')),''), 'extra (V' || v_no || ')'),
        'tooth', v_label, 'qty', 1, 'unit_price', v_extra)),
      0, 0, 'cash', v_t.doctor, v_today + 7, null,
      case when p_key is null then null else p_key || ':x' end);
    update public.invoices set patient_treatment_id = v_t.id where id = v_inv;
  end if;

  if v_paid > 0 then
    perform public._pay_treatment_core(v_t.id, v_paid, coalesce(p_method,'cash'), 'V' || v_no,
                                       case when p_key is null then null else p_key || ':p' end);
  end if;

  perform public._treatment_appointment(v_t.patient_id, v_t.id, v_t.name, p_next_visit, p_next_time, v_v, v_t.doctor);
  return v_v;
end $$;


--
-- Name: create_invoice(uuid, jsonb, numeric, numeric, text, text, date, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_invoice(p_patient_id uuid, p_items jsonb, p_discount_percent numeric DEFAULT 0, p_paid numeric DEFAULT 0, p_method text DEFAULT 'cash'::text, p_doctor text DEFAULT NULL::text, p_due_date date DEFAULT NULL::date, p_notes text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_uid     uuid := auth.uid();
  v_today   date := (now() at time zone 'Asia/Karachi')::date;
  v_inv     uuid;
  v_tx      uuid;
  v_no      text;
  v_prefix  text;
  v_n       int;
  v_sub     numeric(12,2) := 0;
  v_disc    numeric(12,2);
  v_total   numeric(12,2);
  v_bal     numeric(12,2);
  v_item    jsonb;
  v_qty     int;
  v_price   numeric(12,2);
  v_name    text;
  v_names   text[] := '{}';
  v_due     date;
  v_pct     numeric := coalesce(p_discount_percent, 0);
  v_paid    numeric(12,2) := round(coalesce(p_paid, 0), 2);
begin
  perform set_config('app.invoice_ins_fn', 'on', true);  -- naye invoice/payment sirf is function se bante hain
  if not (public.is_owner() or (public.has_perm('billing.create') and coalesce(p_discount_percent, 0) <= public.my_discount_limit()
           and (coalesce(p_paid, 0) = 0 or public.has_perm('billing.collect')))) then
    raise exception 'Aap ko bill banane ki permission nahi (discount sirf doctor/admin)';
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtext('inv:' || p_idempotency_key));
    select id into v_inv from public.invoices where idempotency_key = p_idempotency_key;
    if found then
      return v_inv; -- dobara click / dobara bhejna: wahi purana invoice
    end if;
  end if;

  if not exists (select 1 from public.patients where id = p_patient_id and deleted_at is null) then
    raise exception 'Patient nahi mila';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Kam az kam aik treatment chahiye';
  end if;
  if v_pct < 0 or v_pct > 100 then
    raise exception 'Discount 0 se 100 percent ke beech hona chahiye';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_name  := btrim(coalesce(v_item ->> 'name', ''));
    v_qty   := coalesce(nullif(v_item ->> 'qty', '')::int, 1);
    v_price := round((v_item ->> 'unit_price')::numeric, 2);
    if v_name = '' then raise exception 'Treatment ka naam khali hai'; end if;
    if v_qty < 1 or v_qty > 100 then raise exception 'Qty 1 se 100 ke beech honi chahiye'; end if;
    if v_price is null or v_price < 0 then raise exception 'Qeemat ghalat hai'; end if;
    v_sub := v_sub + v_qty * v_price;
    v_names := v_names || (case when v_qty > 1 then v_name || ' x' || v_qty else v_name end);
  end loop;

  v_disc  := round(v_sub * v_pct / 100, 2);
  v_total := v_sub - v_disc;

  if v_paid < 0 or v_paid > v_total then
    raise exception 'Mili hui raqam 0 se invoice total ke beech honi chahiye';
  end if;
  if v_paid > 0 and coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;

  v_bal := v_total - v_paid;
  v_due := case when v_bal > 0 then coalesce(p_due_date, v_today + 7) end;

  -- Invoice number (update row ko lock karta hai, is liye number kabhi dohra nahi hota)
  update public.invoice_counter set next_no = next_no + 1 where id = 1
    returning prefix, next_no - 1 into v_prefix, v_n;
  v_no := v_prefix || v_n;

  insert into public.invoices
    (invoice_number, patient_id, invoice_date, treating_doctor, subtotal, discount_percent,
     discount_amount, total, paid_amount, due_date, notes, idempotency_key, created_by)
  values
    (v_no, p_patient_id, v_today, nullif(btrim(coalesce(p_doctor, '')), ''), v_sub, v_pct,
     v_disc, v_total, v_paid, v_due, nullif(btrim(coalesce(p_notes, '')), ''),
     p_idempotency_key, v_uid)
  returning id into v_inv;

  insert into public.invoice_items (invoice_id, treatment_id, name, tooth, qty, unit_price, line_total)
  select v_inv,
         nullif(e ->> 'treatment_id', '')::uuid,
         btrim(e ->> 'name'),
         nullif(btrim(coalesce(e ->> 'tooth', '')), ''),
         coalesce(nullif(e ->> 'qty', '')::int, 1),
         round((e ->> 'unit_price')::numeric, 2),
         coalesce(nullif(e ->> 'qty', '')::int, 1) * round((e ->> 'unit_price')::numeric, 2)
  from jsonb_array_elements(p_items) e;

  -- Purane hisaab wali entry (dashboard / reports / baqaya list ke liye)
  perform set_config('app.invoice_fn', 'on', true);
  insert into public.transactions
    (patient_id, type, category, treatment_name, description, rate, discount_amount, discount_pct,
     amount, balance_due, due_date, payment_method, treating_doctor, transaction_date,
     settled_at, recorded_by, invoice_id)
  values
    (p_patient_id, 'income', 'treatment', array_to_string(v_names, ', '), 'Invoice ' || v_no,
     v_sub, v_disc, v_pct, v_paid, v_bal, v_due,
     case when v_paid > 0 then p_method end,
     nullif(btrim(coalesce(p_doctor, '')), ''), v_today,
     case when v_bal = 0 then now() end, v_uid, v_inv)
  returning id into v_tx;
  perform set_config('app.invoice_fn', 'off', true);

  perform set_config('app.invoice_row_fn', 'on', true);
  update public.invoices set mirror_tx_id = v_tx where id = v_inv;
  perform set_config('app.invoice_row_fn', 'off', true);

  if v_paid > 0 then
    insert into public.payments (invoice_id, patient_id, kind, amount, method, paid_on, mirror_tx_id, received_by)
    values (v_inv, p_patient_id, 'payment', v_paid, p_method, v_today, v_tx, v_uid);
  end if;

  return v_inv;
end;
$$;



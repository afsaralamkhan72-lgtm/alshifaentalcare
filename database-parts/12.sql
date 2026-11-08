SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: report_summary(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.report_summary(p_from date, p_to date) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare r jsonb;
begin
  if not (public.is_owner() or public.has_perm('reports.view')) then raise exception 'Sirf doctor/admin'; end if;
  if p_from is null or p_to is null or p_from > p_to then raise exception 'Tareekh ghalat hai'; end if;
  if p_to - p_from > 800 then raise exception 'Itni lambi muddat nahi, 2 saal tak chunein'; end if;

  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'income',  coalesce((select sum(amount) from public.transactions where type='income'  and transaction_date between p_from and p_to), 0),
    'expense', coalesce((select sum(amount) from public.transactions where type='expense' and transaction_date between p_from and p_to), 0),
    'income_by_method', coalesce((select jsonb_object_agg(m, s) from (
        select coalesce(payment_method,'cash') m, sum(amount) s from public.transactions
         where type='income' and transaction_date between p_from and p_to group by 1) x), '{}'::jsonb),
    'income_by_doctor', coalesce((select jsonb_object_agg(d, s) from (
        select coalesce(nullif(btrim(treating_doctor),''),'Naam nahi likha') d, sum(amount) s from public.transactions
         where type='income' and transaction_date between p_from and p_to group by 1) x), '{}'::jsonb),
    'expense_by_category', coalesce((select jsonb_object_agg(c, s) from (
        select initcap(lower(coalesce(nullif(btrim(category),''),'Other'))) c, sum(amount) s from public.transactions
         where type='expense' and transaction_date between p_from and p_to group by 1) x), '{}'::jsonb),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('date', d, 'income', i, 'expense', e) order by d) from (
        select transaction_date d,
               sum(amount) filter (where type='income') i,
               sum(amount) filter (where type='expense') e
          from public.transactions where transaction_date between p_from and p_to group by 1) x), '[]'::jsonb),
    'invoices_count', (select count(*) from public.invoices where invoice_date between p_from and p_to and status <> 'void'),
    'invoices_total', coalesce((select sum(total) from public.invoices where invoice_date between p_from and p_to and status <> 'void'), 0),
    'new_patients', (select count(*) from public.patients where created_at >= p_from::timestamptz and created_at < (p_to + 1)::timestamptz and deleted_at is null)
  ) into r;
  return r;
end;
$$;


--
-- Name: reschedule_appointment(uuid, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reschedule_appointment(p_id uuid, p_date date, p_time text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.has_perm('appointments.manage') then raise exception 'Aap ko appointment badalne ki permission nahi'; end if;
  if p_date is null then raise exception 'Nayi tareekh chunein'; end if;
  update public.appointments
     set preferred_date = p_date, preferred_time = nullif(btrim(coalesce(p_time,'')),''),
         status = case when status in ('cancelled','completed') then status else 'confirmed' end
   where id = p_id and deleted_at is null;
  if not found then raise exception 'Appointment nahi mili'; end if;
end $$;


--
-- Name: restore_inventory_item(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_inventory_item(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v public.inventory%rowtype;
begin
  if not public.is_owner() then raise exception 'Sirf owner item wapas la sakta hai'; end if;
  select * into v from public.inventory where id = p_id for update;
  if not found or v.deleted_at is null then raise exception 'Item recycle bin mein nahi hai'; end if;
  update public.inventory set deleted_at = null, is_active = true, last_updated = now() where id = p_id;
  perform public._inv_audit('RESTORE_FROM_BIN', p_id, to_jsonb(v), null);
end $$;


--
-- Name: reverse_payment(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reverse_payment(p_payment_id uuid, p_reason text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_pay   public.payments%rowtype;
  v_inv   public.invoices%rowtype;
  v_ref   uuid;
begin
  if not (public.is_owner() or public.has_perm('billing.refund')) then
    raise exception 'Sirf doctor/admin payment ulta kar sakta hai';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'Wajah likhna zaroori hai';
  end if;

  select * into v_pay from public.payments where id = p_payment_id;
  if not found then raise exception 'Payment nahi mili'; end if;
  if v_pay.kind <> 'payment' then raise exception 'Ye payment nahi, refund entry hai'; end if;
  if exists (select 1 from public.payments where reverses_payment_id = p_payment_id) then
    raise exception 'Ye payment pehle hi ulti ho chuki hai';
  end if;

  select * into v_inv from public.invoices where id = v_pay.invoice_id for update;
  if v_inv.status <> 'active' then raise exception 'Ye invoice cancel ho chuka hai'; end if;

  v_ref := public._reverse_payment_core(v_pay, v_inv, p_reason, v_uid, v_today);
  return v_ref;
end;
$$;


--
-- Name: revoke_share_links(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_share_links(p_patient uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare n int;
begin
  if not (public.is_owner() or public.has_perm('prescriptions.view')) then raise exception 'Aap ko ye karne ki ijazat nahi'; end if;
  update public.share_links set revoked_at = now() where patient_id = p_patient and revoked_at is null and expires_at > now();
  get diagnostics n = row_count;
  return n;
end $$;


--
-- Name: rotate_weak_portal_codes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rotate_weak_portal_codes() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare n int;
begin
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Sirf admin';
  end if;
  update public.patients set portal_code = public.generate_portal_code()
   where portal_code ~ '^[a-z]+-[a-z]+-[a-z]+-[0-9]{2}$';
  get diagnostics n = row_count;
  return n;
end;
$_$;


--
-- Name: save_clinical_visit(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_clinical_visit(p_id uuid, p_data jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare v_pid uuid; v_status text; m jsonb;
begin
  if not public.has_perm('clinical.edit') then raise exception 'Aap ko visit likhne ki permission nahi'; end if;
  update public.clinical_visits set
    complaint = coalesce(p_data -> 'complaint', complaint),
    findings  = coalesce(p_data -> 'findings', findings),
    diagnoses = coalesce(p_data -> 'diagnoses', diagnoses),
    notes     = case when p_data ? 'notes' then nullif(btrim(p_data ->> 'notes'), '') else notes end,
    doctor    = case when p_data ? 'doctor' then nullif(btrim(p_data ->> 'doctor'), '') else doctor end,
    next_date = case when p_data ? 'next_date' then nullif(p_data ->> 'next_date', '')::date else next_date end,
    next_time = case when p_data ? 'next_time' then nullif(p_data ->> 'next_time', '') else next_time end,
    next_treatment_id = case when p_data ? 'next_treatment_id' then nullif(p_data ->> 'next_treatment_id', '')::uuid else next_treatment_id end,
    updated_at = now()
  where id = p_id
  returning patient_id, status into v_pid, v_status;
  if not found then raise exception 'Visit nahi mila'; end if;

  -- medical / dental history (sirf jo bheji gayi wahi badalti hai)
  if jsonb_typeof(p_data -> 'history') = 'object' then
    insert into public.patient_history (patient_id, medical_history, dental_history)
    values (v_pid, coalesce(p_data -> 'history' -> 'medical_history', '{}'::jsonb), coalesce(p_data -> 'history' -> 'dental_history', '{}'::jsonb))
    on conflict (patient_id) do update set
      medical_history = case when p_data -> 'history' ? 'medical_history' then excluded.medical_history else public.patient_history.medical_history end,
      dental_history  = case when p_data -> 'history' ? 'dental_history'  then excluded.dental_history  else public.patient_history.dental_history  end;
  end if;

  -- is visit ke chart nishan (sirf is draft visit ke apne; purana record kabhi nahi chhuta)
  if jsonb_typeof(p_data -> 'chart') = 'array' and v_status = 'draft' then
    delete from public.dental_chart where clinical_visit_id = p_id and treatment_id is null;
    for m in select * from jsonb_array_elements(p_data -> 'chart') loop
      continue when coalesce(m ->> 'tooth','') !~ '^([1-4][1-8]|[5-8][1-5])$';
      insert into public.dental_chart (patient_id, tooth_number, condition, notes, recorded_by, clinical_visit_id, surfaces, state)
      values (v_pid, m ->> 'tooth', coalesce(nullif(m ->> 'condition',''), 'other'), nullif(btrim(coalesce(m ->> 'notes','')),''), auth.uid(), p_id,
              coalesce(array(select jsonb_array_elements_text(coalesce(m -> 'surfaces','[]'::jsonb))), '{}'),
              coalesce(nullif(m ->> 'state',''), 'existing'));
    end loop;
  end if;
end $_$;


--
-- Name: save_visit_draft_extra(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_visit_draft_extra(p_id uuid, p_extra jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.has_perm('clinical.edit') then raise exception 'Aap ko visit likhne ki permission nahi'; end if;
  update public.clinical_visits set draft_extra = p_extra where id = p_id and status = 'draft';
end $$;


--
-- Name: scratch_play(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.scratch_play(p_patient uuid, p_peek boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  v_cfg jsonb; v_today date := (now() at time zone 'Asia/Karachi')::date; v_days int := 30;
  c public.scratch_cards%rowtype; p public.scratch_prizes%rowtype; v_total int; v_pick int; v_id uuid;
begin
  select value into v_cfg from public.site_settings where key = 'scratch_cfg';
  if coalesce((v_cfg ->> 'enabled')::boolean, false) is not true then return jsonb_build_object('status', 'off'); end if;
  if (v_cfg ->> 'valid_days') ~ '^[0-9]+$' then v_days := greatest(1, least(365, (v_cfg ->> 'valid_days')::int)); end if;
  select * into c from public.scratch_cards where patient_id = p_patient and card_date = v_today;
  if found then
    return jsonb_build_object('status', 'played', 'title', c.title, 'kind', c.kind, 'value', c.value,
                              'treatments', to_jsonb(c.treatment_names), 'expires_at', c.expires_at);
  end if;
  if not exists (select 1 from public.loyalty_stamps where patient_id = p_patient and stamp_date = v_today and voided_at is null) then
    return jsonb_build_object('status', 'no_visit');
  end if;
  select coalesce(sum(weight), 0) into v_total from public.scratch_prizes where is_active;
  if v_total = 0 then return jsonb_build_object('status', 'off'); end if;
  if p_peek then return jsonb_build_object('status', 'available'); end if;
  v_pick := 1 + floor(random() * v_total)::int;
  select id into v_id from (
    select id, sum(weight) over (order by created_at, id) as cum from public.scratch_prizes where is_active
  ) x where cum >= v_pick order by cum limit 1;
  select * into p from public.scratch_prizes where id = v_id;
  insert into public.scratch_cards (patient_id, card_date, prize_id, title, kind, value, treatment_names, expires_at, redeemed_at)
  values (p_patient, v_today, p.id, p.title, p.kind, p.value, p.treatment_names,
          case when p.kind = 'none' then null else now() + make_interval(days => v_days) end,
          case when p.kind = 'none' then now() end)
  on conflict (patient_id, card_date) do nothing;
  select * into c from public.scratch_cards where patient_id = p_patient and card_date = v_today;
  return jsonb_build_object('status', 'won', 'title', c.title, 'kind', c.kind, 'value', c.value,
                            'treatments', to_jsonb(c.treatment_names), 'expires_at', c.expires_at);
end $_$;


--
-- Name: scratch_redeem(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.scratch_redeem(p_card uuid, p_note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare c public.scratch_cards%rowtype;
begin
  if not (public.is_owner() or public.has_perm('patients.edit')) then raise exception 'Aap ko inaam dene ki permission nahi'; end if;
  select * into c from public.scratch_cards where id = p_card for update;
  if not found then raise exception 'Card nahi mila'; end if;
  if c.redeemed_at is not null then raise exception 'Ye inaam pehle hi diya ja chuka hai'; end if;
  if c.expires_at is not null and c.expires_at <= now() then raise exception 'Is inaam ki mudat khatam ho chuki hai'; end if;
  update public.scratch_cards set redeemed_at = now(), redeemed_by = auth.uid(), redeem_note = nullif(btrim(coalesce(p_note, '')), '') where id = p_card;
end $$;


--
-- Name: seed_treatment_catalog_from_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.seed_treatment_catalog_from_history() RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare v_n int;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;

  with src as (
    select distinct on (lower(btrim(treatment_name)))
           btrim(treatment_name) as name, rate
    from public.transactions
    where treatment_name is not null and btrim(treatment_name) <> ''
      and rate is not null and rate > 0 and invoice_id is null
      and treatment_name !~* '\((baqaya|advance|month [0-9]+)\)'
    order by lower(btrim(treatment_name)), transaction_date desc, created_at desc
  ), ins as (
    insert into public.treatment_catalog (name, price)
    select name, rate from src
    on conflict do nothing
    returning 1
  )
  select count(*) into v_n from ins;
  return v_n;
end;
$$;


--
-- Name: set_discount_limit(text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_discount_limit(p_role text, p_percent numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin had badal sakta hai'; end if;
  if p_role not in ('admin','doctor','receptionist') then raise exception 'Role ghalat hai'; end if;
  if p_percent is null or p_percent < 0 or p_percent > 100 then raise exception 'Had 0 se 100 ke beech ho'; end if;
  insert into public.discount_limits(role, max_percent, updated_at) values (p_role, round(p_percent,2), now())
    on conflict (role) do update set max_percent = excluded.max_percent, updated_at = now();
end $$;


--
-- Name: set_expense_receipt(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_expense_receipt(p_tx_id uuid, p_path text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not (public.is_owner() or public.has_perm('expenses.manage')) then raise exception 'Sirf doctor/admin rasid laga sakta hai'; end if;
  if nullif(btrim(coalesce(p_path, '')), '') is null then raise exception 'Photo ka raasta khali hai'; end if;
  if not exists (select 1 from public.transactions where id = p_tx_id and type = 'expense') then raise exception 'Kharcha nahi mila'; end if;
  insert into public.expense_receipts (tx_id, path, created_by) values (p_tx_id, btrim(p_path), auth.uid())
  on conflict (tx_id) do update set path = excluded.path;
end $$;


--
-- Name: set_inventory_active(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_inventory_active(p_id uuid, p_active boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v public.inventory%rowtype;
begin
  if not (public.is_owner() or public.has_perm('inventory.manage')) then raise exception 'Permission nahi'; end if;
  select * into v from public.inventory where id = p_id for update;
  if not found or v.deleted_at is not null then raise exception 'Item nahi mila'; end if;
  if v.merged_into is not null then raise exception 'Ye item doosre item mein mil chuka hai, wapas chalu nahi ho sakta'; end if;
  update public.inventory set is_active = p_active, last_updated = now() where id = p_id;
  perform public._inv_audit(case when p_active then 'RESTORE_ACTIVE' else 'ARCHIVE' end, p_id, to_jsonb(v), null);
end $$;


--
-- Name: set_lab_case_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_lab_case_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
declare
  next_num int;
begin
  if new.case_number is null then
    select coalesce(max(substring(case_number from 5)::int), 0) + 1
      into next_num
      from public.lab_cases
     where case_number ~ '^LAB-[0-9]+$';
    new.case_number := 'LAB-' || lpad(next_num::text, 4, '0');
  end if;
  return new;
end;
$_$;



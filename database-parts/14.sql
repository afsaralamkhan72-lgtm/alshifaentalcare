SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: staff_portal_ok(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_portal_ok(p_staff_id uuid, p_ip text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.staff_portal_access
     set failed_attempts = 0, locked_until = null, last_login_at = now()
   where staff_id = p_staff_id;
  insert into public.staff_portal_log (staff_id, event, ip) values (p_staff_id, 'login_ok', p_ip);
end;
$$;


--
-- Name: staff_self_clock(uuid, text, numeric, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_self_clock(p_staff uuid, p_action text, p_lat numeric DEFAULT NULL::numeric, p_lng numeric DEFAULT NULL::numeric, p_reason text DEFAULT NULL::text, p_source text DEFAULT 'self'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  return public._staff_clock(p_staff, p_action, p_lat, p_lng, p_reason, case when p_source = 'device' then 'device' else 'self' end, null);
end $$;


--
-- Name: start_treatment(uuid, text, uuid, text[], numeric, numeric, text, text, text, date, text, text, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.start_treatment(p_patient_id uuid, p_name text, p_catalog_id uuid DEFAULT NULL::uuid, p_teeth text[] DEFAULT '{}'::text[], p_price numeric DEFAULT 0, p_paid numeric DEFAULT 0, p_method text DEFAULT 'cash'::text, p_doctor text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_next_visit date DEFAULT NULL::date, p_chart_condition text DEFAULT NULL::text, p_key text DEFAULT NULL::text, p_next_time text DEFAULT NULL::text, p_planned boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  v_t uuid; v_v uuid; v_today date := public._karachi_today();
  v_name text := btrim(coalesce(p_name, ''));
  v_price numeric(12,2) := round(coalesce(p_price, 0), 2);
  v_paid  numeric(12,2) := round(coalesce(p_paid, 0), 2);
  v_teeth text[]; v_list numeric(12,2) := 0;
begin
  if not public.has_perm('clinical.edit') then raise exception 'Aap ko treatment likhne ki permission nahi'; end if;
  if v_price > 0 and not coalesce(p_planned,false) and not public.has_perm('billing.create') then raise exception 'Aap ko qeemat (bill) likhne ki permission nahi'; end if;
  if v_paid > 0 and not public.has_perm('billing.collect') then raise exception 'Aap ko payment lene ki permission nahi'; end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('trt:' || p_key));
    select id into v_t from public.patient_treatments where idempotency_key = p_key;
    if found then return v_t; end if;
  end if;

  if not exists (select 1 from public.patients where id = p_patient_id and deleted_at is null) then raise exception 'Patient nahi mila'; end if;
  if v_name = '' then raise exception 'Treatment ka naam likhein'; end if;
  if v_price < 0 or v_paid < 0 then raise exception 'Raqam ghalat hai'; end if;
  if v_paid > v_price then raise exception 'Mili hui raqam treatment ki qeemat se zyada nahi ho sakti'; end if;
  if coalesce(p_planned,false) and v_paid > 0 then raise exception 'Plan mein payment nahi; pehle treatment shuru karein'; end if;

  select coalesce(array_agg(distinct x order by x), '{}') into v_teeth from unnest(coalesce(p_teeth, '{}')) x where btrim(x) <> '';
  if exists (select 1 from unnest(v_teeth) x where x !~ '^([1-4][1-8]|[5-8][1-5])$') then raise exception 'Daant ka number ghalat hai'; end if;

  if p_catalog_id is not null then
    select coalesce(price,0) into v_list from public.treatment_catalog where id = p_catalog_id;
    v_list := coalesce(v_list, 0);
    if v_list > 0 and public._disc_pct(v_list, v_price) > public.my_discount_limit() and v_price < v_list then
      raise exception 'Discount aap ki had (% %%) se zyada hai', public.my_discount_limit();
    end if;
  end if;

  if exists (select 1 from public.patient_treatments
              where patient_id = p_patient_id and status in ('active','planned') and lower(name) = lower(v_name)
                and teeth = v_teeth and (cardinality(v_teeth) > 0 or started_on = v_today)) then
    raise exception 'Ye treatment is patient ki pehle se hai (chal rahi ya plan mein). Neeche "Pehle se chalti treatments" mein us par tick lagayein.';
  end if;

  insert into public.patient_treatments (patient_id, catalog_id, name, teeth, status, list_price, price, doctor, started_on, notes, idempotency_key, created_by)
  values (p_patient_id, p_catalog_id, v_name, v_teeth, case when coalesce(p_planned,false) then 'planned' else 'active' end,
          v_list, v_price, nullif(btrim(coalesce(p_doctor,'')),''), v_today, nullif(btrim(coalesce(p_notes,'')),''), p_key, auth.uid())
  returning id into v_t;

  if coalesce(p_planned,false) then
    -- sirf plan: bill/visit/chart abhi nahi (chart par plan wale daant khud nazar aate hain)
    return v_t;
  end if;

  v_v := public._begin_treatment(v_t, v_price, v_paid, p_method, p_doctor, p_notes, p_next_visit, p_next_time, p_chart_condition, p_key);
  return v_t;
end $_$;


--
-- Name: stock_return_or_damage(uuid, numeric, text, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.stock_return_or_damage(p_inventory_id uuid, p_qty numeric, p_kind text, p_refund numeric DEFAULT 0, p_method text DEFAULT 'cash'::text, p_note text DEFAULT NULL::text, p_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_item public.inventory%rowtype;
  v_name text;
  v_qty numeric(12,2) := round(coalesce(p_qty, 0), 2);
  v_refund numeric(12,2) := round(coalesce(p_refund, 0), 2);
  v_after numeric(12,2);
  v_avg numeric;
  v_value numeric(12,2);
  v_tx uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not (public.is_owner() or public.has_perm('inventory.manage')) then
    raise exception 'Stock wapas/kharab likhne ki permission nahi';
  end if;
  if p_kind not in ('return_supplier', 'damaged') then raise exception 'Qism ghalat hai'; end if;
  if v_qty <= 0 then raise exception 'Qty 0 se zyada honi chahiye'; end if;
  if v_refund < 0 then raise exception 'Wapsi ki raqam ghalat hai'; end if;
  if v_refund > 0 and p_kind <> 'return_supplier' then raise exception 'Kharab maal par raqam wapas nahi aati'; end if;
  if v_refund > 0 and not public.is_owner() then raise exception 'Raqam wapas likhna sirf owner kar sakta hai'; end if;
  if v_refund > 0 and coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;
  if p_kind = 'damaged' and v_note is null then raise exception 'Kharabi ki wajah likhna zaroori hai'; end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('stk:' || p_key));
    if exists (select 1 from public.inventory_movements where batch_key = p_key) then return null; end if;
  end if;

  select * into v_item from public.inventory where id = p_inventory_id for update;
  if not found or v_item.deleted_at is not null then raise exception 'Item nahi mila'; end if;
  if v_qty > v_item.quantity then raise exception 'Itna stock maujood nahi (maujooda: %)', v_item.quantity; end if;

  select sum(total_cost) / nullif(sum(qty_change), 0) into v_avg
    from public.inventory_movements where inventory_id = p_inventory_id and kind = 'purchase' and total_cost > 0;
  v_value := round(coalesce(v_avg, 0) * v_qty, 2);
  v_after := v_item.quantity - v_qty;
  select full_name into v_name from public.staff_profiles where id = v_uid;

  perform set_config('app.stock_fn', 'on', true);
  update public.inventory set quantity = v_after, last_updated = now() where id = p_inventory_id;
  perform set_config('app.stock_fn', 'off', true);

  if v_refund > 0 then
    insert into public.transactions (type, category, amount, payment_method, description, transaction_date, recorded_by, source)
    values ('income', 'Supplier Refund', v_refund, p_method,
            'Supplier ko wapas: ' || v_item.item_name || ' x' || v_qty, v_today, v_uid, 'inventory')
    returning id into v_tx;
  end if;

  insert into public.inventory_movements
    (inventory_id, kind, qty_change, qty_after, total_cost, expense_tx_id, batch_key, note, created_by, created_by_name)
  values
    (p_inventory_id, p_kind, -v_qty, v_after, case when p_kind = 'damaged' then nullif(v_value, 0) else coalesce(nullif(v_refund, 0), nullif(v_value, 0)) end,
     v_tx, p_key, v_note, v_uid, v_name);

  perform public._inv_audit(case p_kind when 'damaged' then 'STOCK_DAMAGED' else 'STOCK_RETURN' end, p_inventory_id,
    jsonb_build_object('quantity', v_item.quantity),
    jsonb_build_object('quantity', v_after, 'qty', v_qty, 'refund', v_refund, 'loss_value', v_value, 'note', v_note));
  return v_tx;
end $$;


--
-- Name: tooth_label(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tooth_label(p text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $_$
  select case
    when p ~ '^[1-4][1-8]$' then (array['UR','UL','LL','LR'])[left(p,1)::int] || ' ' || right(p,1)
    when p ~ '^[5-8][1-5]$' then (array['UR','UL','LL','LR'])[left(p,1)::int - 4] || ' ' || chr(64 + right(p,1)::int)
    else p end;
$_$;


--
-- Name: touch_medicine(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_medicine() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  if auth.uid() is not null and tg_op = 'UPDATE' and new.stock_qty is distinct from old.stock_qty
     and coalesce(current_setting('app.med_stock_fn', true), '') <> 'on' and new.stock_qty < 0 then
    raise exception 'Stock minus nahi ho sakta';
  end if;
  return new;
end $$;


--
-- Name: touch_patient_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_patient_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: update_inventory_item(uuid, text, text, text, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_inventory_item(p_id uuid, p_name text, p_category text, p_unit text, p_reorder numeric, p_supplier text, p_group text, p_description text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_name text := btrim(coalesce(p_name, ''));
begin
  if not (public.is_owner() or public.has_perm('inventory.manage')) then raise exception 'Item badalne ki permission nahi'; end if;
  if v_name = '' then raise exception 'Item ka naam khali nahi ho sakta'; end if;
  if p_category not in ('dental', 'homeopathic', 'general') then raise exception 'Category ghalat hai'; end if;
  if coalesce(p_reorder, 0) < 0 then raise exception 'Alert level ghalat hai'; end if;
  if not exists (select 1 from public.inventory where id = p_id and deleted_at is null) then raise exception 'Item nahi mila'; end if;
  if exists (select 1 from public.inventory where id <> p_id and deleted_at is null and merged_into is null and lower(btrim(item_name)) = lower(v_name) and category = p_category) then
    raise exception 'Is naam ka item pehle se maujood hai. Dohra item ho to "Milayein (Merge)" istemal karein';
  end if;
  update public.inventory set item_name = v_name, category = p_category, unit = nullif(btrim(coalesce(p_unit, '')), ''),
    reorder_level = coalesce(p_reorder, reorder_level), supplier = nullif(btrim(coalesce(p_supplier, '')), ''),
    item_group = nullif(btrim(coalesce(p_group, '')), ''), description = nullif(btrim(coalesce(p_description, '')), ''), last_updated = now()
  where id = p_id;
end $$;


--
-- Name: verify_document(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_document(p_code text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ declare v_ok boolean := false; v_info jsonb; begin if p_code is null or length(p_code) < 20 or length(p_code) > 64 then return jsonb_build_object('ok', false); end if; select true into v_ok where exists (select 1 from public.invoices where verify_code = p_code and status <> 'void') or exists (select 1 from public.prescriptions where verify_code = p_code); if not coalesce(v_ok, false) then return jsonb_build_object('ok', false); end if; select value into v_info from public.site_settings where key = 'clinic_info'; return jsonb_build_object('ok', true, 'name', v_info->>'name', 'logo', v_info->>'logo_url'); end; $$;


--
-- Name: void_expense(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.void_expense(p_tx_id uuid, p_reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_tx public.transactions%rowtype;
begin
  if not (public.is_owner() or public.has_perm('expenses.manage')) then
    raise exception 'Sirf doctor/admin kharcha cancel kar sakta hai';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then raise exception 'Wajah likhna zaroori hai'; end if;

  select * into v_tx from public.transactions where id = p_tx_id for update;
  if not found or v_tx.type <> 'expense' then raise exception 'Kharcha nahi mila'; end if;
  if v_tx.source is not null then
    raise exception 'Ye entry % ne banayi hai, wahin se theek karein', v_tx.source;
  end if;
  if v_tx.amount = 0 then return; end if;

  update public.transactions
     set amount = 0,
         description = coalesce(description, '') || ' [CANCEL Rs. ' || v_tx.amount || ': ' || btrim(p_reason) || ']'
   where id = p_tx_id;
end;
$$;


--
-- Name: void_invoice(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.void_invoice(p_invoice_id uuid, p_reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_inv   public.invoices%rowtype;
  v_pay   public.payments%rowtype;
begin
  if not (public.is_owner() or public.has_perm('billing.refund')) then
    raise exception 'Sirf doctor/admin invoice cancel kar sakta hai';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'Wajah likhna zaroori hai';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice nahi mila'; end if;
  if v_inv.status = 'void' then return; end if;

  for v_pay in
    select p.* from public.payments p
    where p.invoice_id = p_invoice_id and p.kind = 'payment'
      and not exists (select 1 from public.payments r where r.reverses_payment_id = p.id)
    order by p.created_at desc
  loop
    perform public._reverse_payment_core(v_pay, v_inv, 'Invoice cancel: ' || p_reason, v_uid, v_today);
    select * into v_inv from public.invoices where id = p_invoice_id;
  end loop;

  perform set_config('app.invoice_fn', 'on', true);
  update public.transactions
     set rate = 0, discount_amount = 0, discount_pct = 0, amount = 0, balance_due = 0,
         settled_at = now(), due_date = null,
         description = coalesce(description, '') || ' [CANCEL]'
   where id = v_inv.mirror_tx_id;
  perform set_config('app.invoice_fn', 'off', true);

  perform set_config('app.invoice_row_fn', 'on', true);
  update public.invoices
     set status = 'void', voided_at = now(), voided_by = v_uid, void_reason = btrim(p_reason)
   where id = p_invoice_id;
  perform set_config('app.invoice_row_fn', 'off', true);
end;
$$;


--
-- Name: zz_try(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.zz_try(q text) RETURNS text
    LANGUAGE plpgsql
    AS $$
declare n bigint;
begin
  if q ilike 'select count%' then execute q into n; return 'ROWS='||n; end if;
  execute q; return 'OK';
exception when others then return 'ERR: '||left(sqlerrm,70);
end $$;


--
-- Name: _migration_report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._migration_report (
    run_id uuid NOT NULL,
    run_at timestamp with time zone DEFAULT now() NOT NULL,
    table_name text NOT NULL,
    rows_before bigint,
    rows_after bigint,
    status text NOT NULL
);


--
-- Name: appointment_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_history (
    id bigint NOT NULL,
    appointment_id uuid NOT NULL,
    action text NOT NULL,
    old_date date,
    old_time text,
    new_date date,
    new_time text,
    old_status text,
    new_status text,
    changed_by uuid,
    changed_by_name text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: appointment_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.appointment_history ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.appointment_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



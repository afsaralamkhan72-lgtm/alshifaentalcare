SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: push_on_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.push_on_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
declare k record;
begin
  if new.kind <> 'payment' then return new; end if;
  begin
    select secret, site_url into k from public.push_keys where id = 1;
    if k.secret is not null then
      perform net.http_post(
        url := rtrim(k.site_url, '/') || '/api/push/hook',
        body := jsonb_build_object('payment_id', new.id, 'amount', new.amount, 'patient_id', new.patient_id),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', k.secret)
      );
    end if;
  exception when others then
    null;
  end;
  return new;
end $$;


--
-- Name: receive_lab_case(uuid, numeric, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.receive_lab_case(p_case_id uuid, p_cost numeric, p_paid numeric DEFAULT 0, p_method text DEFAULT 'cash'::text, p_note text DEFAULT NULL::text, p_key text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_c     public.lab_cases%rowtype;
  v_cost  numeric(12,2) := round(coalesce(p_cost, 0), 2);
  v_paid  numeric(12,2) := round(coalesce(p_paid, 0), 2);
  v_pname text;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;
  if v_cost < 0 then raise exception 'Lab ka kharcha ghalat hai'; end if;
  if v_paid < 0 or v_paid > v_cost then raise exception 'Di hui raqam lab ke kharche se zyada nahi ho sakti'; end if;
  if v_paid > 0 and coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('lab:' || p_key));
    if exists (select 1 from public.transactions where idempotency_key = p_key) then return; end if;
  end if;

  select * into v_c from public.lab_cases where id = p_case_id and deleted_at is null for update;
  if not found then raise exception 'Lab case nahi mila'; end if;
  if v_c.received_at is not null then raise exception 'Ye case pehle hi "wapas aa gaya" likha ja chuka hai'; end if;
  select full_name into v_pname from public.patients where id = v_c.patient_id;

  perform set_config('app.lab_fn', 'on', true);
  update public.lab_cases
     set status = 'received', delivered_date = v_today, received_at = now(),
         cost = v_cost, lab_paid = v_paid, updated_at = now()
   where id = p_case_id;

  if v_paid > 0 then
    insert into public.transactions
      (type, category, amount, payment_method, description, transaction_date, recorded_by, source, idempotency_key)
    values
      ('expense', 'Lab', v_paid, p_method,
       'Lab ' || coalesce(v_c.case_number, '') || ': ' || v_c.lab_name || coalesce(' (' || v_pname || ')', '') ||
         coalesce(' - ' || nullif(btrim(coalesce(p_note, '')), ''), ''),
       v_today, auth.uid(), 'lab', p_key);
  elsif p_key is not null then
    -- payment nahi di: dobara bhejne ki pehchan ke liye kuch likhne ki zaroorat nahi, received_at hi guard hai
    null;
  end if;
  perform set_config('app.lab_fn', 'off', true);
end;
$$;


--
-- Name: record_payment(uuid, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_note text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_inv   public.invoices%rowtype;
  v_bill  public.transactions%rowtype;
  v_amt   numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_tx    uuid;
  v_pay   uuid;
  v_new   numeric(12,2);
begin
  perform set_config('app.invoice_ins_fn', 'on', true);  -- naye invoice/payment sirf is function se bante hain
  if not (public.is_owner() or public.has_perm('billing.collect')) then
    raise exception 'Aap ko payment lene ki permission nahi';
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtext('pay:' || p_idempotency_key));
    select id into v_pay from public.payments where idempotency_key = p_idempotency_key;
    if found then return v_pay; end if;
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice nahi mila'; end if;
  if v_inv.status <> 'active' then raise exception 'Ye invoice cancel ho chuka hai'; end if;
  if v_amt <= 0 then raise exception 'Raqam 0 se zyada honi chahiye'; end if;
  if v_amt > v_inv.total - v_inv.paid_amount then
    raise exception 'Raqam baqaya (Rs. %) se zyada hai', v_inv.total - v_inv.paid_amount;
  end if;
  if coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;

  select * into v_bill from public.transactions where id = v_inv.mirror_tx_id for update;
  v_new := v_inv.total - (v_inv.paid_amount + v_amt);

  perform set_config('app.invoice_fn', 'on', true);
  insert into public.transactions
    (patient_id, type, category, treatment_name, description, amount, balance_due,
     payment_method, treating_doctor, transaction_date, settled_at, recorded_by, invoice_id)
  values
    (v_inv.patient_id, 'income', 'treatment', coalesce(v_bill.treatment_name, 'Treatment') || ' (baqaya)',
     'Invoice ' || v_inv.invoice_number, v_amt, 0, p_method, v_inv.treating_doctor, v_today,
     now(), v_uid, v_inv.id)
  returning id into v_tx;

  update public.transactions
     set balance_due = v_new,
         settled_at  = case when v_new = 0 then now() else null end
   where id = v_inv.mirror_tx_id;
  perform set_config('app.invoice_fn', 'off', true);

  insert into public.payments
    (invoice_id, patient_id, kind, amount, method, paid_on, note, mirror_tx_id, idempotency_key, received_by)
  values
    (v_inv.id, v_inv.patient_id, 'payment', v_amt, p_method, v_today,
     nullif(btrim(coalesce(p_note, '')), ''), v_tx, p_idempotency_key, v_uid)
  returning id into v_pay;

  perform set_config('app.invoice_row_fn', 'on', true);
  update public.invoices set paid_amount = paid_amount + v_amt where id = v_inv.id;
  perform set_config('app.invoice_row_fn', 'off', true);
  return v_pay;
end;
$$;


--
-- Name: record_purchase(uuid, numeric, numeric, text, text, date, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_purchase(p_inventory_id uuid, p_qty numeric, p_total_cost numeric DEFAULT 0, p_method text DEFAULT 'cash'::text, p_supplier text DEFAULT NULL::text, p_expiry date DEFAULT NULL::date, p_note text DEFAULT NULL::text, p_kind text DEFAULT 'purchase'::text, p_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_item  public.inventory%rowtype;
  v_name  text;
  v_cost  numeric(12,2) := round(coalesce(p_total_cost, 0), 2);
  v_qty   numeric(12,2) := round(coalesce(p_qty, 0), 2);
  v_after numeric(12,2);
  v_tx    uuid;
  v_mov   bigint;
begin
  if not (public.is_owner() or public.has_perm('inventory.manage')) then
    raise exception 'Sirf doctor/admin stock kharid likh sakta hai';
  end if;
  if p_kind not in ('purchase', 'opening') then raise exception 'Qism ghalat hai'; end if;
  if v_qty <= 0 then raise exception 'Qty 0 se zyada honi chahiye'; end if;
  if v_cost < 0 then raise exception 'Qeemat ghalat hai'; end if;
  if v_cost > 0 and coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('stk:' || p_key));
    if exists (select 1 from public.inventory_movements where batch_key = p_key) then
      return null; -- pehle ho chuka
    end if;
  end if;

  select * into v_item from public.inventory where id = p_inventory_id for update;
  if not found then raise exception 'Item nahi mila'; end if;

  select full_name into v_name from public.staff_profiles where id = v_uid;
  v_after := v_item.quantity + v_qty;

  perform set_config('app.stock_fn', 'on', true);
  update public.inventory
     set quantity     = v_after,
         supplier     = coalesce(nullif(btrim(coalesce(p_supplier, '')), ''), supplier),
         expiry_date  = coalesce(p_expiry, expiry_date),
         last_updated = now()
   where id = p_inventory_id;
  perform set_config('app.stock_fn', 'off', true);

  -- Kharcha (sirf jab qeemat di ho aur kharid ho, opening stock par nahi)
  if p_kind = 'purchase' and v_cost > 0 then
    insert into public.transactions
      (type, category, amount, payment_method, description, transaction_date, recorded_by, source)
    values
      ('expense', 'Inventory', v_cost, p_method,
       'Stock kharida: ' || v_item.item_name || ' x' || v_qty ||
         coalesce(' (' || nullif(btrim(coalesce(p_supplier, '')), '') || ')', ''),
       v_today, v_uid, 'inventory')
    returning id into v_tx;
  end if;

  insert into public.inventory_movements
    (inventory_id, kind, qty_change, qty_after, total_cost, expense_tx_id, batch_key, note, created_by, created_by_name)
  values
    (p_inventory_id, p_kind, v_qty, v_after, nullif(v_cost, 0), v_tx, p_key,
     nullif(btrim(coalesce(p_note, '')), ''), v_uid, v_name)
  returning id into v_mov;

  return v_tx;
end;
$$;


--
-- Name: record_purchase_pack(uuid, numeric, numeric, numeric, text, text, text, text, text, date, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_purchase_pack(p_inventory_id uuid, p_packs numeric, p_units_per_pack numeric, p_total_cost numeric DEFAULT 0, p_method text DEFAULT 'cash'::text, p_supplier text DEFAULT NULL::text, p_company text DEFAULT NULL::text, p_bill_no text DEFAULT NULL::text, p_bill_path text DEFAULT NULL::text, p_expiry date DEFAULT NULL::date, p_note text DEFAULT NULL::text, p_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_key text := coalesce(nullif(btrim(coalesce(p_key, '')), ''), gen_random_uuid()::text);
  v_packs numeric(12,2) := round(coalesce(p_packs, 0), 2);
  v_upp numeric(10,2) := round(coalesce(p_units_per_pack, 1), 2);
  v_qty numeric(12,2);
  v_tx uuid; v_mov bigint; v_cost numeric(12,2) := round(coalesce(p_total_cost, 0), 2);
begin
  if not (public.is_owner() or public.has_perm('inventory.manage')) then
    raise exception 'Sirf doctor/admin stock kharid likh sakta hai';
  end if;
  if v_packs <= 0 then raise exception 'Packs 0 se zyada hone chahiyen'; end if;
  if v_upp <= 0 then raise exception 'Har pack mein kitni cheezen: 0 se zyada likhein'; end if;
  if p_expiry is not null and p_expiry < ((now() at time zone 'Asia/Karachi')::date - 1) then
    raise exception 'Expiry ki tareekh guzar chuki hai';
  end if;
  v_qty := round(v_packs * v_upp, 2);

  v_tx := public.record_purchase(p_inventory_id, v_qty, v_cost, p_method, p_supplier, p_expiry, p_note, 'purchase', v_key);

  select id into v_mov from public.inventory_movements where batch_key = v_key and inventory_id = p_inventory_id and kind = 'purchase' limit 1;
  if v_mov is not null then
    insert into public.inventory_purchase_meta (movement_id, supplier, company, bill_no, bill_path, packs, units_per_pack, expiry_date, unit_cost)
    values (v_mov, nullif(btrim(coalesce(p_supplier, '')), ''), nullif(btrim(coalesce(p_company, '')), ''), nullif(btrim(coalesce(p_bill_no, '')), ''),
            nullif(btrim(coalesce(p_bill_path, '')), ''), v_packs, v_upp, p_expiry, case when v_cost > 0 then round(v_cost / v_qty, 4) end)
    on conflict (movement_id) do nothing;
    insert into public.inventory_meta (inventory_id, company, units_per_pack)
    values (p_inventory_id, nullif(btrim(coalesce(p_company, '')), ''), v_upp)
    on conflict (inventory_id) do update set
      company = coalesce(excluded.company, public.inventory_meta.company), units_per_pack = excluded.units_per_pack, updated_at = now();
  end if;
  if v_tx is not null and nullif(btrim(coalesce(p_bill_path, '')), '') is not null then
    insert into public.expense_receipts (tx_id, path, created_by) values (v_tx, btrim(p_bill_path), auth.uid()) on conflict (tx_id) do nothing;
  end if;
  return v_tx;
end $$;


--
-- Name: record_stock_count(jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_stock_count(p_counts jsonb, p_note text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_name  text;
  v_batch text := gen_random_uuid()::text;
  v_c     jsonb;
  v_inv   public.inventory%rowtype;
  v_act   numeric(12,2);
  v_fixed int := 0;
begin
  if not (public.is_owner() or public.has_perm('inventory.manage')) then
    raise exception 'Sirf doctor/admin ginti likh sakta hai';
  end if;
  if p_counts is null or jsonb_typeof(p_counts) <> 'array' or jsonb_array_length(p_counts) = 0 then
    raise exception 'Koi ginti nahi';
  end if;

  select full_name into v_name from public.staff_profiles where id = v_uid;

  perform set_config('app.stock_fn', 'on', true);
  for v_c in select * from jsonb_array_elements(p_counts) loop
    if coalesce(v_c ->> 'actual', '') = '' then continue; end if; -- khali = ginti nahi hui
    v_act := round((v_c ->> 'actual')::numeric, 2);
    if v_act < 0 then raise exception 'Ginti manfi nahi ho sakti'; end if;

    select * into v_inv from public.inventory where id = (v_c ->> 'inventory_id')::uuid for update;
    if not found then raise exception 'Item nahi mila'; end if;

    insert into public.stock_counts
      (count_batch, counted_on, inventory_id, expected, actual, note, counted_by, counted_by_name)
    values
      (v_batch, v_today, v_inv.id, v_inv.quantity, v_act, nullif(btrim(coalesce(p_note, '')), ''), v_uid, v_name);

    if v_act <> v_inv.quantity then
      update public.inventory set quantity = v_act, last_updated = now() where id = v_inv.id;
      insert into public.inventory_movements
        (inventory_id, kind, qty_change, qty_after, batch_key, note, created_by, created_by_name)
      values
        (v_inv.id, 'count_correction', v_act - v_inv.quantity, v_act, v_batch,
         'Ginti: system ' || v_inv.quantity || ', asal ' || v_act, v_uid, v_name);
      v_fixed := v_fixed + 1;
    end if;
  end loop;
  perform set_config('app.stock_fn', 'off', true);

  return v_fixed;
end;
$$;


--
-- Name: record_usage(jsonb, uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_usage(p_items jsonb, p_patient_id uuid DEFAULT NULL::uuid, p_invoice_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text, p_key text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid   uuid := auth.uid();
  v_name  text;
  v_item  jsonb;
  v_inv   public.inventory%rowtype;
  v_qty   numeric(12,2);
  v_after numeric(12,2);
  v_n     int := 0;
begin
  if not public.is_staff() then
    raise exception 'Login zaroori hai';
  end if;
  -- Invoice se jurna ho to sirf owner (paison wali cheez)
  if p_invoice_id is not null and not public.is_owner() then
    raise exception 'Sirf doctor/admin invoice par istemal likh sakta hai';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Koi item nahi';
  end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('stk:' || p_key));
    if exists (select 1 from public.inventory_movements where batch_key = p_key) then
      return 0; -- pehle ho chuka, dobara deduct nahi
    end if;
  end if;

  select full_name into v_name from public.staff_profiles where id = v_uid;

  perform set_config('app.stock_fn', 'on', true);
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := round((v_item ->> 'qty')::numeric, 2);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Istemal ki qty 0 se zyada honi chahiye';
    end if;

    select * into v_inv from public.inventory
     where id = (v_item ->> 'inventory_id')::uuid for update;
    if not found then raise exception 'Item nahi mila'; end if;

    v_after := v_inv.quantity - v_qty;
    if v_after < 0 then
      raise exception 'Stock kam hai: % mein sirf % % bacha hai. Pehle stock (kharid/ginti) update karein.',
        v_inv.item_name, v_inv.quantity, coalesce(v_inv.unit, '');
    end if;
    update public.inventory set quantity = v_after, last_updated = now() where id = v_inv.id;

    insert into public.inventory_movements
      (inventory_id, kind, qty_change, qty_after, patient_id, invoice_id, treatment_id,
       batch_key, note, created_by, created_by_name)
    values
      (v_inv.id, 'usage', -v_qty, v_after, p_patient_id, p_invoice_id,
       nullif(v_item ->> 'treatment_id', '')::uuid, p_key,
       nullif(btrim(coalesce(p_note, '')), ''), v_uid, v_name);
    v_n := v_n + 1;
  end loop;
  perform set_config('app.stock_fn', 'off', true);

  return v_n;
end;
$$;



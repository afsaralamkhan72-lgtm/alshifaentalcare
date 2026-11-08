SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: guard_inventory_quantity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_inventory_quantity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.stock_fn', true), '') <> 'on' then
    if TG_OP = 'INSERT' and new.quantity <> 0 then
      raise exception 'Naya item qty 0 se banayein, phir "Opening stock" ya "Kharid" se qty dalein';
    elsif TG_OP = 'UPDATE' and new.quantity is distinct from old.quantity then
      raise exception 'Stock seedha nahi badla ja sakta. Kharid, istemal ya ginti ka option istemal karein';
    end if;
  end if;
  return new;
end;
$$;


--
-- Name: guard_invoice_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_invoice_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.invoice_ins_fn', true), '') <> 'on' then
    raise exception 'Invoice/Payment seedha nahi banti. Invoice page ke button se banayein.';
  end if;
  return new;
end;
$$;


--
-- Name: guard_invoice_row(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_invoice_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('app.invoice_row_fn', true), '') <> 'on'
     and (new.invoice_number, new.patient_id, new.invoice_date, new.subtotal, new.discount_percent,
          new.discount_amount, new.total, new.paid_amount, new.status, new.mirror_tx_id, new.voided_at,
          new.voided_by, new.void_reason, new.idempotency_key, new.created_by)
         is distinct from
         (old.invoice_number, old.patient_id, old.invoice_date, old.subtotal, old.discount_percent,
          old.discount_amount, old.total, old.paid_amount, old.status, old.mirror_tx_id, old.voided_at,
          old.voided_by, old.void_reason, old.idempotency_key, old.created_by) then
    raise exception 'Invoice ki raqam ya status seedha badalna allowed nahi. Payment / Refund / Cancel ke button se karein.';
  end if;
  return new;
end;
$$;


--
-- Name: guard_invoice_transactions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_invoice_transactions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('app.invoice_fn', true), '') <> 'on'
     and ((TG_OP = 'UPDATE' and old.invoice_id is not null)
          or (TG_OP = 'INSERT' and new.invoice_id is not null)) then
    raise exception 'Ye entry invoice se juri hai. Tabdeeli invoice page se karein.';
  end if;
  return new;
end;
$$;


--
-- Name: guard_lab_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_lab_delete() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$ begin if TG_OP = 'DELETE' then if not public.is_owner() then raise exception 'Sirf doctor/admin ye kar sakta hai'; end if; return old; end if; if new.deleted_at is distinct from old.deleted_at and not public.is_owner() then raise exception 'Sirf doctor/admin ye kar sakta hai'; end if; return new; end; $$;


--
-- Name: guard_lab_money(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_lab_money() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.lab_fn', true), '') <> 'on' then
    if TG_OP = 'INSERT' and new.lab_paid <> 0 then
      raise exception 'Lab ki payment seedha nahi likh sakte';
    elsif TG_OP = 'UPDATE' and (new.lab_paid is distinct from old.lab_paid
                                or new.cost is distinct from old.cost) then
      raise exception 'Lab ka kharcha "Lab se wapas aa gaya" ya "Lab ko payment" se likhein';
    end if;
  end if;
  return new;
end;
$$;


--
-- Name: guard_lab_patient(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_lab_patient() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is not null and new.patient_id is null then
    raise exception 'Lab case ke liye patient chunna zaroori hai';
  end if;
  return new;
end $$;


--
-- Name: guard_patient_soft_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_patient_soft_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if auth.uid() is not null
     and new.deleted_at is distinct from old.deleted_at
     and not public.is_owner() then
    raise exception 'Patient delete ya restore sirf doctor/admin kar sakta hai';
  end if;
  return new;
end;
$$;


--
-- Name: guard_public_booking(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_public_booking() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_digits text;
begin
  if auth.uid() is not null and public.is_staff() then return new; end if;   -- staff ki entry par koi rok nahi

  new.status := 'pending';
  new.source := 'website';
  new.deleted_at := null;
  new.patient_name := btrim(coalesce(new.patient_name, ''));
  new.phone := btrim(coalesce(new.phone, ''));
  v_digits := regexp_replace(new.phone, '[^0-9]', '', 'g');

  if length(new.patient_name) < 2 or length(new.patient_name) > 100 then raise exception 'Naam theek nahi'; end if;
  if length(v_digits) < 10 or length(v_digits) > 15 then raise exception 'Phone number theek nahi'; end if;
  if new.treatment_name is not null and length(new.treatment_name) > 150 then raise exception 'Treatment ka naam bohat lamba hai'; end if;
  if new.preferred_date is not null
     and (new.preferred_date < current_date - 1 or new.preferred_date > current_date + 365) then
    raise exception 'Tareekh theek nahi';
  end if;
  if (select count(*) from public.appointments
       where regexp_replace(phone, '[^0-9]', '', 'g') = v_digits and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'Is number se pehle hi bohat requests aa chuki hain. Baraye meherbani WhatsApp par raabta karein';
  end if;
  if (select count(*) from public.appointments
       where source = 'website' and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Abhi bohat requests aa rahi hain. Baraye meherbani WhatsApp par raabta karein';
  end if;
  return new;
end $$;


--
-- Name: guard_staff_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_staff_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Staff profile delete nahi hoti, sirf deactivate karein';
  end if;
  if tg_op = 'UPDATE' and auth.uid() is not null then
    if new.id <> old.id then raise exception 'Staff ID nahi badal sakti'; end if;
    if old.id = auth.uid() and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
      raise exception 'Apna role ya active status khud nahi badal sakte';
    end if;
    if old.role = 'admin' and old.is_active and (new.role <> 'admin' or not new.is_active)
       and (select count(*) from public.staff_profiles where role = 'admin' and is_active and id <> old.id) = 0 then
      raise exception 'Aakhri active admin ko hata nahi sakte';
    end if;
  end if;
  return coalesce(new, old);
end $$;


--
-- Name: guard_visit_note(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_visit_note() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if old.voided_at is not null then
    raise exception 'Cancel ho chuka note badla nahi ja sakta';
  end if;
  if new.voided_at is not null then
    if coalesce(btrim(new.void_reason), '') = '' then raise exception 'Cancel ki wajah likhna zaroori hai'; end if;
    new.voided_by := auth.uid();
  end if;
  if new.patient_id <> old.patient_id then raise exception 'Note ka patient nahi badal sakte'; end if;
  return new;
end $$;


--
-- Name: has_perm(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_perm(p_code text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.staff_profiles s
     where s.id = auth.uid() and s.is_active = true
       and ( s.role in ('admin','doctor')
             or exists (select 1 from public.staff_permissions sp
                         where sp.user_id = s.id and sp.perm_code = p_code) )
  );
$$;


--
-- Name: has_role(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(required_role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid() and is_active = true and role = required_role
  );
$$;


--
-- Name: inventory_item_flags(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inventory_item_flags() RETURNS TABLE(inventory_id uuid, has_history boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select i.id, public._inv_has_history(i.id) from public.inventory i
   where (public.is_owner() or public.has_perm('inventory.view'))
$$;


--
-- Name: inventory_movements_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inventory_movements_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'Stock movement mein tabdeeli ya delete allowed nahi hai';
end;
$$;


--
-- Name: inventory_reconcile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.inventory_reconcile() RETURNS TABLE(inventory_id uuid, item_name text, quantity numeric, movements_sum numeric, opening_gap numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select i.id, i.item_name, i.quantity, coalesce(sum(m.qty_change), 0), i.quantity - coalesce(sum(m.qty_change), 0)
  from public.inventory i left join public.inventory_movements m on m.inventory_id = i.id
  where (public.is_owner() or public.has_perm('inventory.view'))
  group by i.id
  having i.quantity <> coalesce(sum(m.qty_change), 0)
  order by i.item_name
$$;


--
-- Name: invoice_reconcile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invoice_reconcile() RETURNS TABLE(invoice_id uuid, invoice_number text, paid_amount numeric, payments_sum numeric, txn_sum numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select i.id, i.invoice_number, i.paid_amount, x.ps, y.ts
  from public.invoices i
  cross join lateral (select coalesce(sum(case when p.kind = 'refund' then -p.amount else p.amount end), 0) as ps from public.payments p where p.invoice_id = i.id) x
  cross join lateral (select coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0) as ts from public.transactions t where t.invoice_id = i.id) y
  where i.status = 'active' and (public.is_owner() or public.has_perm('reports.view'))
    and (abs(i.paid_amount - x.ps) > 0.01 or abs(i.paid_amount - y.ts) > 0.01)
  order by i.invoice_number
$$;


--
-- Name: is_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_owner() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid() and is_active = true and role in ('admin', 'doctor')
  );
$$;


--
-- Name: is_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid() and is_active = true
  );
$$;


--
-- Name: leave_type_save(uuid, text, boolean, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.leave_type_save(p_id uuid, p_name text, p_paid boolean, p_quota integer, p_active boolean DEFAULT true) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_id uuid;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin badal sakta hai'; end if;
  if btrim(coalesce(p_name, '')) = '' then raise exception 'Naam likhein'; end if;
  if p_quota is not null and p_quota < 0 then raise exception 'Quota ghalat hai'; end if;
  if p_id is null then
    insert into public.leave_types(name, paid, yearly_quota, active) values (btrim(p_name), coalesce(p_paid, true), p_quota, coalesce(p_active, true)) returning id into v_id;
  else
    update public.leave_types set name = btrim(p_name), paid = coalesce(p_paid, true), yearly_quota = p_quota, active = coalesce(p_active, true)
     where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Qism nahi mili'; end if;
  end if;
  return v_id;
end $$;


--
-- Name: link_appointment_patient(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_appointment_patient(p_appt uuid, p_create boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare a public.appointments%rowtype; d text; n int; pid uuid;
begin
  if not public.has_perm('appointments.manage') then raise exception 'Aap ko appointment sambhalne ki permission nahi'; end if;
  select * into a from public.appointments where id = p_appt for update;
  if not found then raise exception 'Appointment nahi mili'; end if;
  if a.patient_id is not null then return a.patient_id; end if;
  d := right(regexp_replace(coalesce(a.phone, ''), '[^0-9]', '', 'g'), 10);
  if length(d) >= 10 then
    select count(*) into n from public.patients
     where deleted_at is null and right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = d;
    if n = 1 then
      select id into pid from public.patients where deleted_at is null and right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = d;
    elsif n > 1 then   -- ghar mein aik phone: naam se pehchano, warna na jodo (galat bande se na jur jaye)
      select id into pid from public.patients
       where deleted_at is null and right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = d
         and lower(btrim(full_name)) = lower(btrim(a.patient_name)) limit 1;
    end if;
  end if;
  if pid is null and p_create then
    if not public.has_perm('patients.create') then raise exception 'Aap ko naya patient banane ki permission nahi'; end if;
    insert into public.patients (full_name, phone, department, registered_by)
    values (btrim(a.patient_name), btrim(a.phone), case when a.department = 'homeopathic' then 'homeopathic' else 'dental' end, auth.uid())
    returning id into pid;
  end if;
  if pid is not null then update public.appointments set patient_id = pid where id = a.id; end if;
  return pid;
end $$;



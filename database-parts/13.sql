SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: set_next_invoice_number(integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_next_invoice_number(p_next integer, p_prefix text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
declare v_max int;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;
  select coalesce(max((substring(invoice_number from '([0-9]+)$'))::int), 0) into v_max from public.invoices;
  if p_next is null or p_next <= v_max then
    raise exception 'Number % se bara hona chahiye (jari ho chuka: %)', v_max, v_max;
  end if;
  update public.invoice_counter
     set next_no = p_next,
         prefix  = coalesce(nullif(btrim(p_prefix), ''), prefix)
   where id = 1;
end;
$_$;


--
-- Name: set_portal_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_portal_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.portal_code is null then
    new.portal_code := public.generate_portal_code();
  end if;
  return new;
end;
$$;


--
-- Name: set_staff_permissions(uuid, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_staff_permissions(p_user uuid, p_codes text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_role text;
begin
  if not public.has_role('admin') then raise exception 'Sirf admin permissions badal sakta hai'; end if;
  select role into v_role from public.staff_profiles where id = p_user;
  if v_role is null then raise exception 'Staff member nahi mila'; end if;
  if p_user = auth.uid() then raise exception 'Apni permissions khud nahi badal sakte'; end if;
  if exists (select 1 from unnest(coalesce(p_codes,'{}')) c where c not in (select code from public.permission_catalog)) then
    raise exception 'Ghalat permission code';
  end if;
  delete from public.staff_permissions
   where user_id = p_user and perm_code <> all (coalesce(p_codes,'{}'));
  insert into public.staff_permissions (user_id, perm_code, granted_by)
  select p_user, c, auth.uid() from unnest(coalesce(p_codes,'{}')) c
  on conflict do nothing;
end $$;


--
-- Name: set_treatment_status(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_treatment_status(p_treatment_id uuid, p_status text, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_t public.patient_treatments%rowtype; r record;
begin
  if not public.has_perm('clinical.edit') then raise exception 'Aap ko permission nahi'; end if;
  select * into v_t from public.patient_treatments where id = p_treatment_id for update;
  if not found then raise exception 'Treatment nahi mili'; end if;

  if p_status = 'completed' then
    if v_t.status <> 'active' then raise exception 'Sirf chalti treatment mukammal ho sakti hai'; end if;
    update public.patient_treatments set status = 'completed', completed_on = public._karachi_today() where id = v_t.id;
  elsif p_status = 'active' then
    if v_t.status <> 'completed' then raise exception 'Sirf mukammal treatment dobara khul sakti hai'; end if;
    update public.patient_treatments set status = 'active', completed_on = null where id = v_t.id;
  elsif p_status = 'cancelled' then
    if v_t.status = 'cancelled' then return; end if;
    if btrim(coalesce(p_reason,'')) = '' then raise exception 'Cancel ki wajah likhna zaroori hai'; end if;
    if exists (select 1 from public.invoices where patient_treatment_id = v_t.id and status = 'active') then
      if not (public.is_owner() or public.has_perm('billing.refund')) then raise exception 'Bill wali treatment sirf refund permission wala cancel kar sakta hai'; end if;
      for r in select id from public.invoices where patient_treatment_id = v_t.id and status = 'active' loop
        perform public.void_invoice(r.id, 'Treatment cancel: ' || btrim(p_reason));
      end loop;
    end if;
    update public.patient_treatments set status = 'cancelled', cancelled_at = now(), cancel_reason = btrim(p_reason) where id = v_t.id;
  else
    raise exception 'Ghalat status';
  end if;
end $$;


--
-- Name: share_fail(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.share_fail(p_token text) RETURNS timestamp with time zone
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_until timestamptz;
begin
  update public.share_links
     set fail_count = case when fail_count + 1 >= 5 then 0 else fail_count + 1 end,
         locked_until = case when fail_count + 1 >= 5 then now() + interval '15 minutes' else locked_until end
   where token = p_token
  returning locked_until into v_until;
  return v_until;
end $$;


--
-- Name: share_ok(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.share_ok(p_token text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update public.share_links set fail_count = 0 where token = p_token;
$$;


--
-- Name: staff_acknowledge(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_acknowledge(p_staff_id uuid, p_entry_id uuid, p_ip text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_n int;
begin
  update public.staff_ledger
     set acknowledged_at = now()
   where id = p_entry_id and staff_id = p_staff_id
     and kind in ('advance', 'payout') and acknowledged_at is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into public.staff_portal_log (staff_id, event, ip, detail) values (p_staff_id, 'ack', p_ip, p_entry_id::text);
  end if;
  return v_n > 0;
end;
$$;


--
-- Name: staff_add_entry(uuid, text, numeric, date, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_add_entry(p_staff_id uuid, p_kind text, p_amount numeric, p_date date DEFAULT NULL::date, p_period text DEFAULT NULL::text, p_method text DEFAULT 'cash'::text, p_note text DEFAULT NULL::text, p_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_amt   numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_s     public.staff_members%rowtype;
  v_name  text;
  v_bal   numeric(12,2);
  v_signed numeric(12,2);
  v_tx    uuid;
  v_id    uuid;
  v_date  date := coalesce(p_date, v_today);
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin staff ka hisaab likh sakta hai';
  end if;
  if p_kind not in ('salary_due', 'bonus', 'deduction', 'advance', 'payout') then
    raise exception 'Qism ghalat hai';
  end if;
  if v_amt <= 0 or v_amt > 100000000 then raise exception 'Raqam ghalat hai'; end if;
  if v_date > v_today + 1 then raise exception 'Aane wali tareekh nahi likh sakte'; end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('stf:' || p_key));
    select id into v_id from public.staff_ledger where idempotency_key = p_key;
    if found then return v_id; end if;
  end if;

  select * into v_s from public.staff_members where id = p_staff_id for update;
  if not found then raise exception 'Staff nahi mila'; end if;
  if not v_s.is_active then raise exception 'Ye staff band hai'; end if;

  if p_kind in ('advance', 'payout') and coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;
  if p_kind = 'deduction' and btrim(coalesce(p_note, '')) = '' then
    raise exception 'Katauti ki wajah likhna zaroori hai';
  end if;
  if p_kind = 'salary_due' and (p_period is null or p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$') then
    raise exception 'Mahina YYYY-MM likhein';
  end if;

  select coalesce(sum(amount), 0) into v_bal from public.staff_ledger where staff_id = p_staff_id;
  if p_kind = 'payout' and v_amt > greatest(v_bal, 0) then
    raise exception 'Baqaya sirf Rs. % hai. Is se zyada dena ho to "Advance" likhein', greatest(v_bal, 0);
  end if;

  v_signed := case when p_kind in ('salary_due', 'bonus') then v_amt else -v_amt end;
  select full_name into v_name from public.staff_profiles where id = v_uid;

  -- Cash nikla to kharcha khud likha jata hai
  if p_kind in ('advance', 'payout') then
    insert into public.transactions
      (type, category, amount, payment_method, description, transaction_date, recorded_by, source)
    values
      ('expense',
       case when p_kind = 'advance' then 'Staff Advance' else 'Salary' end,
       v_amt, p_method,
       case when p_kind = 'advance' then 'Advance: ' else 'Tankhwah: ' end || v_s.full_name ||
         coalesce(' (' || p_period || ')', '') ||
         coalesce(' - ' || nullif(btrim(coalesce(p_note, '')), ''), ''),
       v_date, v_uid, 'payroll')
    returning id into v_tx;
  end if;

  insert into public.staff_ledger
    (staff_id, entry_date, kind, amount, period, method, note, expense_tx_id, created_by, created_by_name, idempotency_key)
  values
    (p_staff_id, v_date, p_kind, v_signed, p_period,
     case when p_kind in ('advance', 'payout') then p_method end,
     nullif(btrim(coalesce(p_note, '')), ''), v_tx, v_uid, v_name, p_key)
  returning id into v_id;

  return v_id;
end;
$_$;


--
-- Name: staff_att_settings(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_att_settings(p_staff uuid, p jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_off int[];
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin badal sakta hai'; end if;
  if not exists (select 1 from public.staff_members where id = p_staff) then raise exception 'Staff nahi mila'; end if;
  if p ? 'weekly_off' then
    if jsonb_typeof(p -> 'weekly_off') = 'null' then v_off := null;
    else select coalesce(array_agg(distinct x::int order by x::int), '{}') into v_off from jsonb_array_elements_text(p -> 'weekly_off') x;
    end if;
  end if;
  update public.staff_members set
    shift_start = case when p ? 'shift_start' then nullif(p ->> 'shift_start', '')::time else shift_start end,
    shift_end = case when p ? 'shift_end' then nullif(p ->> 'shift_end', '')::time else shift_end end,
    weekly_off = case when p ? 'weekly_off' then v_off else weekly_off end,
    attendance_on = coalesce((p ->> 'attendance_on')::boolean, attendance_on),
    joined_on = case when p ? 'joined_on' then nullif(p ->> 'joined_on', '')::date else joined_on end,
    profile_id = case when p ? 'profile_id' then nullif(p ->> 'profile_id', '')::uuid else profile_id end
  where id = p_staff;
end $$;


--
-- Name: staff_attendance_request(uuid, text, text, date, time without time zone, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_attendance_request(p_staff uuid, p_kind text, p_reason text, p_date date DEFAULT NULL::date, p_time time without time zone DEFAULT NULL::time without time zone, p_lat numeric DEFAULT NULL::numeric, p_lng numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  return public._att_request(p_staff, p_kind, p_date, p_time, p_reason, p_lat, p_lng);
end $$;


--
-- Name: staff_attendance_state(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_attendance_state(p_staff uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  return public._att_state(p_staff);
end $$;


--
-- Name: staff_generate_salary(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_generate_salary(p_period text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  v_n    int;
  v_today date := (now() at time zone 'Asia/Karachi')::date;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;
  if p_period is null or p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Mahina YYYY-MM likhein';
  end if;
  select full_name into v_name from public.staff_profiles where id = v_uid;

  with ins as (
    insert into public.staff_ledger (staff_id, entry_date, kind, amount, period, note, created_by, created_by_name)
    select s.id, v_today, 'salary_due', s.monthly_salary, p_period, 'Mahine ki tankhwah', v_uid, v_name
    from public.staff_members s
    where s.is_active and s.monthly_salary > 0
    on conflict (staff_id, period) where kind = 'salary_due' do nothing
    returning 1
  )
  select count(*) into v_n from ins;
  return v_n;
end;
$_$;


--
-- Name: staff_ledger_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_ledger_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if TG_OP = 'DELETE' then
    raise exception 'Staff ledger mein delete allowed nahi hai';
  end if;
  -- sirf acknowledged_at (pehli baar) badal sakta hai
  if (to_jsonb(old) - 'acknowledged_at') is distinct from (to_jsonb(new) - 'acknowledged_at')
     or old.acknowledged_at is not null then
    raise exception 'Staff ledger mein tabdeeli allowed nahi hai';
  end if;
  return new;
end;
$$;


--
-- Name: staff_portal_fail(uuid, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_portal_fail(p_staff_id uuid, p_ip text, p_max integer DEFAULT 5, p_lock_minutes integer DEFAULT 15) RETURNS timestamp with time zone
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_until timestamptz;
begin
  update public.staff_portal_access
     set failed_attempts = failed_attempts + 1,
         locked_until = case when failed_attempts + 1 >= p_max
                             then now() + make_interval(mins => p_lock_minutes) else locked_until end
   where staff_id = p_staff_id
   returning locked_until into v_until;
  insert into public.staff_portal_log (staff_id, event, ip)
  values (p_staff_id, case when v_until is not null and v_until > now() then 'locked' else 'login_fail' end, p_ip);
  return v_until;
end;
$$;


--
-- Name: staff_portal_log_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_portal_log_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'Portal log mein tabdeeli ya delete allowed nahi hai';
end;
$$;



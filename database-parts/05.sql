SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: apply_reward_discount(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_reward_discount(p_invoice uuid, p_source text, p_reward uuid) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_inv public.invoices%rowtype; v_out numeric(12,2); v_kind text; v_val numeric; v_names text[]; v_title text;
  v_patient uuid; v_red timestamptz; v_exp timestamptz; v_base numeric(12,2); v_d numeric(12,2); v_pct numeric; v_newbal numeric(12,2); s record;
begin
  if not (public.is_owner() or public.has_perm('billing.collect')) then raise exception 'Aap ko payment lene ki permission nahi'; end if;
  select * into v_inv from public.invoices where id = p_invoice for update;
  if not found then raise exception 'Invoice nahi mila'; end if;
  if v_inv.status <> 'active' then raise exception 'Ye invoice cancel ho chuka hai'; end if;
  v_out := v_inv.total - v_inv.paid_amount;
  if v_out <= 0 or v_inv.subtotal <= 0 then raise exception 'Is bill par baqaya nahi, chhoot nahi lag sakti'; end if;
  if p_source = 'unlock' then
    select patient_id, kind, value, treatment_names, title, redeemed_at, expires_at into v_patient, v_kind, v_val, v_names, v_title, v_red, v_exp
      from public.loyalty_unlocks where id = p_reward for update;
  elsif p_source = 'scratch' then
    select patient_id, kind, value, treatment_names, title, redeemed_at, expires_at into v_patient, v_kind, v_val, v_names, v_title, v_red, v_exp
      from public.scratch_cards where id = p_reward for update;
  else
    raise exception 'Inaam ki qism ghalat hai';
  end if;
  if v_patient is null then raise exception 'Inaam nahi mila'; end if;
  if v_patient <> v_inv.patient_id then raise exception 'Ye inaam is marez ka nahi'; end if;
  if v_red is not null then raise exception 'Ye inaam pehle hi diya ja chuka hai'; end if;
  if v_exp is not null and v_exp <= now() then raise exception 'Is inaam ki mudat khatam ho chuki hai'; end if;
  if v_kind not in ('percent', 'amount') then raise exception 'Ye inaam chhoot nahi hai, haath se dein aur "Inaam diya" dabayein'; end if;
  select coalesce(sum(line_total), 0) into v_base from public.invoice_items
   where invoice_id = v_inv.id
     and (coalesce(cardinality(v_names), 0) = 0
          or exists (select 1 from unnest(v_names) n where btrim(n) <> '' and lower(name) like '%' || lower(btrim(n)) || '%'));
  if v_base <= 0 then raise exception 'Is bill mein inaam wali treatment nahi'; end if;
  v_d := case when v_kind = 'percent' then round(v_base * coalesce(v_val, 0) / 100, 2) else least(coalesce(v_val, 0), v_base) end;
  v_d := least(v_d, v_out);
  if v_d <= 0 then raise exception 'Chhoot ki raqam zero hai'; end if;
  v_pct := round((v_inv.discount_amount + v_d) * 100 / v_inv.subtotal, 2);
  perform set_config('app.invoice_row_fn', 'on', true);
  update public.invoices set discount_amount = discount_amount + v_d, total = total - v_d, discount_percent = least(100, v_pct) where id = v_inv.id;
  perform set_config('app.invoice_row_fn', 'off', true);
  v_newbal := v_out - v_d;
  if v_inv.mirror_tx_id is not null then
    perform set_config('app.invoice_fn', 'on', true);
    update public.transactions
       set discount_amount = coalesce(discount_amount, 0) + v_d, discount_pct = least(100, v_pct),
           balance_due = v_newbal, settled_at = case when v_newbal = 0 then coalesce(settled_at, now()) else settled_at end
     where id = v_inv.mirror_tx_id;
    perform set_config('app.invoice_fn', 'off', true);
  end if;
  select full_name, role into s from public.staff_profiles where id = auth.uid();
  insert into public.discount_log(kind, patient_id, invoice_id, base_amount, discount_amount, percent, given_by, given_by_name, given_by_role, note)
  values ('bill', v_inv.patient_id, v_inv.id, v_base, v_d, round(v_d * 100 / v_base, 2), auth.uid(), s.full_name, s.role, 'Loyalty inaam: ' || v_title);
  if p_source = 'unlock' then
    update public.loyalty_unlocks set redeemed_at = now(), redeemed_by = auth.uid(), redeem_note = 'Bill par chhoot lagayi' where id = p_reward;
  else
    update public.scratch_cards set redeemed_at = now(), redeemed_by = auth.uid(), redeem_note = 'Bill par chhoot lagayi' where id = p_reward;
  end if;
  return v_d;
end $$;


--
-- Name: attendance_apply_deduction(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_apply_deduction(p_staff uuid, p_period text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare s record; v_note text;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin katauti laga sakta hai'; end if;
  if exists (select 1 from public.payroll_periods where staff_id = p_staff and period = p_period) then
    raise exception 'Is mahine ka hisab tayyar (lock) ho chuka hai, katauti pehle hi shamil hai';
  end if;
  select * into s from public.attendance_summary(p_period) x where x.staff_id = p_staff;
  if not found then raise exception 'Staff nahi mila'; end if;
  if s.applied then raise exception 'Is mahine ki katauti pehle lag chuki hai'; end if;
  if s.suggested <= 0 then raise exception 'Is mahine koi katauti nahi banti'; end if;
  v_note := 'Hazri ke hisaab se (' || p_period || '): ghair-hazri ' || s.absent || ', aadha din ' || s.half || ', late ' || s.late;
  return public.staff_add_entry(p_staff, 'deduction', s.suggested, null, p_period, 'cash', v_note, 'att:' || p_staff || ':' || p_period);
end $$;


--
-- Name: attendance_clock(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_clock(p_staff uuid, p_action text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_now time := (now() at time zone 'Asia/Karachi')::time(0); v_d date := public._att_today();
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin hazri laga sakta hai'; end if;
  if not exists (select 1 from public.staff_members where id = p_staff and is_active) then raise exception 'Staff nahi mila ya band hai'; end if;
  if p_action = 'in' then
    insert into public.staff_attendance(staff_id, att_date, status, check_in, marked_by) values (p_staff, v_d, 'present', v_now, auth.uid())
    on conflict (staff_id, att_date) do update
      set status = 'present', check_in = coalesce(public.staff_attendance.check_in, excluded.check_in), marked_by = auth.uid(), marked_at = now()
      where public.staff_attendance.status in ('absent','leave') or public.staff_attendance.check_in is null;
  elsif p_action = 'out' then
    update public.staff_attendance set check_out = v_now, marked_by = auth.uid(), marked_at = now()
     where staff_id = p_staff and att_date = v_d and status in ('present','half');
    if not found then raise exception 'Pehle "aaya" likhein'; end if;
  else
    raise exception 'Action ghalat hai';
  end if;
end $$;


--
-- Name: attendance_day_view(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_day_view(p_date date) RETURNS TABLE(staff_id uuid, full_name text, title text, track boolean, status text, check_in time without time zone, check_out time without time zone, source text, late_reason text, shift_s time without time zone, shift_e time without time zone, open_day boolean, late_min integer, early_min integer, ot_min integer, leave_name text, pending_requests integer)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
#variable_conflict use_column
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin dekh sakta hai'; end if;
  if p_date is null or p_date > public._att_today() then raise exception 'Aane wali tareekh nahi dekh sakte'; end if;
  return query
  select x.staff_id, s.full_name, s.title, x.track, x.status, x.check_in, x.check_out,
         a.source, a.late_reason, x.shift_s, x.shift_e, x.open_day,
         x.late_min, x.early_min, x.ot_min, lt.name,
         (select count(*)::int from public.attendance_requests q where q.staff_id = x.staff_id and q.att_date = p_date and q.status = 'pending')
    from public._att_days(to_char(p_date, 'YYYY-MM')) x
    join public.staff_members s on s.id = x.staff_id
    left join public.staff_attendance a on a.staff_id = x.staff_id and a.att_date = p_date
    left join public.leave_types lt on lt.id = a.leave_type_id
   where x.d = p_date and x.in_range
   order by s.full_name;
end $$;


--
-- Name: attendance_mark(uuid, date, text, time without time zone, time without time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_mark(p_staff uuid, p_date date, p_status text, p_in time without time zone DEFAULT NULL::time without time zone, p_out time without time zone DEFAULT NULL::time without time zone, p_note text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_id uuid;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin hazri laga sakta hai'; end if;
  if p_status not in ('present','absent','leave','half') then raise exception 'Hazri ki qism ghalat hai'; end if;
  if p_date is null or p_date > public._att_today() then raise exception 'Aane wali tareekh ki hazri nahi lag sakti'; end if;
  if not exists (select 1 from public.staff_members where id = p_staff and is_active) then raise exception 'Staff nahi mila ya band hai'; end if;
  if p_out is not null and p_in is not null and p_out < p_in then raise exception 'Jaane ka waqt aane se pehle nahi ho sakta'; end if;
  insert into public.staff_attendance(staff_id, att_date, status, check_in, check_out, note, marked_by)
  values (p_staff, p_date, p_status,
          case when p_status in ('present','half') then p_in end,
          case when p_status in ('present','half') then p_out end,
          nullif(btrim(coalesce(p_note,'')),''), auth.uid())
  on conflict (staff_id, att_date) do update
    set status = excluded.status, check_in = excluded.check_in, check_out = excluded.check_out,
        note = excluded.note, marked_by = excluded.marked_by, marked_at = now()
  returning id into v_id;
  return v_id;
end $$;


--
-- Name: attendance_mark2(uuid, date, text, time without time zone, time without time zone, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_mark2(p_staff uuid, p_date date, p_status text, p_in time without time zone DEFAULT NULL::time without time zone, p_out time without time zone DEFAULT NULL::time without time zone, p_note text DEFAULT NULL::text, p_leave_type uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_id uuid;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin hazri laga sakta hai'; end if;
  if p_leave_type is not null and not exists (select 1 from public.leave_types where id = p_leave_type) then
    raise exception 'Chhutti ki qism nahi mili';
  end if;
  v_id := public.attendance_mark(p_staff, p_date, p_status, p_in, p_out, p_note);
  update public.staff_attendance set source = 'admin',
         leave_type_id = case when p_status = 'leave' then p_leave_type end
   where id = v_id;
  return v_id;
end $$;


--
-- Name: attendance_mark_all_present(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_mark_all_present(p_date date DEFAULT NULL::date) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_n int; v_d date := coalesce(p_date, public._att_today());
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin hazri laga sakta hai'; end if;
  if v_d > public._att_today() then raise exception 'Aane wali tareekh ki hazri nahi lag sakti'; end if;
  with ins as (
    insert into public.staff_attendance(staff_id, att_date, status, marked_by)
    select s.id, v_d, 'present', auth.uid() from public.staff_members s where s.is_active
    on conflict (staff_id, att_date) do nothing returning 1)
  select count(*) into v_n from ins;
  return v_n;
end $$;


--
-- Name: attendance_month_days(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_month_days(p_staff uuid, p_period text) RETURNS TABLE(d date, open_day boolean, in_range boolean, status text, check_in time without time zone, check_out time without time zone, late_min integer, early_min integer, absent_min integer, ot_min integer, unmarked boolean, missing_out boolean, leave_paid boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
#variable_conflict use_column
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin dekh sakta hai'; end if;
  if p_period is null or p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Mahina YYYY-MM likhein'; end if;
  return query
  select x.d, x.open_day, x.in_range, x.status, x.check_in, x.check_out, x.late_min, x.early_min, x.absent_min, x.ot_min,
         x.unmarked, x.missing_out, x.leave_paid
    from public._att_days(p_period, p_staff) x order by x.d;
end $_$;


--
-- Name: attendance_request_decide(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_request_decide(p_id uuid, p_approve boolean, p_note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare q public.attendance_requests%rowtype;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin faisla kar sakta hai'; end if;
  select * into q from public.attendance_requests where id = p_id for update;
  if not found then raise exception 'Darkhwast nahi mili'; end if;
  if q.status <> 'pending' then raise exception 'Is darkhwast ka faisla ho chuka hai'; end if;
  if p_approve then
    if q.kind = 'in' then
      insert into public.staff_attendance(staff_id, att_date, status, check_in, marked_by, source, late_reason)
      values (q.staff_id, q.att_date, 'present', q.req_time, auth.uid(), 'request', q.reason)
      on conflict (staff_id, att_date) do update
        set status = 'present', check_in = excluded.check_in, marked_by = excluded.marked_by, marked_at = now(),
            source = 'request', late_reason = excluded.late_reason, leave_type_id = null;
    else
      update public.staff_attendance set check_out = q.req_time, marked_by = auth.uid(), marked_at = now()
       where staff_id = q.staff_id and att_date = q.att_date and status in ('present', 'half') and check_in is not null and check_in <= q.req_time;
      if not found then raise exception 'Pehle aane ka waqt likhna zaroori hai (ya jaane ka waqt aane se pehle hai)'; end if;
    end if;
  end if;
  update public.attendance_requests set status = case when p_approve then 'approved' else 'rejected' end, decided_by = auth.uid(), decided_at = now(), decision_note = nullif(btrim(coalesce(p_note, '')), '') where id = p_id;
end $$;


--
-- Name: attendance_set_clinic_location(numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_set_clinic_location(p_lat numeric, p_lng numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin location badal sakta hai'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Location ghalat hai';
  end if;
  update public.attendance_rules set clinic_lat = round(p_lat, 6), clinic_lng = round(p_lng, 6), updated_at = now() where id = 1;
end $$;


--
-- Name: attendance_set_rules(time without time zone, integer, numeric, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_set_rules(p_start time without time zone, p_grace integer, p_late_cut numeric, p_absent_cut boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin qaide badal sakta hai'; end if;
  if p_grace is null or p_grace < 0 or p_grace > 240 then raise exception 'Mohlat 0 se 240 minute'; end if;
  if p_late_cut is null or p_late_cut < 0 then raise exception 'Late ki katauti ghalat hai'; end if;
  update public.attendance_rules set work_start = coalesce(p_start, work_start), grace_minutes = p_grace,
         late_cut = round(p_late_cut,2), absent_cut = coalesce(p_absent_cut,false), updated_at = now() where id = 1;
end $$;


--
-- Name: attendance_set_rules2(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_set_rules2(p jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare r public.attendance_rules%rowtype; v_off int[];
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin qaide badal sakta hai'; end if;
  select * into r from public.attendance_rules where id = 1;
  if p ? 'weekly_off' then
    select coalesce(array_agg(distinct x::int order by x::int), '{}') into v_off from jsonb_array_elements_text(p -> 'weekly_off') x;
    if exists (select 1 from unnest(v_off) z where z < 0 or z > 6) then raise exception 'Haftawar chhutti ka din ghalat hai'; end if;
  else
    v_off := r.weekly_off;
  end if;
  update public.attendance_rules set
    work_start = coalesce((p ->> 'work_start')::time, work_start),
    shift_end = coalesce((p ->> 'shift_end')::time, shift_end),
    grace_minutes = coalesce((p ->> 'grace_minutes')::int, grace_minutes),
    weekly_off = v_off,
    late_from = coalesce(p ->> 'late_from', late_from),
    cut_late = coalesce((p ->> 'cut_late')::boolean, cut_late),
    early_cut = coalesce((p ->> 'early_cut')::boolean, early_cut),
    absent_cut = coalesce((p ->> 'absent_cut')::boolean, absent_cut),
    overtime_on = coalesce((p ->> 'overtime_on')::boolean, overtime_on),
    overtime_mult = coalesce((p ->> 'overtime_mult')::numeric, overtime_mult),
    overtime_min = coalesce((p ->> 'overtime_min')::int, overtime_min),
    pay_day = case when p ? 'pay_day' then nullif(p ->> 'pay_day', '')::int else pay_day end,
    remind_days = coalesce((p ->> 'remind_days')::int, remind_days),
    require_location = coalesce((p ->> 'require_location')::boolean, require_location),
    radius_m = coalesce((p ->> 'radius_m')::int, radius_m),
    updated_at = now()
  where id = 1;
  select * into r from public.attendance_rules where id = 1;
  if r.shift_end <= r.work_start then raise exception 'Chhutti ka waqt shuru ke waqt se baad ka hona chahiye'; end if;
  if r.late_from not in ('shift_start', 'after_grace') then raise exception 'Late ginne ka tareeqa ghalat hai'; end if;
  if r.grace_minutes < 0 or r.grace_minutes > 240 then raise exception 'Mohlat 0 se 240 minute'; end if;
end $$;


--
-- Name: attendance_summary(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_summary(p_period text) RETURNS TABLE(staff_id uuid, full_name text, monthly_salary numeric, present integer, half integer, absent integer, leave integer, late integer, suggested numeric, applied boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare v_from date; v_to date; v_days int; r public.attendance_rules%rowtype;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin dekh sakta hai'; end if;
  if p_period is null or p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Mahina YYYY-MM likhein'; end if;
  v_from := (p_period || '-01')::date; v_to := (v_from + interval '1 month')::date; v_days := v_to - v_from;
  select * into r from public.attendance_rules where id = 1;
  return query
  with a as (
    select s.id sid, s.full_name fn, s.monthly_salary sal,
      count(*) filter (where x.status = 'present')::int pr,
      count(*) filter (where x.status = 'half')::int hf,
      count(*) filter (where x.status = 'absent')::int ab,
      count(*) filter (where x.status = 'leave')::int lv,
      count(*) filter (where x.status = 'present' and x.check_in is not null
                         and x.check_in > r.work_start + make_interval(mins => r.grace_minutes))::int lt
      from public.staff_members s
      left join public.staff_attendance x on x.staff_id = s.id and x.att_date >= v_from and x.att_date < v_to
     where s.is_active group by s.id, s.full_name, s.monthly_salary)
  select a.sid, a.fn, a.sal, a.pr, a.hf, a.ab, a.lv, a.lt,
         round(case when r.absent_cut then (a.ab + 0.5 * a.hf) * a.sal / v_days else 0 end + a.lt * r.late_cut, 0),
         exists (select 1 from public.staff_ledger l where l.idempotency_key = 'att:' || a.sid || ':' || p_period)
    from a order by a.fn;
end $_$;


--
-- Name: audit_log_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_log_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'audit_log mein tabdeeli ya delete allowed nahi hai';
end;
$$;



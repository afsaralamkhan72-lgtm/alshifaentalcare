SET check_function_bodies = false;
SET search_path = public, extensions;
-- ===== PART B: SCHEMA (tables, functions, triggers, RLS) =====
--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET check_function_bodies = false;
SET search_path = public, extensions;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: _att_days(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._att_days(p_period text, p_staff uuid DEFAULT NULL::uuid) RETURNS TABLE(staff_id uuid, d date, open_day boolean, track boolean, in_range boolean, status text, leave_paid boolean, check_in time without time zone, check_out time without time zone, shift_s time without time zone, shift_e time without time zone, shift_min integer, late_min integer, early_min integer, absent_min integer, ot_min integer, unmarked boolean, missing_out boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
#variable_conflict use_column
declare
  v_from date := (p_period || '-01')::date;
  v_to date := ((p_period || '-01')::date + interval '1 month')::date;
  r public.attendance_rules%rowtype;
  v_today date := public._att_today();
begin
  select * into r from public.attendance_rules where id = 1;
  return query
  with st as (
    select s.id sid, s.attendance_on trk,
           coalesce(s.shift_start, r.work_start) ss, coalesce(s.shift_end, r.shift_end) se,
           coalesce(s.weekly_off, r.weekly_off) wo,
           greatest(v_from, coalesce(s.joined_on, v_from)) ef
      from public.staff_members s
     where s.is_active and (p_staff is null or s.id = p_staff)
  ), lv as (
    select a.staff_id sid, a.att_date ad,
           (coalesce(t.paid, true) and (t.id is null or t.yearly_quota is null
              or row_number() over (partition by a.staff_id, a.leave_type_id order by a.att_date) <= t.yearly_quota)) paid
      from public.staff_attendance a
      join public.staff_members sm on sm.id = a.staff_id
      left join public.leave_types t on t.id = a.leave_type_id
     where a.status = 'leave' and a.att_date >= date_trunc('year', v_from)::date and a.att_date < v_to
       and public._clinic_open(a.att_date, sm.weekly_off)
  ), base as (
    select st.sid, g::date dd, st.trk, st.ss, st.se, st.ef,
           public._clinic_open(g::date, st.wo) opn
      from st cross join generate_series(v_from::timestamp, (v_to - 1)::timestamp, interval '1 day') g
  ), j as (
    select b.*, a.status stt, a.check_in ci, a.check_out co, l.paid lpaid,
           greatest(floor(extract(epoch from (b.se - b.ss)) / 60), 0)::int smin
      from base b
      left join public.staff_attendance a on a.staff_id = b.sid and a.att_date = b.dd and b.trk
      left join lv l on l.sid = b.sid and l.ad = b.dd
  )
  select j.sid, j.dd, j.opn, j.trk, (j.dd >= j.ef), j.stt, j.lpaid, j.ci, j.co, j.ss, j.se, j.smin,
    (case when j.trk and j.opn and j.dd >= j.ef and j.dd <= v_today and j.stt = 'present' and j.ci is not null and r.cut_late
               and j.ci > j.ss + make_interval(mins => r.grace_minutes)
          then floor(extract(epoch from (j.ci - case when r.late_from = 'after_grace'
                                                     then j.ss + make_interval(mins => r.grace_minutes) else j.ss end)) / 60)::int
          else 0 end),
    (case when j.trk and j.opn and j.dd >= j.ef and j.dd <= v_today and j.stt = 'present' and r.early_cut
               and j.ci is not null and j.co is not null and j.co > j.ci and j.co < j.se
          then floor(extract(epoch from (j.se - j.co)) / 60)::int else 0 end),
    (case when not (j.trk and j.opn and j.dd >= j.ef and j.dd <= v_today) then 0
          when j.stt = 'absent' and r.absent_cut then j.smin
          when j.stt = 'leave' and not coalesce(j.lpaid, true) then j.smin
          when j.stt = 'half' and r.absent_cut then j.smin / 2
          else 0 end),
    (case when not (j.trk and r.overtime_on and j.dd >= j.ef and j.dd <= v_today and j.stt = 'present' and j.ci is not null and j.co is not null) then 0
          when j.opn then (case when j.co > j.se + make_interval(mins => r.overtime_min)
                                then floor(extract(epoch from (j.co - j.se)) / 60)::int else 0 end)
          else (case when j.co > j.ci then floor(extract(epoch from (j.co - j.ci)) / 60)::int else 0 end) end),
    (j.trk and j.opn and j.dd >= j.ef and j.dd < v_today and j.stt is null),
    (j.trk and j.dd >= j.ef and j.dd < v_today and j.stt = 'present' and j.ci is not null and j.co is null)
  from j
  order by j.sid, j.dd;
end $$;


--
-- Name: _att_lock_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._att_lock_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare v_staff uuid := coalesce(new.staff_id, old.staff_id); v_date date := coalesce(new.att_date, old.att_date);
begin
  if exists (select 1 from public.payroll_periods p where p.staff_id = v_staff and p.period = to_char(v_date, 'YYYY-MM')) then
    raise exception 'Ye mahina tayyar (lock) ho chuka hai. Ghalti ho to Salary page par wajah ke saath bonus ya katauti likhein';
  end if;
  return coalesce(new, old);
end $$;


--
-- Name: _att_request(uuid, text, date, time without time zone, text, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._att_request(p_staff uuid, p_kind text, p_date date, p_time time without time zone, p_reason text, p_lat numeric, p_lng numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_ts timestamp := (now() at time zone 'Asia/Karachi'); v_d date := coalesce(p_date, v_ts::date);
  v_t time := coalesce(p_time, date_trunc('second', v_ts)::time); s public.staff_members%rowtype; v_id uuid;
begin
  select * into s from public.staff_members where id = p_staff;
  if not found or not s.is_active or not s.attendance_on then
    return jsonb_build_object('ok', false, 'message', 'Aap ki hazri software mein nahi lagti.');
  end if;
  if p_kind not in ('in', 'out') then return jsonb_build_object('ok', false, 'message', 'Qism ghalat hai.'); end if;
  if btrim(coalesce(p_reason, '')) = '' or length(btrim(p_reason)) < 3 then
    return jsonb_build_object('ok', false, 'message', 'Wajah likhna zaroori hai.');
  end if;
  if v_d > v_ts::date or v_d < v_ts::date - 31 then
    return jsonb_build_object('ok', false, 'message', 'Tareekh ghalat hai (pichhle 31 din tak).');
  end if;
  if v_d = v_ts::date and v_t > date_trunc('second', v_ts)::time then
    return jsonb_build_object('ok', false, 'message', 'Aane wala waqt nahi likh sakte.');
  end if;
  if exists (select 1 from public.payroll_periods where staff_id = p_staff and period = to_char(v_d, 'YYYY-MM')) then
    return jsonb_build_object('ok', false, 'message', 'Ye mahina tayyar ho chuka hai.');
  end if;
  if exists (select 1 from public.attendance_requests where staff_id = p_staff and att_date = v_d and kind = p_kind and status = 'pending') then
    return jsonb_build_object('ok', false, 'message', 'Is ki darkhwast pehle se bheji hui hai.');
  end if;
  insert into public.attendance_requests(staff_id, att_date, kind, req_time, reason, lat, lng)
  values (p_staff, v_d, p_kind, v_t, btrim(p_reason), p_lat, p_lng) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'message', 'Darkhwast doctor sahab ko bhej di gayi. Mangoor hone par hazri lag jayegi.');
end $$;


--
-- Name: _att_state(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._att_state(p_staff uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare r public.attendance_rules%rowtype; s public.staff_members%rowtype; a public.staff_attendance%rowtype; v_d date := public._att_today();
begin
  select * into r from public.attendance_rules where id = 1;
  select * into s from public.staff_members where id = p_staff;
  if not found then return jsonb_build_object('linked', false); end if;
  select * into a from public.staff_attendance where staff_id = p_staff and att_date = v_d;
  return jsonb_build_object('linked', true, 'staff_id', s.id, 'name', s.full_name, 'tracked', s.attendance_on and s.is_active,
    'status', a.status, 'check_in', case when a.check_in is not null then public._tt(a.check_in) end,
    'check_out', case when a.check_out is not null then public._tt(a.check_out) end,
    'shift', public._tt(coalesce(s.shift_start, r.work_start)) || ' - ' || public._tt(coalesce(s.shift_end, r.shift_end)),
    'open_day', public._clinic_open(v_d, coalesce(s.weekly_off, r.weekly_off)),
    'require_location', r.require_location);
end $$;


--
-- Name: _att_today(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._att_today() RETURNS date
    LANGUAGE sql STABLE
    AS $$ select (now() at time zone 'Asia/Karachi')::date $$;


--
-- Name: _begin_treatment(uuid, numeric, numeric, text, text, text, date, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._begin_treatment(p_t uuid, p_price numeric, p_paid numeric, p_method text, p_doctor text, p_notes text, p_next_visit date, p_next_time text, p_chart_condition text, p_key text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  t public.patient_treatments%rowtype; v_inv uuid; v_v uuid; v_label text; v_tooth text; v_today date := public._karachi_today();
  v_price numeric(12,2) := round(coalesce(p_price,0),2); v_paid numeric(12,2) := round(coalesce(p_paid,0),2);
begin
  select * into t from public.patient_treatments where id = p_t;
  select string_agg(public.tooth_label(x), ', ' order by x) into v_label from unnest(t.teeth) x;
  if v_price > 0 then
    v_inv := public.create_invoice(
      t.patient_id,
      jsonb_build_array(jsonb_build_object('treatment_id', t.catalog_id, 'name', t.name, 'tooth', v_label, 'qty', 1, 'unit_price', v_price)),
      0, v_paid, coalesce(p_method, 'cash'), coalesce(nullif(btrim(coalesce(p_doctor,'')),''), t.doctor),
      case when v_price - v_paid > 0 then v_today + 7 end,
      case when t.list_price > v_price then 'Price list: Rs. ' || t.list_price || ', discount: Rs. ' || (t.list_price - v_price) end,
      case when p_key is null then null else p_key || ':inv' end);
    update public.invoices set patient_treatment_id = t.id where id = v_inv;
  end if;

  insert into public.visit_notes (patient_id, treatment_id, visit_no, visit_date, procedure, notes, next_visit, doctor_id)
  values (t.patient_id, t.id, 1, v_today, t.name, nullif(btrim(coalesce(p_notes,'')),''), p_next_visit, auth.uid())
  returning id into v_v;

  if p_chart_condition is not null and btrim(p_chart_condition) <> '' then
    foreach v_tooth in array t.teeth loop
      insert into public.dental_chart (patient_id, tooth_number, condition, notes, treatment_date, recorded_by, treatment_id)
      values (t.patient_id, v_tooth, p_chart_condition, t.name, v_today, auth.uid(), t.id);
    end loop;
  end if;

  perform public._treatment_appointment(t.patient_id, t.id, t.name, p_next_visit, p_next_time, v_v,
                                        coalesce(nullif(btrim(coalesce(p_doctor,'')),''), t.doctor));
  return v_v;
end $$;


--
-- Name: _clinic_open(date, integer[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._clinic_open(p_day date, p_off integer[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select coalesce(
    (select not c.closed from public.clinic_days c where c.day = p_day),
    not (extract(dow from p_day)::int = any(coalesce(p_off, (select weekly_off from public.attendance_rules where id = 1), '{0}'::int[]))))
$$;


--
-- Name: _cv_finish_close_appt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._cv_finish_close_appt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.status = 'finished' and (tg_op = 'INSERT' or old.status is distinct from 'finished') then
    update public.appointments a
       set status = 'completed'
     where a.deleted_at is null
       and a.preferred_date = new.visit_date
       and a.status in ('pending','confirmed','arrived')
       and a.id is distinct from new.appointment_id
       and (a.patient_id = new.patient_id
            or (a.patient_id is null
                and right(regexp_replace(a.phone, '[^0-9]', '', 'g'), 10) =
                    (select right(regexp_replace(p.phone, '[^0-9]', '', 'g'), 10) from public.patients p where p.id = new.patient_id)));
  end if;
  return new;
end $$;


--
-- Name: _disc_pct(numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._disc_pct(p_base numeric, p_final numeric) RETURNS numeric
    LANGUAGE sql IMMUTABLE
    AS $$
  select case when coalesce(p_base,0) <= 0 then 0 else round((p_base - coalesce(p_final,0)) * 100 / p_base, 4) end
$$;


--
-- Name: _geo_m(numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._geo_m(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select round(2 * 6371000 * asin(sqrt(least(1,
    power(sin(radians((lat2 - lat1)::float8) / 2), 2) +
    cos(radians(lat1::float8)) * cos(radians(lat2::float8)) * power(sin(radians((lng2 - lng1)::float8) / 2), 2)))))::int
$$;


--
-- Name: _inv_audit(text, uuid, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._inv_audit(p_action text, p_id uuid, p_old jsonb, p_new jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_name text; v_role text;
begin
  select full_name, role into v_name, v_role from public.staff_profiles where id = auth.uid();
  insert into public.audit_log (actor_id, actor_name, actor_role, action, table_name, record_id, old_data, new_data)
  values (auth.uid(), v_name, v_role, p_action, 'inventory', p_id::text, p_old, p_new);
end $$;


--
-- Name: _inv_has_history(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._inv_has_history(p_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.inventory_movements where inventory_id = p_id)
      or exists (select 1 from public.stock_counts where inventory_id = p_id)
      or exists (select 1 from public.treatment_materials where inventory_id = p_id)
      or exists (select 1 from public.inventory where merged_into = p_id)
      or coalesce((select quantity <> 0 or merged_into is not null from public.inventory where id = p_id), false)
$$;


--
-- Name: _karachi_today(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._karachi_today() RETURNS date
    LANGUAGE sql STABLE
    AS $$ select (now() at time zone 'Asia/Karachi')::date $$;


--
-- Name: _log_invoice_discount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._log_invoice_discount() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare s record;
begin
  if coalesce(new.discount_amount,0) > 0 then
    select full_name, role into s from public.staff_profiles where id = auth.uid();
    insert into public.discount_log(kind, patient_id, invoice_id, base_amount, discount_amount, percent, given_by, given_by_name, given_by_role)
    values ('bill', new.patient_id, new.id, new.total + new.discount_amount, new.discount_amount,
            coalesce(new.discount_percent, public._disc_pct(new.total + new.discount_amount, new.total)), auth.uid(), s.full_name, s.role);
  end if;
  return new;
end $$;


--
-- Name: _log_treatment_discount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._log_treatment_discount() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare s record;
begin
  if new.list_price > 0 and new.price < new.list_price and new.status <> 'cancelled'
     and (tg_op = 'INSERT' or new.price is distinct from old.price) then
    select full_name, role into s from public.staff_profiles where id = auth.uid();
    insert into public.discount_log(kind, patient_id, patient_treatment_id, base_amount, discount_amount, percent, given_by, given_by_name, given_by_role)
    values ('treatment', new.patient_id, new.id, new.list_price, new.list_price - new.price,
            public._disc_pct(new.list_price, new.price), auth.uid(), s.full_name, s.role);
  end if;
  return new;
end $$;


--
-- Name: _loyalty_award(uuid, text, uuid, text, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._loyalty_award(p_patient uuid, p_source text, p_by uuid, p_note text, p_date date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  prog   public.loyalty_program%rowtype;
  v_date date := coalesce(p_date, public._karachi_today());
  v_cycle int; v_pos int; r record; v_n int;
begin
  select * into prog from public.loyalty_program where id = 1;
  if not found or not prog.is_active then return jsonb_build_object('status', 'inactive'); end if;
  if not exists (select 1 from public.patients where id = p_patient and deleted_at is null) then
    return jsonb_build_object('status', 'no_patient');
  end if;
  if p_source = 'qr' and not public._loyalty_has_visit(p_patient, v_date) then
    return jsonb_build_object('status', 'no_visit');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('loyalty:' || p_patient::text, 0));

  if exists (select 1 from public.loyalty_stamps where patient_id = p_patient and stamp_date = v_date and voided_at is null) then
    return jsonb_build_object('status', 'already');
  end if;

  select coalesce(max(cycle), 1) into v_cycle from public.loyalty_stamps where patient_id = p_patient;
  select count(*) + 1 into v_pos from public.loyalty_stamps where patient_id = p_patient and cycle = v_cycle and voided_at is null;
  if prog.reset_after is not null and v_pos > prog.reset_after then
    v_cycle := v_cycle + 1;
    v_pos := 1;
  end if;

  insert into public.loyalty_stamps (patient_id, stamp_date, cycle, position, source, note, created_by)
  values (p_patient, v_date, v_cycle, v_pos, p_source, nullif(btrim(coalesce(p_note, '')), ''), p_by);

  for r in select * from public.loyalty_rewards where is_active and stamps_required = v_pos loop
    select count(*) into v_n from public.loyalty_unlocks where patient_id = p_patient and reward_id = r.id;
    if r.max_per_patient is null or v_n < r.max_per_patient then
      insert into public.loyalty_unlocks (patient_id, reward_id, cycle, title, kind, value, treatment_names, expires_at)
      values (p_patient, r.id, v_cycle, r.title, r.kind, r.value, r.treatment_names,
              case when r.valid_days is null then null else now() + make_interval(days => r.valid_days) end)
      on conflict (patient_id, reward_id, cycle) do nothing;
    end if;
  end loop;

  return jsonb_build_object('status', 'awarded', 'position', v_pos, 'cycle', v_cycle);
end $$;



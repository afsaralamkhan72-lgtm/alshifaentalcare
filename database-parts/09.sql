SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: link_to_clinical_visit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_to_clinical_visit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.clinical_visit_id is null then
    select id into new.clinical_visit_id from public.clinical_visits
     where patient_id = new.patient_id and visit_date = public._karachi_today()
     order by (status = 'draft') desc, created_at desc limit 1;
  end if;
  return new;
end $$;


--
-- Name: log_appointment_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_appointment_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_name text;
begin
  if auth.uid() is not null then
    select full_name into v_name from public.staff_profiles where id = auth.uid();
  end if;
  if tg_op = 'UPDATE' then
    if new.preferred_date is distinct from old.preferred_date or new.preferred_time is distinct from old.preferred_time then
      insert into public.appointment_history (appointment_id, action, old_date, old_time, new_date, new_time, old_status, new_status, changed_by, changed_by_name)
      values (new.id, 'rescheduled', old.preferred_date, old.preferred_time, new.preferred_date, new.preferred_time, old.status, new.status, auth.uid(), v_name);
    elsif new.status is distinct from old.status then
      insert into public.appointment_history (appointment_id, action, old_date, old_time, new_date, new_time, old_status, new_status, changed_by, changed_by_name)
      values (new.id, 'status', old.preferred_date, old.preferred_time, new.preferred_date, new.preferred_time, old.status, new.status, auth.uid(), v_name);
    end if;
  end if;
  return new;
end $$;


--
-- Name: log_price_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_price_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_name text;
begin
  if TG_OP = 'UPDATE' and new.price is not distinct from old.price then
    new.updated_at := now();
    return new;
  end if;
  select full_name into v_name from public.staff_profiles where id = auth.uid();
  insert into public.treatment_price_history (treatment_id, old_price, new_price, changed_by, changed_by_name)
  values (new.id, case when TG_OP = 'UPDATE' then old.price end, new.price, auth.uid(), v_name);
  new.updated_at := now();
  return new;
end;
$$;


--
-- Name: log_price_change_upd(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_price_change_upd() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_name text;
begin
  new.updated_at := now();
  if new.price is distinct from old.price then
    select full_name into v_name from public.staff_profiles where id = auth.uid();
    insert into public.treatment_price_history (treatment_id, old_price, new_price, changed_by, changed_by_name)
    values (new.id, old.price, new.price, auth.uid(), v_name);
  end if;
  return new;
end;
$$;


--
-- Name: loyalty_device_lookup(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.loyalty_device_lookup(p_hash text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v uuid;
begin
  update public.loyalty_devices set last_seen_at = now() where token_hash = p_hash returning patient_id into v;
  return v;
end $$;


--
-- Name: loyalty_device_save(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.loyalty_device_save(p_hash text, p_patient uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  insert into public.loyalty_devices (token_hash, patient_id) values (p_hash, p_patient)
  on conflict (token_hash) do update set patient_id = excluded.patient_id, last_seen_at = now();
$$;


--
-- Name: loyalty_dismiss_signup(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.loyalty_dismiss_signup(p_signup uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not (public.is_owner() or public.has_perm('patients.edit')) then raise exception 'Is ki permission nahi'; end if;
  update public.loyalty_signups set status = 'dismissed', handled_by = auth.uid(), handled_at = now() where id = p_signup and status = 'pending';
end $$;


--
-- Name: loyalty_find_patients(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.loyalty_find_patients(p_phone text) RETURNS TABLE(id uuid, full_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select p.id, p.full_name from public.patients p
   where p.deleted_at is null and length(public._loyalty_digits(p_phone)) = 10
     and (public._loyalty_digits(p.phone) = public._loyalty_digits(p_phone) or public._loyalty_digits(p.phone2) = public._loyalty_digits(p_phone))
   limit 10;
$$;


--
-- Name: loyalty_link_signup(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.loyalty_link_signup(p_signup uuid, p_patient uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not (public.is_owner() or public.has_perm('patients.edit')) then raise exception 'Is ki permission nahi'; end if;
  if not exists (select 1 from public.patients where id = p_patient and deleted_at is null) then raise exception 'Patient nahi mila'; end if;
  update public.loyalty_signups set status = 'linked', patient_id = p_patient, handled_by = auth.uid(), handled_at = now() where id = p_signup and status = 'pending';
  if not found then raise exception 'Ye sign-up pehle hi nibta diya gaya hai'; end if;
end $$;


--
-- Name: loyalty_manual_stamp(uuid, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.loyalty_manual_stamp(p_patient uuid, p_date date DEFAULT NULL::date, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare prog public.loyalty_program%rowtype;
begin
  if not public.is_owner() then raise exception 'Haath se stamp sirf doctor / admin laga sakta hai'; end if;
  select * into prog from public.loyalty_program where id = 1;
  if not prog.allow_manual then raise exception 'Haath se stamp Settings mein band hai'; end if;
  if nullif(btrim(coalesce(p_note, '')), '') is null then raise exception 'Wajah likhna zaroori hai'; end if;
  return public._loyalty_award(p_patient, 'manual', auth.uid(), p_note, p_date);
end $$;


--
-- Name: loyalty_rate_ok(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.loyalty_rate_ok(p_key text, p_max integer, p_minutes integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_n int;
begin
  delete from public.loyalty_scan_log where created_at < now() - interval '2 days';
  select count(*) into v_n from public.loyalty_scan_log where key = p_key and created_at > now() - make_interval(mins => p_minutes);
  if v_n >= p_max then return false; end if;
  insert into public.loyalty_scan_log (key) values (p_key);
  return true;
end $$;


--
-- Name: loyalty_redeem(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.loyalty_redeem(p_unlock uuid, p_note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare u public.loyalty_unlocks%rowtype;
begin
  if not (public.is_owner() or public.has_perm('patients.edit')) then raise exception 'Aap ko inaam dene ki permission nahi'; end if;
  select * into u from public.loyalty_unlocks where id = p_unlock for update;
  if not found then raise exception 'Inaam nahi mila'; end if;
  if u.redeemed_at is not null then raise exception 'Ye inaam pehle hi diya ja chuka hai'; end if;
  if u.expires_at is not null and u.expires_at <= now() then raise exception 'Is inaam ki mudat khatam ho chuki hai'; end if;
  update public.loyalty_unlocks set redeemed_at = now(), redeemed_by = auth.uid(), redeem_note = nullif(btrim(coalesce(p_note, '')), '') where id = p_unlock;
end $$;


--
-- Name: loyalty_signup(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.loyalty_signup(p_name text, p_phone text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if length(public._loyalty_digits(p_phone)) <> 10 then raise exception 'Phone number ghalat hai'; end if;
  insert into public.loyalty_signups (full_name, phone, phone_digits) values (btrim(p_name), btrim(p_phone), public._loyalty_digits(p_phone))
  on conflict (phone_digits) where status = 'pending' do nothing;
end $$;


--
-- Name: loyalty_void_stamp(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.loyalty_void_stamp(p_stamp uuid, p_reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_owner() then raise exception 'Stamp sirf doctor / admin hata sakta hai'; end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception 'Wajah likhna zaroori hai'; end if;
  update public.loyalty_stamps set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
   where id = p_stamp and voided_at is null;
  if not found then raise exception 'Stamp nahi mila ya pehle hi hata diya gaya'; end if;
end $$;


--
-- Name: merge_inventory_items(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.merge_inventory_items(p_keep uuid, p_remove uuid, p_note text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare k public.inventory%rowtype; r public.inventory%rowtype; v_uid uuid := auth.uid(); v_name text; v_moved int; v_dup int;
begin
  if not public.is_owner() then raise exception 'Sirf owner items merge kar sakta hai'; end if;
  if p_keep = p_remove then raise exception 'Do alag item chunein'; end if;
  select * into k from public.inventory where id = least(p_keep, p_remove) for update;
  select * into r from public.inventory where id = greatest(p_keep, p_remove) for update;
  select * into k from public.inventory where id = p_keep;
  select * into r from public.inventory where id = p_remove;
  if k.id is null or r.id is null or k.deleted_at is not null or r.deleted_at is not null or k.merged_into is not null or r.merged_into is not null then raise exception 'Item nahi mila ya pehle se merge ho chuka hai'; end if;
  if k.category <> r.category then raise exception 'Sirf aik hi category ke items merge ho sakte hain'; end if;
  if coalesce(k.unit, '') <> coalesce(r.unit, '') then raise exception 'Dono items ki unit aik jaisi honi chahiye (% aur %)', coalesce(k.unit, '-'), coalesce(r.unit, '-'); end if;
  select full_name into v_name from public.staff_profiles where id = v_uid;
  perform set_config('app.stock_fn', 'on', true);
  if r.quantity <> 0 then
    insert into public.inventory_movements (inventory_id, kind, qty_change, qty_after, note, created_by, created_by_name)
    values (r.id, 'merge_out', -r.quantity, 0, 'Merge: ' || k.item_name || coalesce(' · ' || nullif(btrim(coalesce(p_note, '')), ''), ''), v_uid, v_name);
    insert into public.inventory_movements (inventory_id, kind, qty_change, qty_after, note, created_by, created_by_name)
    values (k.id, 'merge_in', r.quantity, k.quantity + r.quantity, 'Merge: ' || r.item_name || coalesce(' · ' || nullif(btrim(coalesce(p_note, '')), ''), ''), v_uid, v_name);
  end if;
  update public.inventory set quantity = k.quantity + r.quantity, last_updated = now(),
    expiry_date = coalesce(least(k.expiry_date, r.expiry_date), k.expiry_date, r.expiry_date),
    supplier = coalesce(k.supplier, r.supplier), description = coalesce(k.description, r.description) where id = k.id;
  update public.inventory set quantity = 0, is_active = false, merged_into = k.id, last_updated = now() where id = r.id;
  perform set_config('app.stock_fn', 'off', true);
  update public.treatment_materials tm set inventory_id = k.id where tm.inventory_id = r.id
    and not exists (select 1 from public.treatment_materials t2 where t2.treatment_id = tm.treatment_id and t2.inventory_id = k.id);
  get diagnostics v_moved = row_count;
  delete from public.treatment_materials where inventory_id = r.id;
  get diagnostics v_dup = row_count;
  insert into public.inventory_meta (inventory_id, company, pack_name, units_per_pack, is_qualitative)
    select k.id, m.company, m.pack_name, m.units_per_pack, m.is_qualitative from public.inventory_meta m
     where m.inventory_id = r.id and not exists (select 1 from public.inventory_meta x where x.inventory_id = k.id);
  perform public._inv_audit('MERGE', r.id, to_jsonb(r), jsonb_build_object('merged_into', k.id, 'kept_name', k.item_name, 'moved_qty', r.quantity, 'recipes_moved', v_moved, 'recipes_dropped_as_duplicate', v_dup));
  return k.id;
end $$;


--
-- Name: my_attendance_clock(text, numeric, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_attendance_clock(p_action text, p_lat numeric DEFAULT NULL::numeric, p_lng numeric DEFAULT NULL::numeric, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_staff uuid;
begin
  select id into v_staff from public.staff_members where profile_id = auth.uid() and is_active;
  if v_staff is null then
    return jsonb_build_object('ok', false, 'code', 'NOLINK', 'message', 'Aap ka login staff record se juda nahi. Doctor sahab se kahein.');
  end if;
  return public._staff_clock(v_staff, p_action, p_lat, p_lng, p_reason, 'self', auth.uid());
end $$;


--
-- Name: my_attendance_request(text, text, date, time without time zone, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_attendance_request(p_kind text, p_reason text, p_date date DEFAULT NULL::date, p_time time without time zone DEFAULT NULL::time without time zone, p_lat numeric DEFAULT NULL::numeric, p_lng numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_staff uuid;
begin
  select id into v_staff from public.staff_members where profile_id = auth.uid() and is_active;
  if v_staff is null then return jsonb_build_object('ok', false, 'message', 'Aap ka login staff record se juda nahi.'); end if;
  return public._att_request(v_staff, p_kind, p_date, p_time, p_reason, p_lat, p_lng);
end $$;


--
-- Name: my_attendance_state(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_attendance_state() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_staff uuid;
begin
  select id into v_staff from public.staff_members where profile_id = auth.uid() and is_active;
  if v_staff is null then return jsonb_build_object('linked', false); end if;
  return public._att_state(v_staff);
end $$;


--
-- Name: my_discount_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_discount_limit() RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(
    (select case when s.is_active then
        coalesce((select l.max_percent from public.discount_limits l where l.role = s.role),
                 case when s.role in ('admin','doctor') then 100 else 0 end)
      else 0 end
       from public.staff_profiles s where s.id = auth.uid()), 0)
$$;


--
-- Name: my_permissions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_permissions() RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(array_agg(c.code order by c.sort_order), '{}')
    from public.permission_catalog c
   where public.has_perm(c.code);
$$;


--
-- Name: my_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_staff() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case when s.id is null then null else jsonb_build_object(
           'id', s.id, 'full_name', s.full_name, 'role', s.role, 'phone', s.phone, 'is_active', s.is_active,
           'perms', case when s.is_active then public.my_permissions() else '{}'::text[] end)
         end
    from (select 1) one
    left join public.staff_profiles s on s.id = auth.uid();
$$;



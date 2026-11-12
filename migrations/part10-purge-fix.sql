create or replace function public.purge_patient(p_id uuid, p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.patients%rowtype;
  v_inv uuid[]; v_vis int; v_pay int; v_tx int; v_invn int;
  v_paths jsonb;
begin
  if auth.uid() is null or not public.is_owner() then
    raise exception 'Ye kaam sirf doctor/admin kar sakta hai';
  end if;
  select * into v_p from public.patients where id = p_id for update;
  if not found then raise exception 'Patient nahi mila'; end if;
  if v_p.deleted_at is null then
    raise exception 'Pehle patient ko Delete karein (Recycle Bin mein aane dein), phir wahan se hamesha ke liye hatayein';
  end if;
  if upper(btrim(coalesce(p_confirm, ''))) <> 'DELETE' then
    raise exception 'Tasdeeq ke liye DELETE likhein';
  end if;

  perform set_config('app.purge_patient', p_id::text, true);

  select coalesce(jsonb_agg(storage_path), '[]'::jsonb) into v_paths from public.patient_photos where patient_id = p_id and storage_path is not null;
  select coalesce(array_agg(id), '{}') into v_inv from public.invoices where patient_id = p_id;
  select count(*) into v_vis from public.clinical_visits where patient_id = p_id;
  select count(*) into v_pay from public.payments where patient_id = p_id;
  v_invn := coalesce(array_length(v_inv, 1), 0);

  delete from public.discount_log where patient_id = p_id;
  delete from public.transactions where patient_id = p_id or invoice_id = any(v_inv);
  get diagnostics v_tx = row_count;
  delete from public.payments where patient_id = p_id;
  update public.inventory_movements set patient_id = null, invoice_id = null where patient_id = p_id or invoice_id = any(v_inv);

  update public.clinical_visits set appointment_id = null where patient_id = p_id;
  if to_regclass('public.appointment_history') is not null then
    execute 'delete from public.appointment_history where appointment_id in (select id from public.appointments where patient_id = $1 or visit_id in (select id from public.visit_notes where patient_id = $1))' using p_id;
  end if;
  delete from public.appointments where patient_id = p_id or visit_id in (select id from public.visit_notes where patient_id = p_id);
  delete from public.patient_photos where patient_id = p_id;
  delete from public.prescriptions where patient_id = p_id;
  delete from public.visit_notes where patient_id = p_id;
  delete from public.dental_chart where patient_id = p_id;
  delete from public.treatment_stages where patient_id = p_id;
  delete from public.lab_cases where patient_id = p_id;
  delete from public.payment_plans where patient_id = p_id;
  update public.clinical_visits set invoice_id = null, next_treatment_id = null where patient_id = p_id;
  delete from public.invoice_items where invoice_id = any(v_inv);
  delete from public.invoices where patient_id = p_id;
  delete from public.patient_treatments where patient_id = p_id;
  delete from public.clinical_visits where patient_id = p_id;
  delete from public.treatment_plans where patient_id = p_id;
  delete from public.treatment_episodes where patient_id = p_id;
  delete from public.recalls where patient_id = p_id;
  delete from public.patient_history where patient_id = p_id;
  delete from public.loyalty_stamps where patient_id = p_id;
  delete from public.loyalty_unlocks where patient_id = p_id;
  delete from public.loyalty_devices where patient_id = p_id;
  delete from public.loyalty_signups where patient_id = p_id;
  delete from public.share_links where patient_id = p_id;
  delete from public.scratch_cards where patient_id = p_id;
  delete from public.device_tokens where patient_id = p_id;
  delete from public.notify_log where patient_id = p_id;
  update public.patients set family_of = null where family_of = p_id;

  insert into public.audit_log (actor_id, actor_name, actor_role, action, table_name, record_id, old_data, new_data)
  select auth.uid(), s.full_name, s.role, 'PATIENT_PURGE', 'patients', p_id::text,
         jsonb_build_object('mr_number', v_p.mr_number, 'full_name', v_p.full_name),
         jsonb_build_object('visits', v_vis, 'invoices', v_invn, 'payments', v_pay, 'transactions', v_tx)
  from (select 1) x left join public.staff_profiles s on s.id = auth.uid();

  delete from public.patients where id = p_id;

  return jsonb_build_object('visits', v_vis, 'invoices', v_invn, 'payments', v_pay, 'transactions', v_tx, 'photo_paths', v_paths);
end $$;

revoke all on function public.purge_patient(uuid, text) from public;
grant execute on function public.purge_patient(uuid, text) to authenticated;

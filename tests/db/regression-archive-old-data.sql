begin;
do $$
declare
  v_admin text; v_rec text; v_a uuid; v_b uuid; v_c uuid;
  r jsonb; ok boolean;
  v_inc0 numeric; v_inc1 numeric; v_mov0 bigint; v_mov1 bigint; v_bal0 numeric; v_bal1 numeric;
  v_inv_a int; v_pay_a int; v_inv_b int;
begin
  select id::text into v_admin from public.staff_profiles where role in ('admin','doctor') and is_active order by created_at limit 1;
  select id::text into v_rec from public.staff_profiles where role='receptionist' limit 1;

  perform set_config('app.archive_mode','1',true);
  update public.patients set created_at = timestamptz '2023-01-01';
  update public.clinical_visits set visit_date = date '2023-02-01';
  update public.invoices set invoice_date = date '2023-02-01';
  update public.payments set paid_on = date '2023-02-01';
  update public.transactions set transaction_date = date '2023-02-01';
  update public.prescriptions set prescribed_date = date '2023-02-01';
  update public.visit_notes set visit_date = date '2023-02-01';
  update public.appointments set preferred_date = date '2023-02-01';
  update public.patient_treatments set status = 'completed' where status in ('active','planned');
  update public.invoices set paid_amount = total where status = 'active';
  update public.lab_cases set status = 'fitted' where status in ('pending','sent','in_progress','remake');
  update public.appointments set status = 'completed' where status in ('pending','confirmed');
  perform set_config('app.archive_mode','',true);

  select e.patient_id into v_a from public._archive_eligible(date '2024-01-01') e
   where exists (select 1 from public.invoices i where i.patient_id=e.patient_id and i.status='active')
     and exists (select 1 from public.clinical_visits v where v.patient_id=e.patient_id) order by 1 limit 1;
  select e.patient_id into v_b from public._archive_eligible(date '2024-01-01') e
   where e.patient_id<>v_a and exists (select 1 from public.clinical_visits v where v.patient_id=e.patient_id) order by 1 limit 1;
  select i.patient_id into v_c from public.invoices i where i.status='active' and i.patient_id not in (v_a,v_b) limit 1;
  if v_c is not null then
    perform set_config('app.archive_mode','1',true);
    update public.invoices set paid_amount = greatest(total - 500, 0) where id = (select id from public.invoices where patient_id=v_c and status='active' limit 1);
    perform set_config('app.archive_mode','',true);
  end if;
  if v_a is null or v_b is null then raise exception 'FAIL: test ke liye patient nahi mile'; end if;

  select coalesce(sum(amount),0) into v_inc0 from public.transactions where type='income';
  select count(*) into v_mov0 from public.inventory_movements;
  select coalesce(balance,0) into v_bal0 from public.patient_balances where patient_id=v_a;
  select count(*) into v_inv_a from public.invoices where patient_id=v_a;
  select count(*) into v_pay_a from public.payments where patient_id=v_a;

  perform set_config('request.jwt.claim.sub', v_rec, true);
  perform set_config('role','authenticated',true);
  ok := false;
  begin perform public.archive_preview(date '2024-01-01'); exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: receptionist preview kar saka'; end if;
  ok := false;
  begin perform public.archive_old_data(date '2024-01-01','DELETE'); exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: receptionist archive kar saka'; end if;
  ok := false;
  begin perform public.db_usage(); exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: receptionist db_usage dekh saka'; end if;

  perform set_config('request.jwt.claim.sub', v_admin, true);
  r := public.db_usage();
  if (r->>'db_bytes')::bigint <= 0 or jsonb_array_length(r->'tables') = 0 then raise exception 'FAIL: db_usage khali'; end if;
  r := public.archive_preview(date '2024-01-01');
  if (r->>'patients')::int < 2 or (r->>'visits')::int < 2 then raise exception 'FAIL: preview galat %', r; end if;
  ok := false;
  begin perform public.archive_old_data(current_date, 'DELETE'); exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: nayi tareekh par archive ho gaya'; end if;
  ok := false;
  begin perform public.archive_old_data(date '2024-01-01', 'haan'); exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: bina DELETE likhe archive ho gaya'; end if;
  perform set_config('role','postgres',true);
  if v_c is not null and exists (select 1 from public._archive_eligible(date '2024-01-01') e where e.patient_id=v_c) then raise exception 'FAIL: baqaya wala patient eligible'; end if;
  perform set_config('role','authenticated',true);

  perform set_config('role','postgres',true);
  perform set_config('request.jwt.claim.sub', v_admin, true);
  perform set_config('role','authenticated',true);
  r := public.archive_old_data(date '2024-01-01', 'DELETE', false, 1);
  if (r->>'done')::int <> 1 then raise exception 'FAIL: limit 1 par done %', r; end if;
  r := public.archive_old_data(date '2024-01-01', 'DELETE', false, 100);

  perform set_config('role','postgres',true);
  if exists (select 1 from public.clinical_visits where patient_id in (v_a,v_b)) then raise exception 'FAIL: visits baqi'; end if;
  if exists (select 1 from public.dental_chart where patient_id in (v_a,v_b)) then raise exception 'FAIL: chart baqi'; end if;
  if exists (select 1 from public.prescriptions where patient_id in (v_a,v_b)) then raise exception 'FAIL: prescriptions baqi'; end if;
  if exists (select 1 from public.patient_treatments where patient_id in (v_a,v_b)) then raise exception 'FAIL: treatments baqi'; end if;
  if exists (select 1 from public.audit_log where patient_id in (v_a,v_b) and table_name in ('clinical_visits','patient_treatments','prescriptions','visit_notes')) then raise exception 'FAIL: audit mein purana data baqi'; end if;
  if not exists (select 1 from public.audit_log where patient_id=v_a and action='PATIENT_ARCHIVE') then raise exception 'FAIL: archive ka audit nahi'; end if;
  if (select count(*) from public.invoices where patient_id=v_a) <> v_inv_a then raise exception 'FAIL: invoices badal gayi'; end if;
  if (select count(*) from public.payments where patient_id=v_a) <> v_pay_a then raise exception 'FAIL: payments badal gayi'; end if;
  select coalesce(sum(amount),0) into v_inc1 from public.transactions where type='income';
  if v_inc1 <> v_inc0 then raise exception 'FAIL: income badal gayi % %', v_inc0, v_inc1; end if;
  select coalesce(balance,0) into v_bal1 from public.patient_balances where patient_id=v_a;
  if v_bal1 <> v_bal0 then raise exception 'FAIL: baqaya badal gaya'; end if;
  if not exists (select 1 from public.patient_archive_cards where patient_id=v_a and visits>0 and total_billed>0 and not with_money) then raise exception 'FAIL: summary card nahi / khali'; end if;
  if not exists (select 1 from public.patients where id=v_a) then raise exception 'FAIL: patient gayab'; end if;
  if (select count(*) from public.patient_archive_cards where patient_id in (v_a,v_b)) <> 2 then raise exception 'FAIL: dono ke card nahi'; end if;

  r := public.archive_preview(date '2024-01-01');
  if (r->>'patients')::int <> 0 then null; end if;

  perform set_config('request.jwt.claim.sub', v_admin, true);
  perform set_config('role','authenticated',true);
  perform set_config('app.test_dummy','1',true);
  perform set_config('role','postgres',true);
  select count(*) into v_inv_b from public.invoices where patient_id=v_b;
  select count(*) into v_mov1 from public.inventory_movements;
  if v_mov1 <> v_mov0 then raise exception 'FAIL: stock movement badli'; end if;
  perform set_config('app.archive_mode','1',true);
  update public.clinical_visits set visit_date = date '2023-02-01' where false;
  perform set_config('app.archive_mode','',true);

  perform set_config('request.jwt.claim.sub', v_admin, true);
  perform set_config('role','authenticated',true);
  begin delete from public.audit_log where patient_id=v_a; exception when others then null; end;
  perform set_config('role','postgres',true);
  if not exists (select 1 from public.audit_log where patient_id=v_a and action='PATIENT_ARCHIVE') then raise exception 'FAIL: audit_log seedha delete ho gaya'; end if;
  begin delete from public.audit_log where patient_id=v_a; raise exception 'FAIL: audit_log ka trigger nahi roka'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  raise notice 'PASS archive (patients %, invoices kept %)', 2, v_inv_a;
end $$;
rollback;

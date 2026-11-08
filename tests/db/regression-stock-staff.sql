-- Al Shifa: stock aur staff hisaab ka regression test. SIRF TEST project par chalayein. Aakhir mein ROLLBACK.
begin;
select set_config('request.jwt.claim.sub', (select id::text from public.staff_profiles where role in ('admin','doctor') and is_active order by created_at limit 1), true);
select set_config('role', 'authenticated', true);

do $$
declare
  it uuid; q0 numeric; q1 numeric; ex0 numeric; ex1 numeric; ok boolean; sid uuid; e record; n int; b0 numeric; b1 numeric;
begin
  select id, quantity into it, q0 from public.inventory where is_active order by item_name limit 1;
  if it is null then raise exception 'FAIL: test ke liye koi stock item chahiye'; end if;
  select coalesce(sum(amount), 0) into ex0 from public.transactions where type = 'expense' and category = 'Inventory';

  perform public.record_purchase(it, 10, 500, 'cash', 'Test Supplier', null, 'regression', 'purchase', 'rt-purch-1');
  perform public.record_purchase(it, 10, 500, 'cash', 'Test Supplier', null, 'regression', 'purchase', 'rt-purch-1');
  select quantity into q1 from public.inventory where id = it;
  select coalesce(sum(amount), 0) into ex1 from public.transactions where type = 'expense' and category = 'Inventory';
  if q1 = q0 + 10 then raise notice 'PASS purchase adds stock once (same key ignored)'; else raise exception 'FAIL purchase qty % -> %', q0, q1; end if;
  if ex1 = ex0 + 500 then raise notice 'PASS purchase creates one expense of Rs. 500'; else raise exception 'FAIL purchase expense % -> %', ex0, ex1; end if;

  perform public.record_usage(jsonb_build_array(jsonb_build_object('inventory_id', it, 'qty', 3)), null, null, 'regression', 'rt-use-1');
  select quantity into q0 from public.inventory where id = it;
  if q0 = q1 - 3 then raise notice 'PASS usage deducts stock'; else raise exception 'FAIL usage % -> %', q1, q0; end if;

  ok := false;
  begin perform public.record_usage(jsonb_build_array(jsonb_build_object('inventory_id', it, 'qty', q0 + 1000)), null, null, 'regression', 'rt-use-2'); exception when others then ok := true; end;
  if ok then raise notice 'PASS usage more than stock is blocked'; else raise exception 'FAIL negative stock allowed'; end if;

  perform public.record_stock_count(jsonb_build_array(jsonb_build_object('inventory_id', it, 'actual', q0 - 1)), 'regression count');
  select quantity into q1 from public.inventory where id = it;
  if q1 = q0 - 1 then raise notice 'PASS stock count adjusts to actual'; else raise exception 'FAIL stock count % vs %', q1, q0 - 1; end if;

  select count(*) into n from public.inventory_reconcile() where inventory_id = it;
  select count(*) into n from public.inventory_movements where inventory_id = it;
  raise notice 'INFO % movements recorded for the test item', n;

  select id into sid from public.staff_members where is_active order by full_name limit 1;
  select coalesce(sum(case when kind in ('salary_due','bonus') then amount else -amount end), 0) into b0 from public.staff_ledger where staff_id = sid;
  select coalesce(sum(amount), 0) into ex0 from public.transactions where type = 'expense' and category = 'Staff Advance';
  perform public.staff_add_entry(sid, 'advance', 1000, null, null, 'cash', 'regression', 'rt-adv-1');
  perform public.staff_add_entry(sid, 'advance', 1000, null, null, 'cash', 'regression', 'rt-adv-1');
  select coalesce(sum(amount), 0) into ex1 from public.transactions where type = 'expense' and category = 'Staff Advance';
  if ex1 = ex0 + 1000 then raise notice 'PASS advance creates one expense (same key ignored)'; else raise exception 'FAIL advance expense % -> %', ex0, ex1; end if;

  for e in select * from public.payroll_calc(to_char((now() at time zone 'Asia/Karachi')::date - 31, 'YYYY-MM'), sid) loop
    if abs(e.net - (e.entitled - e.cut_late - e.cut_early - e.cut_absent + e.ot_amount)) <= 1 then raise notice 'PASS payroll_calc: net = entitled - cuts + overtime'; else raise exception 'FAIL payroll_calc net %', e; end if;
  end loop;
end $$;
rollback;

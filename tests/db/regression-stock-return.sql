-- Al Shifa: stock supplier-return / damaged regression. SIRF TEST project. Aakhir mein ROLLBACK.
begin;
select set_config('request.jwt.claim.sub', (select id::text from public.staff_profiles where role in ('admin','doctor') and is_active order by created_at limit 1), true);
select set_config('role', 'authenticated', true);
do $$
declare a uuid; n int; ok boolean; v record; exp0 numeric; inc0 numeric; r uuid; rec uuid;
begin
  insert into public.inventory (item_name, category, quantity, unit) values ('SR Gloves', 'dental', 0, 'pcs') returning id into a;
  perform public.record_purchase(a, 10, 1000, 'cash', 'Sup', null, 'sr', 'purchase', 'sr-1');
  select coalesce(sum(amount),0) into exp0 from public.transactions where type='expense';
  select coalesce(sum(amount),0) into inc0 from public.transactions where type='income';

  ok := false; begin perform public.stock_return_or_damage(a, 2, 'damaged', 0, 'cash', '  ', 'sr-d0'); exception when others then ok := true; end;
  if ok then raise notice 'PASS damaged without reason blocked'; else raise exception 'FAIL damaged w/o reason'; end if;

  perform public.stock_return_or_damage(a, 2, 'damaged', 0, 'cash', 'toot gaye', 'sr-d1');
  select * into v from public.inventory_movements where inventory_id = a and kind = 'damaged';
  select quantity into n from public.inventory where id = a;
  if n = 8 and v.qty_change = -2 and v.qty_after = 8 and v.total_cost = 200 then raise notice 'PASS damaged: stock 10->8, movement -2, loss value 200'; else raise exception 'FAIL damaged % %', n, v; end if;
  if (select coalesce(sum(amount),0) from public.transactions where type='expense') = exp0 and (select coalesce(sum(amount),0) from public.transactions where type='income') = inc0 then raise notice 'PASS damaged creates no cash entry (purchase expense already booked once)'; else raise exception 'FAIL damaged cash'; end if;

  perform public.stock_return_or_damage(a, 2, 'damaged', 0, 'cash', 'toot gaye', 'sr-d1');
  select count(*) into n from public.inventory_movements where inventory_id = a and kind = 'damaged';
  if n = 1 and (select quantity from public.inventory where id = a) = 8 then raise notice 'PASS duplicate click: no second deduction'; else raise exception 'FAIL duplicate damaged'; end if;

  rec := public.stock_return_or_damage(a, 3, 'return_supplier', 300, 'cash', 'galat maal', 'sr-r1');
  select * into v from public.transactions where id = rec;
  if v.type = 'income' and v.category = 'Supplier Refund' and v.amount = 300 and (select quantity from public.inventory where id = a) = 5 then raise notice 'PASS supplier return: stock 8->5, refund booked as Supplier Refund 300'; else raise exception 'FAIL return %', v; end if;

  ok := false; begin perform public.stock_return_or_damage(a, 99, 'return_supplier', 0, 'cash', null, 'sr-r2'); exception when others then ok := true; end;
  if ok then raise notice 'PASS cannot return more than stock (no negative stock)'; else raise exception 'FAIL negative stock'; end if;
  ok := false; begin perform public.stock_return_or_damage(a, 1, 'damaged', 50, 'cash', 'x', 'sr-d3'); exception when others then ok := true; end;
  if ok then raise notice 'PASS refund on damaged blocked'; else raise exception 'FAIL damaged refund'; end if;
  ok := false; begin perform public.stock_return_or_damage(a, 0, 'damaged', 0, 'cash', 'x', 'sr-d4'); exception when others then ok := true; end;
  if ok then raise notice 'PASS zero qty blocked'; else raise exception 'FAIL zero'; end if;

  select count(*) into n from public.inventory_reconcile() where inventory_id = a;
  if n = 0 then raise notice 'PASS stock reconcile: quantity = sum of movements'; else raise exception 'FAIL reconcile'; end if;
  ok := false; begin perform public.delete_inventory_item(a); exception when others then ok := true; end;
  if ok then raise notice 'PASS item with return/damage history cannot be deleted'; else raise exception 'FAIL delete'; end if;
  select count(*) into n from public.audit_log where table_name = 'inventory' and record_id = a::text and action in ('STOCK_DAMAGED','STOCK_RETURN');
  if n = 2 then raise notice 'PASS audit log has both actions'; else raise exception 'FAIL audit %', n; end if;
end $$;
rollback;

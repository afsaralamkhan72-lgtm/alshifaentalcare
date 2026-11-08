-- Al Shifa: inventory item edit / merge / delete / archive regression. SIRF TEST project. Aakhir mein ROLLBACK.
-- Receptionist wala check tab chalta hai jab test project mein koi receptionist (bina inventory.manage ke) ho.
begin;
select set_config('request.jwt.claim.sub', (select id::text from public.staff_profiles where role in ('admin','doctor') and is_active order by created_at limit 1), true);
select set_config('role', 'authenticated', true);

do $$
declare
  owner_id text := current_setting('request.jwt.claim.sub');
  rid uuid; a uuid; b uuid; c uuid; n int; n2 int; ok boolean; v record; exp0 numeric; exp1 numeric; msg text;
begin
  insert into public.inventory (item_name, category, quantity, unit) values ('RT Gloves', 'dental', 0, 'pcs') returning id into a;
  insert into public.inventory (item_name, category, quantity, unit) values ('RT Gloves dup', 'dental', 0, 'pcs') returning id into b;
  perform public.record_purchase(a, 10, 500, 'cash', 'Sup', null, 'rt', 'purchase', 'rti-1');
  perform public.record_purchase(b, 5, 200, 'cash', 'Sup', null, 'rt', 'purchase', 'rti-2');
  perform public.record_usage(jsonb_build_array(jsonb_build_object('inventory_id', b, 'qty', 2)), null, null, 'rt', 'rti-3');
  select coalesce(sum(amount), 0) into exp0 from public.transactions where type = 'expense' and category = 'Inventory';
  select count(*) into n from public.inventory_movements where inventory_id = a;

  perform public.update_inventory_item(a, 'RT Gloves Renamed', 'dental', 'box', 7, 'Sup2', 'Group X', 'description test');
  select * into v from public.inventory where id = a;
  select count(*) into n2 from public.inventory_movements where inventory_id = a;
  select coalesce(sum(amount), 0) into exp1 from public.transactions where type = 'expense' and category = 'Inventory';
  if v.item_name = 'RT Gloves Renamed' and v.unit = 'box' and v.description = 'description test' and v.quantity = 10 and n2 = n and exp1 = exp0 then raise notice 'PASS rename/edit: name, unit, description change; stock, movements, expenses same'; else raise exception 'FAIL rename/edit %', v; end if;

  ok := false; begin perform public.update_inventory_item(b, 'rt gloves renamed', 'dental', 'pcs', 5, null, null, null); exception when others then ok := true; end;
  if ok then raise notice 'PASS rename to an existing name is blocked'; else raise exception 'FAIL duplicate name allowed'; end if;

  ok := false; begin perform public.delete_inventory_item(a); exception when others then ok := true; end;
  if ok then raise notice 'PASS item with history cannot be deleted'; else raise exception 'FAIL deleted item with history'; end if;

  perform public.set_inventory_active(a, false);
  select * into v from public.inventory where id = a;
  select count(*) into n2 from public.inventory_movements where inventory_id = a;
  if not v.is_active and n2 = n and v.quantity = 10 then raise notice 'PASS archive keeps stock and history'; else raise exception 'FAIL archive'; end if;
  perform public.set_inventory_active(a, true);

  ok := false; begin perform public.merge_inventory_items(a, b, 'rt merge'); exception when others then ok := true; end;
  if ok then raise notice 'PASS merge of items with different units is blocked'; else raise exception 'FAIL merged different units'; end if;
  perform public.update_inventory_item(b, 'RT Gloves dup', 'dental', 'box', 5, null, null, null);
  perform public.merge_inventory_items(a, b, 'rt merge');
  select * into v from public.inventory where id = a;
  if v.quantity = 13 then raise notice 'PASS merge: kept item stock = 10 + 3'; else raise exception 'FAIL merge qty %', v.quantity; end if;
  select * into v from public.inventory where id = b;
  if v.quantity = 0 and not v.is_active and v.merged_into = a then raise notice 'PASS merge: duplicate archived, linked, stock 0'; else raise exception 'FAIL merge dup %', v; end if;
  select count(*) into n from public.inventory_movements where inventory_id = b and kind in ('purchase', 'usage', 'merge_out');
  if n = 3 then raise notice 'PASS merge: duplicate keeps purchase, usage and merge_out history'; else raise exception 'FAIL merge history %', n; end if;
  select coalesce(sum(amount), 0) into exp1 from public.transactions where type = 'expense' and category = 'Inventory';
  if exp1 = exp0 then raise notice 'PASS merge: expenses unchanged'; else raise exception 'FAIL merge changed expenses'; end if;
  select count(*) into n from public.inventory_reconcile() where inventory_id in (a, b);
  if n = 0 then raise notice 'PASS merge: stock = sum of movements for both items'; else raise exception 'FAIL stock vs movements after merge'; end if;
  ok := false; begin perform public.set_inventory_active(b, true); exception when others then ok := true; end;
  if ok then raise notice 'PASS merged item cannot be re-activated'; else raise exception 'FAIL merged item reactivated'; end if;

  insert into public.inventory (item_name, category, quantity, unit) values ('RT Mistake', 'general', 0, 'pcs') returning id into c;
  perform public.delete_inventory_item(c);
  select * into v from public.inventory where id = c;
  if v.deleted_at is not null and not v.is_active then raise notice 'PASS item without history goes to recycle bin'; else raise exception 'FAIL delete to bin'; end if;
  perform public.restore_inventory_item(c);
  select * into v from public.inventory where id = c;
  if v.deleted_at is null and v.is_active then raise notice 'PASS restore from recycle bin'; else raise exception 'FAIL restore'; end if;
  perform public.delete_inventory_item(c);
  perform public.purge_inventory_item(c);
  if not exists (select 1 from public.inventory where id = c) then raise notice 'PASS permanent delete (only items without history)'; else raise exception 'FAIL purge'; end if;

  select count(distinct action) into n from public.audit_log where table_name = 'inventory' and record_id in (a::text, b::text, c::text) and action in ('UPDATE', 'ARCHIVE', 'RESTORE_ACTIVE', 'MERGE', 'DELETE_TO_BIN', 'RESTORE_FROM_BIN', 'PURGE');
  if n = 7 then raise notice 'PASS audit log has edit, archive, restore, merge, delete, restore-from-bin, purge'; else raise exception 'FAIL audit actions found: %', n; end if;

  select id into rid from public.staff_profiles where role = 'receptionist' and is_active
    and not exists (select 1 from public.staff_permissions sp where sp.user_id = staff_profiles.id and sp.perm_code = 'inventory.manage') limit 1;
  if rid is null then
    raise notice 'SKIP receptionist permission checks (test project mein receptionist nahi)';
  else
    perform set_config('request.jwt.claim.sub', rid::text, true);
    ok := false; begin perform public.merge_inventory_items(a, b, null); exception when others then ok := true; end;
    if ok then raise notice 'PASS receptionist cannot merge'; else raise exception 'FAIL receptionist merged'; end if;
    ok := false; begin perform public.delete_inventory_item(a); exception when others then ok := true; end;
    if ok then raise notice 'PASS receptionist cannot delete'; else raise exception 'FAIL receptionist deleted'; end if;
    ok := false; begin perform public.purge_inventory_item(a); exception when others then ok := true; end;
    if ok then raise notice 'PASS receptionist cannot purge'; else raise exception 'FAIL receptionist purged'; end if;
    ok := false; begin perform public.update_inventory_item(a, 'hacked', 'dental', 'pcs', 1, null, null, null); exception when others then ok := true; end;
    if ok then raise notice 'PASS receptionist without inventory.manage cannot edit items'; else raise exception 'FAIL receptionist edited'; end if;
    perform set_config('request.jwt.claim.sub', owner_id, true);
  end if;

  delete from public.inventory where id = a;
  if exists (select 1 from public.inventory where id = a) then raise notice 'PASS direct DELETE on inventory is blocked (RLS)'; else raise exception 'FAIL direct delete worked'; end if;
end $$;
rollback;

alter table public.audit_log drop constraint if exists audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check check (action ~ '^[A-Z][A-Z_]{2,39}$');

alter table public.inventory_movements drop constraint if exists inventory_movements_kind_check;
alter table public.inventory_movements add constraint inventory_movements_kind_check
  check (kind in ('opening','purchase','usage','count_correction','merge_in','merge_out','return_supplier','damaged'));

create or replace function public.stock_return_or_damage(
  p_inventory_id uuid, p_qty numeric, p_kind text, p_refund numeric default 0,
  p_method text default 'cash', p_note text default null, p_key text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_item public.inventory%rowtype;
  v_name text;
  v_qty numeric(12,2) := round(coalesce(p_qty, 0), 2);
  v_refund numeric(12,2) := round(coalesce(p_refund, 0), 2);
  v_after numeric(12,2);
  v_avg numeric;
  v_value numeric(12,2);
  v_tx uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not (public.is_owner() or public.has_perm('inventory.manage')) then
    raise exception 'Stock wapas/kharab likhne ki permission nahi';
  end if;
  if p_kind not in ('return_supplier', 'damaged') then raise exception 'Qism ghalat hai'; end if;
  if v_qty <= 0 then raise exception 'Qty 0 se zyada honi chahiye'; end if;
  if v_refund < 0 then raise exception 'Wapsi ki raqam ghalat hai'; end if;
  if v_refund > 0 and p_kind <> 'return_supplier' then raise exception 'Kharab maal par raqam wapas nahi aati'; end if;
  if v_refund > 0 and not public.is_owner() then raise exception 'Raqam wapas likhna sirf owner kar sakta hai'; end if;
  if v_refund > 0 and coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;
  if p_kind = 'damaged' and v_note is null then raise exception 'Kharabi ki wajah likhna zaroori hai'; end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('stk:' || p_key));
    if exists (select 1 from public.inventory_movements where batch_key = p_key) then return null; end if;
  end if;

  select * into v_item from public.inventory where id = p_inventory_id for update;
  if not found or v_item.deleted_at is not null then raise exception 'Item nahi mila'; end if;
  if v_qty > v_item.quantity then raise exception 'Itna stock maujood nahi (maujooda: %)', v_item.quantity; end if;

  select sum(total_cost) / nullif(sum(qty_change), 0) into v_avg
    from public.inventory_movements where inventory_id = p_inventory_id and kind = 'purchase' and total_cost > 0;
  v_value := round(coalesce(v_avg, 0) * v_qty, 2);
  v_after := v_item.quantity - v_qty;
  select full_name into v_name from public.staff_profiles where id = v_uid;

  perform set_config('app.stock_fn', 'on', true);
  update public.inventory set quantity = v_after, last_updated = now() where id = p_inventory_id;
  perform set_config('app.stock_fn', 'off', true);

  if v_refund > 0 then
    insert into public.transactions (type, category, amount, payment_method, description, transaction_date, recorded_by, source)
    values ('income', 'Supplier Refund', v_refund, p_method,
            'Supplier ko wapas: ' || v_item.item_name || ' x' || v_qty, v_today, v_uid, 'inventory')
    returning id into v_tx;
  end if;

  insert into public.inventory_movements
    (inventory_id, kind, qty_change, qty_after, total_cost, expense_tx_id, batch_key, note, created_by, created_by_name)
  values
    (p_inventory_id, p_kind, -v_qty, v_after, case when p_kind = 'damaged' then nullif(v_value, 0) else coalesce(nullif(v_refund, 0), nullif(v_value, 0)) end,
     v_tx, p_key, v_note, v_uid, v_name);

  perform public._inv_audit(case p_kind when 'damaged' then 'STOCK_DAMAGED' else 'STOCK_RETURN' end, p_inventory_id,
    jsonb_build_object('quantity', v_item.quantity),
    jsonb_build_object('quantity', v_after, 'qty', v_qty, 'refund', v_refund, 'loss_value', v_value, 'note', v_note));
  return v_tx;
end $$;
grant execute on function public.stock_return_or_damage(uuid, numeric, text, numeric, text, text, text) to authenticated;

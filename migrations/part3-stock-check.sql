create or replace function public.inventory_reconcile()
returns table(inventory_id uuid, item_name text, quantity numeric, movements_sum numeric, opening_gap numeric)
language sql stable security definer set search_path = public as $$
  select i.id, i.item_name, i.quantity, coalesce(sum(m.qty_change), 0), i.quantity - coalesce(sum(m.qty_change), 0)
  from public.inventory i left join public.inventory_movements m on m.inventory_id = i.id
  where (public.is_owner() or public.has_perm('inventory.view'))
  group by i.id
  having i.quantity <> coalesce(sum(m.qty_change), 0)
  order by i.item_name
$$;
grant execute on function public.inventory_reconcile() to authenticated;

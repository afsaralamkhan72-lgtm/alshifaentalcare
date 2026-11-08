create or replace function public.merge_inventory_items(p_keep uuid, p_remove uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
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
grant execute on function public.merge_inventory_items(uuid, uuid, text) to authenticated;

create or replace function public._inv_has_history(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.inventory_movements where inventory_id = p_id)
      or exists (select 1 from public.stock_counts where inventory_id = p_id)
      or exists (select 1 from public.treatment_materials where inventory_id = p_id)
      or exists (select 1 from public.inventory where merged_into = p_id)
      or coalesce((select quantity <> 0 or merged_into is not null from public.inventory where id = p_id), false)
$$;

create or replace function public.delete_inventory_item(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.inventory%rowtype;
begin
  if not public.is_owner() then raise exception 'Sirf owner item delete kar sakta hai'; end if;
  select * into v from public.inventory where id = p_id for update;
  if not found or v.deleted_at is not null then raise exception 'Item nahi mila'; end if;
  if public._inv_has_history(p_id) then raise exception 'Is item par stock, kharid ya istemal ka record hai, delete nahi ho sakta. "Band (Archive)" karein, record mehfooz rahega'; end if;
  update public.inventory set deleted_at = now(), is_active = false, last_updated = now() where id = p_id;
  perform public._inv_audit('DELETE_TO_BIN', p_id, to_jsonb(v), null);
end $$;

create or replace function public.restore_inventory_item(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.inventory%rowtype;
begin
  if not public.is_owner() then raise exception 'Sirf owner item wapas la sakta hai'; end if;
  select * into v from public.inventory where id = p_id for update;
  if not found or v.deleted_at is null then raise exception 'Item recycle bin mein nahi hai'; end if;
  update public.inventory set deleted_at = null, is_active = true, last_updated = now() where id = p_id;
  perform public._inv_audit('RESTORE_FROM_BIN', p_id, to_jsonb(v), null);
end $$;

create or replace function public.purge_inventory_item(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.inventory%rowtype;
begin
  if not public.is_owner() then raise exception 'Sirf owner item hamesha ke liye hata sakta hai'; end if;
  select * into v from public.inventory where id = p_id for update;
  if not found or v.deleted_at is null then raise exception 'Pehle item ko recycle bin mein bhejein'; end if;
  if public._inv_has_history(p_id) then raise exception 'Is item par record hai, hamesha ke liye nahi hat sakta'; end if;
  delete from public.inventory_meta where inventory_id = p_id;
  delete from public.inventory where id = p_id;
  perform public._inv_audit('PURGE', p_id, to_jsonb(v), null);
end $$;

create or replace function public.inventory_item_flags()
returns table(inventory_id uuid, has_history boolean)
language sql stable security definer set search_path = public as $$
  select i.id, public._inv_has_history(i.id) from public.inventory i
   where (public.is_owner() or public.has_perm('inventory.view'))
$$;
grant execute on function public.delete_inventory_item(uuid) to authenticated;
grant execute on function public.restore_inventory_item(uuid) to authenticated;
grant execute on function public.purge_inventory_item(uuid) to authenticated;
grant execute on function public.inventory_item_flags() to authenticated;

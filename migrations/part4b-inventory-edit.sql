create or replace function public._inv_audit(p_action text, p_id uuid, p_old jsonb, p_new jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text; v_role text;
begin
  select full_name, role into v_name, v_role from public.staff_profiles where id = auth.uid();
  insert into public.audit_log (actor_id, actor_name, actor_role, action, table_name, record_id, old_data, new_data)
  values (auth.uid(), v_name, v_role, p_action, 'inventory', p_id::text, p_old, p_new);
end $$;

create or replace function public.update_inventory_item(p_id uuid, p_name text, p_category text, p_unit text, p_reorder numeric, p_supplier text, p_group text, p_description text)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text := btrim(coalesce(p_name, ''));
begin
  if not (public.is_owner() or public.has_perm('inventory.manage')) then raise exception 'Item badalne ki permission nahi'; end if;
  if v_name = '' then raise exception 'Item ka naam khali nahi ho sakta'; end if;
  if p_category not in ('dental', 'homeopathic', 'general') then raise exception 'Category ghalat hai'; end if;
  if coalesce(p_reorder, 0) < 0 then raise exception 'Alert level ghalat hai'; end if;
  if not exists (select 1 from public.inventory where id = p_id and deleted_at is null) then raise exception 'Item nahi mila'; end if;
  if exists (select 1 from public.inventory where id <> p_id and deleted_at is null and merged_into is null and lower(btrim(item_name)) = lower(v_name) and category = p_category) then
    raise exception 'Is naam ka item pehle se maujood hai. Dohra item ho to "Milayein (Merge)" istemal karein';
  end if;
  update public.inventory set item_name = v_name, category = p_category, unit = nullif(btrim(coalesce(p_unit, '')), ''),
    reorder_level = coalesce(p_reorder, reorder_level), supplier = nullif(btrim(coalesce(p_supplier, '')), ''),
    item_group = nullif(btrim(coalesce(p_group, '')), ''), description = nullif(btrim(coalesce(p_description, '')), ''), last_updated = now()
  where id = p_id;
end $$;

create or replace function public.set_inventory_active(p_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v public.inventory%rowtype;
begin
  if not (public.is_owner() or public.has_perm('inventory.manage')) then raise exception 'Permission nahi'; end if;
  select * into v from public.inventory where id = p_id for update;
  if not found or v.deleted_at is not null then raise exception 'Item nahi mila'; end if;
  if v.merged_into is not null then raise exception 'Ye item doosre item mein mil chuka hai, wapas chalu nahi ho sakta'; end if;
  update public.inventory set is_active = p_active, last_updated = now() where id = p_id;
  perform public._inv_audit(case when p_active then 'RESTORE_ACTIVE' else 'ARCHIVE' end, p_id, to_jsonb(v), null);
end $$;
grant execute on function public.update_inventory_item(uuid, text, text, text, numeric, text, text, text) to authenticated;
grant execute on function public.set_inventory_active(uuid, boolean) to authenticated;

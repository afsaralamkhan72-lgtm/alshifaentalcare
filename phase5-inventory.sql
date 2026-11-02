-- =====================================================================
-- PHASE 5: INVENTORY (purchase + usage + stock count + alerts)
-- Al Shifa Health Care
--
-- SIRF naya jodta hai. Purane inventory items aur unki quantity bilkul nahi badalti.
-- Dobara chalane se koi nuqsan nahi.
-- Pehle phase2-audit-permissions.sql chali honi chahiye (is_owner() wahin se aata hai).
-- PEHLE test (staging) project par chalayein.
--
-- Ab stock ki har tabdeeli (kharid, istemal, ginti ki ghalti) ek movement ke tor par
-- likhi jati hai: kisne, kab, kitna, kis patient/invoice par. Quantity ko seedha
-- badalna band hai, sirf neeche ke functions se badalti hai.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Inventory par naya (khali) column: item band karne ke liye, delete nahi
-- ---------------------------------------------------------------------
alter table public.inventory add column if not exists is_active boolean not null default true;

-- Expense entries jo system khud banata hai (inventory/lab/payroll), unhein alag pehchan ke liye
alter table public.transactions add column if not exists source text;

-- ---------------------------------------------------------------------
-- 2. Stock ki har harkat (kabhi edit/delete nahi)
-- ---------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  inventory_id  uuid not null references public.inventory(id),
  kind          text not null check (kind in ('opening', 'purchase', 'usage', 'count_correction')),
  qty_change    numeric(12,2) not null,
  qty_after     numeric(12,2) not null,
  total_cost    numeric(12,2),
  patient_id    uuid references public.patients(id),
  invoice_id    uuid references public.invoices(id),
  treatment_id  uuid references public.treatment_catalog(id),
  expense_tx_id uuid,
  batch_key     text,
  note          text,
  created_by    uuid,
  created_by_name text
);
create index if not exists idx_inv_mov_item  on public.inventory_movements (inventory_id, created_at desc);
create index if not exists idx_inv_mov_batch on public.inventory_movements (batch_key) where batch_key is not null;
create index if not exists idx_inv_mov_inv   on public.inventory_movements (invoice_id) where invoice_id is not null;

create or replace function public.inventory_movements_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Stock movement mein tabdeeli ya delete allowed nahi hai';
end;
$$;
drop trigger if exists trg_inv_mov_immutable on public.inventory_movements;
create trigger trg_inv_mov_immutable
  before update or delete on public.inventory_movements
  for each row execute function public.inventory_movements_immutable();

-- ---------------------------------------------------------------------
-- 3. Har treatment ke saath aam taur par kaun sa samaan lagta hai
-- ---------------------------------------------------------------------
create table if not exists public.treatment_materials (
  treatment_id uuid not null references public.treatment_catalog(id),
  inventory_id uuid not null references public.inventory(id),
  default_qty  numeric(10,2) not null default 1 check (default_qty > 0),
  primary key (treatment_id, inventory_id)
);

-- ---------------------------------------------------------------------
-- 4. Ginti: system ke mutabiq (expected) bamuqabil asal (actual)
-- ---------------------------------------------------------------------
create table if not exists public.stock_counts (
  id           bigint generated always as identity primary key,
  count_batch  text not null,
  counted_on   date not null,
  inventory_id uuid not null references public.inventory(id),
  expected     numeric(12,2) not null,
  actual       numeric(12,2) not null check (actual >= 0),
  diff         numeric(12,2) generated always as (actual - expected) stored,
  note         text,
  counted_by   uuid,
  counted_by_name text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_stock_counts_item on public.stock_counts (inventory_id, counted_on desc);

-- ---------------------------------------------------------------------
-- 5. Access (RLS)
-- inventory: sab staff dekh sakta hai; naya item / tabdeeli sirf owner
-- movements / counts / materials: sirf owner (kharid ki qeemat paisa hai)
-- ---------------------------------------------------------------------
drop policy if exists "staff_full_access_inventory" on public.inventory;
drop policy if exists "staff_select_inventory" on public.inventory;
drop policy if exists "owner_insert_inventory" on public.inventory;
drop policy if exists "owner_update_inventory" on public.inventory;
create policy "staff_select_inventory" on public.inventory for select using (public.is_staff());
create policy "owner_insert_inventory" on public.inventory for insert with check (public.is_owner());
create policy "owner_update_inventory" on public.inventory for update using (public.is_owner()) with check (public.is_owner());

do $$
declare t text;
begin
  foreach t in array array['inventory_movements', 'stock_counts', 'treatment_materials']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'owner_select_' || t, t);
    execute format('create policy %I on public.%I for select using (public.is_owner())', 'owner_select_' || t, t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
  execute 'drop policy if exists owner_insert_treatment_materials on public.treatment_materials';
  execute 'create policy owner_insert_treatment_materials on public.treatment_materials for insert with check (public.is_owner())';
  execute 'drop policy if exists owner_update_treatment_materials on public.treatment_materials';
  execute 'create policy owner_update_treatment_materials on public.treatment_materials for update using (public.is_owner()) with check (public.is_owner())';
  execute 'drop policy if exists owner_delete_treatment_materials on public.treatment_materials';
  execute 'create policy owner_delete_treatment_materials on public.treatment_materials for delete using (public.is_owner())';
end $$;

grant select on public.inventory_movements, public.stock_counts to authenticated;
grant select, insert, update, delete on public.treatment_materials to authenticated;
revoke insert, update, delete, truncate on public.inventory_movements, public.stock_counts from authenticated;
revoke delete, truncate on public.inventory from authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------------------------------------------------------------------
-- 6. Quantity ko seedha badalne se rokna (sirf functions badal sakte hain)
-- (SQL editor / service key par rok nahi lagti)
-- ---------------------------------------------------------------------
create or replace function public.guard_inventory_quantity()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.stock_fn', true), '') <> 'on' then
    if TG_OP = 'INSERT' and new.quantity <> 0 then
      raise exception 'Naya item qty 0 se banayein, phir "Opening stock" ya "Kharid" se qty dalein';
    elsif TG_OP = 'UPDATE' and new.quantity is distinct from old.quantity then
      raise exception 'Stock seedha nahi badla ja sakta. Kharid, istemal ya ginti ka option istemal karein';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_inventory_quantity on public.inventory;
create trigger trg_guard_inventory_quantity
  before insert or update on public.inventory
  for each row execute function public.guard_inventory_quantity();

-- ---------------------------------------------------------------------
-- 7. FUNCTIONS
-- ---------------------------------------------------------------------

-- Ye functions definer hain (RLS se upar), lekin har aik andar is_owner()/is_staff() khud check karta hai.
-- 7a. Kharid / opening stock: stock barhta hai aur (agar qeemat di) kharcha khud likha jata hai
create or replace function public.record_purchase(
  p_inventory_id uuid,
  p_qty          numeric,
  p_total_cost   numeric default 0,
  p_method       text    default 'cash',
  p_supplier     text    default null,
  p_expiry       date    default null,
  p_note         text    default null,
  p_kind         text    default 'purchase',
  p_key          text    default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_item  public.inventory%rowtype;
  v_name  text;
  v_cost  numeric(12,2) := round(coalesce(p_total_cost, 0), 2);
  v_qty   numeric(12,2) := round(coalesce(p_qty, 0), 2);
  v_after numeric(12,2);
  v_tx    uuid;
  v_mov   bigint;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin stock kharid likh sakta hai';
  end if;
  if p_kind not in ('purchase', 'opening') then raise exception 'Qism ghalat hai'; end if;
  if v_qty <= 0 then raise exception 'Qty 0 se zyada honi chahiye'; end if;
  if v_cost < 0 then raise exception 'Qeemat ghalat hai'; end if;
  if v_cost > 0 and coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('stk:' || p_key));
    if exists (select 1 from public.inventory_movements where batch_key = p_key) then
      return null; -- pehle ho chuka
    end if;
  end if;

  select * into v_item from public.inventory where id = p_inventory_id for update;
  if not found then raise exception 'Item nahi mila'; end if;

  select full_name into v_name from public.staff_profiles where id = v_uid;
  v_after := v_item.quantity + v_qty;

  perform set_config('app.stock_fn', 'on', true);
  update public.inventory
     set quantity     = v_after,
         supplier     = coalesce(nullif(btrim(coalesce(p_supplier, '')), ''), supplier),
         expiry_date  = coalesce(p_expiry, expiry_date),
         last_updated = now()
   where id = p_inventory_id;
  perform set_config('app.stock_fn', 'off', true);

  -- Kharcha (sirf jab qeemat di ho aur kharid ho, opening stock par nahi)
  if p_kind = 'purchase' and v_cost > 0 then
    insert into public.transactions
      (type, category, amount, payment_method, description, transaction_date, recorded_by, source)
    values
      ('expense', 'Inventory', v_cost, p_method,
       'Stock kharida: ' || v_item.item_name || ' x' || v_qty ||
         coalesce(' (' || nullif(btrim(coalesce(p_supplier, '')), '') || ')', ''),
       v_today, v_uid, 'inventory')
    returning id into v_tx;
  end if;

  insert into public.inventory_movements
    (inventory_id, kind, qty_change, qty_after, total_cost, expense_tx_id, batch_key, note, created_by, created_by_name)
  values
    (p_inventory_id, p_kind, v_qty, v_after, nullif(v_cost, 0), v_tx, p_key,
     nullif(btrim(coalesce(p_note, '')), ''), v_uid, v_name)
  returning id into v_mov;

  return v_tx;
end;
$$;

-- 7b. Istemal (treatment ke baad tick-list se, ya haath se). Staff (reception bhi) kar sakta hai,
-- is liye definer: reception inventory table seedha nahi badal sakti, sirf ye function.
-- Stock kam ho to bhi likh deta hai (manfi ho sakta hai) taake kaam na ruke; ginti se theek hota hai.
create or replace function public.record_usage(
  p_items      jsonb,
  p_patient_id uuid default null,
  p_invoice_id uuid default null,
  p_note       text default null,
  p_key        text default null
)
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_name  text;
  v_item  jsonb;
  v_inv   public.inventory%rowtype;
  v_qty   numeric(12,2);
  v_after numeric(12,2);
  v_n     int := 0;
begin
  if not public.is_staff() then
    raise exception 'Login zaroori hai';
  end if;
  -- Invoice se jurna ho to sirf owner (paison wali cheez)
  if p_invoice_id is not null and not public.is_owner() then
    raise exception 'Sirf doctor/admin invoice par istemal likh sakta hai';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Koi item nahi';
  end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('stk:' || p_key));
    if exists (select 1 from public.inventory_movements where batch_key = p_key) then
      return 0; -- pehle ho chuka, dobara deduct nahi
    end if;
  end if;

  select full_name into v_name from public.staff_profiles where id = v_uid;

  perform set_config('app.stock_fn', 'on', true);
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := round((v_item ->> 'qty')::numeric, 2);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Istemal ki qty 0 se zyada honi chahiye';
    end if;

    select * into v_inv from public.inventory
     where id = (v_item ->> 'inventory_id')::uuid for update;
    if not found then raise exception 'Item nahi mila'; end if;

    v_after := v_inv.quantity - v_qty;
    update public.inventory set quantity = v_after, last_updated = now() where id = v_inv.id;

    insert into public.inventory_movements
      (inventory_id, kind, qty_change, qty_after, patient_id, invoice_id, treatment_id,
       batch_key, note, created_by, created_by_name)
    values
      (v_inv.id, 'usage', -v_qty, v_after, p_patient_id, p_invoice_id,
       nullif(v_item ->> 'treatment_id', '')::uuid, p_key,
       nullif(btrim(coalesce(p_note, '')), ''), v_uid, v_name);
    v_n := v_n + 1;
  end loop;
  perform set_config('app.stock_fn', 'off', true);

  return v_n;
end;
$$;

-- 7c. Ginti: actual quantity likhein, farq khud movement + record ban jata hai
create or replace function public.record_stock_count(p_counts jsonb, p_note text default null)
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_name  text;
  v_batch text := gen_random_uuid()::text;
  v_c     jsonb;
  v_inv   public.inventory%rowtype;
  v_act   numeric(12,2);
  v_fixed int := 0;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ginti likh sakta hai';
  end if;
  if p_counts is null or jsonb_typeof(p_counts) <> 'array' or jsonb_array_length(p_counts) = 0 then
    raise exception 'Koi ginti nahi';
  end if;

  select full_name into v_name from public.staff_profiles where id = v_uid;

  perform set_config('app.stock_fn', 'on', true);
  for v_c in select * from jsonb_array_elements(p_counts) loop
    if coalesce(v_c ->> 'actual', '') = '' then continue; end if; -- khali = ginti nahi hui
    v_act := round((v_c ->> 'actual')::numeric, 2);
    if v_act < 0 then raise exception 'Ginti manfi nahi ho sakti'; end if;

    select * into v_inv from public.inventory where id = (v_c ->> 'inventory_id')::uuid for update;
    if not found then raise exception 'Item nahi mila'; end if;

    insert into public.stock_counts
      (count_batch, counted_on, inventory_id, expected, actual, note, counted_by, counted_by_name)
    values
      (v_batch, v_today, v_inv.id, v_inv.quantity, v_act, nullif(btrim(coalesce(p_note, '')), ''), v_uid, v_name);

    if v_act <> v_inv.quantity then
      update public.inventory set quantity = v_act, last_updated = now() where id = v_inv.id;
      insert into public.inventory_movements
        (inventory_id, kind, qty_change, qty_after, batch_key, note, created_by, created_by_name)
      values
        (v_inv.id, 'count_correction', v_act - v_inv.quantity, v_act, v_batch,
         'Ginti: system ' || v_inv.quantity || ', asal ' || v_act, v_uid, v_name);
      v_fixed := v_fixed + 1;
    end if;
  end loop;
  perform set_config('app.stock_fn', 'off', true);

  return v_fixed;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'record_purchase(uuid,numeric,numeric,text,text,date,text,text,text)',
    'record_usage(jsonb,uuid,uuid,text,text)',
    'record_stock_count(jsonb,text)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 8. Audit (agar Phase 2 lagi hui hai)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  if to_regprocedure('public.audit_row_change()') is not null then
    foreach t in array array['treatment_materials']
    loop
      execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
      execute format(
        'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.audit_row_change()', t);
    end loop;
  end if;
end $$;

-- =====================================================================
-- PHASE 2: AUDIT LOG + ROLE PERMISSIONS
-- Al Shifa Health Care
--
-- Ye script SIRF naya cheezein jodta hai aur access tang karta hai.
-- Koi purana row, column ya table delete/badla nahi jata.
-- Dobara chalane se koi nuqsan nahi (idempotent).
--
-- PEHLE test (staging) project par chalayein, phir live par.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper: owner = admin ya doctor (reception nahi)
-- ---------------------------------------------------------------------
create or replace function public.is_owner()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid() and is_active = true and role in ('admin', 'doctor')
  );
$$;

-- ---------------------------------------------------------------------
-- 2. AUDIT LOG table (sirf insert hoti hai, edit/delete mumkin nahi)
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  actor_id       uuid,
  actor_name     text,
  actor_role     text,
  action         text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name     text not null,
  record_id      text,
  patient_id     uuid,
  changed_fields text[],
  old_data       jsonb,
  new_data       jsonb
);

create index if not exists idx_audit_created  on public.audit_log (created_at desc);
create index if not exists idx_audit_table    on public.audit_log (table_name, created_at desc);
create index if not exists idx_audit_patient  on public.audit_log (patient_id) where patient_id is not null;

alter table public.audit_log enable row level security;

drop policy if exists "admin_read_audit" on public.audit_log;
create policy "admin_read_audit" on public.audit_log
  for select using (public.has_role('admin'));

-- Koi logged-in ya anonymous user is table mein direct likh/badal nahi sakta
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- Aakhri hifazat: service key ya SQL editor se bhi update/delete na ho
create or replace function public.audit_log_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log mein tabdeeli ya delete allowed nahi hai';
end;
$$;

drop trigger if exists trg_audit_log_immutable on public.audit_log;
create trigger trg_audit_log_immutable
  before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- ---------------------------------------------------------------------
-- 3. Audit trigger function
-- Agar audit likhne mein koi masla aaye to asal save kabhi nahi rukta.
-- ---------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_old     jsonb;
  v_new     jsonb;
  v_src     jsonb;
  v_changed text[];
  v_pat     uuid;
  v_name    text;
  v_role    text;
begin
  begin
    if TG_OP = 'INSERT' then
      v_new := to_jsonb(NEW);
    elsif TG_OP = 'UPDATE' then
      v_old := to_jsonb(OLD);
      v_new := to_jsonb(NEW);
      if v_old = v_new then
        return NEW; -- kuch badla hi nahi
      end if;
      select array_agg(k order by k) into v_changed
      from jsonb_object_keys(v_new) as k
      where v_new -> k is distinct from v_old -> k;
    else
      v_old := to_jsonb(OLD);
    end if;

    v_src := coalesce(v_new, v_old);

    if TG_TABLE_NAME = 'patients' then
      v_pat := nullif(v_src ->> 'id', '')::uuid;
    else
      v_pat := nullif(v_src ->> 'patient_id', '')::uuid;
    end if;

    select full_name, role into v_name, v_role
    from public.staff_profiles where id = auth.uid();

    insert into public.audit_log
      (actor_id, actor_name, actor_role, action, table_name, record_id,
       patient_id, changed_fields, old_data, new_data)
    values
      (auth.uid(), v_name, v_role, TG_OP, TG_TABLE_NAME,
       coalesce(v_src ->> 'id', v_src ->> 'key'),
       v_pat, v_changed, v_old, v_new);
  exception when others then
    raise warning 'audit_row_change skipped: %', sqlerrm;
  end;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- Jin tables par audit lagana hai (jo maujood hon sirf wohi)
do $$
declare
  t text;
begin
  foreach t in array array[
    'patients', 'transactions', 'installments', 'treatment_plans',
    'treatment_episodes', 'inventory', 'lab_cases', 'labs',
    'prescriptions', 'staff_profiles', 'treating_doctors'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
      execute format(
        'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.audit_row_change()', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. PAISON WALI TABLES: sirf owner (admin/doctor). Reception ko DB level par bandh.
-- DELETE ki koi policy nahi, yani koi bhi (admin bhi) in tables se row delete
-- nahi kar sakta. Galti sudharne ke liye cancel/void aayega (Phase 3).
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  old_policy text;
begin
  for t, old_policy in
    select * from (values
      ('transactions',       'staff_full_access_transactions'),
      ('treatment_plans',    'staff_all_plans'),
      ('installments',       'staff_all_installments'),
      ('treatment_episodes', 'staff_all_episodes')
    ) as v(t, p)
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', old_policy, t);
      execute format('drop policy if exists %I on public.%I', 'owner_select_' || t, t);
      execute format('drop policy if exists %I on public.%I', 'owner_insert_' || t, t);
      execute format('drop policy if exists %I on public.%I', 'owner_update_' || t, t);
      execute format('create policy %I on public.%I for select using (public.is_owner())', 'owner_select_' || t, t);
      execute format('create policy %I on public.%I for insert with check (public.is_owner())', 'owner_insert_' || t, t);
      execute format('create policy %I on public.%I for update using (public.is_owner()) with check (public.is_owner())', 'owner_update_' || t, t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. PATIENTS: reception delete/restore nahi kar sakti
-- (service key / SQL editor par ye rok nahi lagti, kyunke wahan auth.uid() khali hota hai)
-- ---------------------------------------------------------------------
create or replace function public.guard_patient_soft_delete()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and new.deleted_at is distinct from old.deleted_at
     and not public.is_owner() then
    raise exception 'Patient delete ya restore sirf doctor/admin kar sakta hai';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_patient_soft_delete on public.patients;
create trigger trg_guard_patient_soft_delete
  before update on public.patients
  for each row execute function public.guard_patient_soft_delete();

-- Patients ki hard delete sirf admin (app mein koi hard delete nahi hota)
drop policy if exists "staff_full_access_patients" on public.patients;
drop policy if exists "staff_select_patients" on public.patients;
drop policy if exists "staff_insert_patients" on public.patients;
drop policy if exists "staff_update_patients" on public.patients;
drop policy if exists "admin_delete_patients" on public.patients;
create policy "staff_select_patients" on public.patients for select using (public.is_staff());
create policy "staff_insert_patients" on public.patients for insert with check (public.is_staff());
create policy "staff_update_patients" on public.patients for update using (public.is_staff()) with check (public.is_staff());
create policy "admin_delete_patients" on public.patients for delete using (public.has_role('admin'));

-- ---------------------------------------------------------------------
-- 6. Jaanch: ye select chala kar dekh lein, kuch bhi delete/badla nahi hota
-- ---------------------------------------------------------------------
-- select tablename, policyname, cmd from pg_policies
--  where tablename in ('transactions','treatment_plans','installments','treatment_episodes','patients','audit_log')
--  order by tablename, cmd;

create table if not exists public.patient_archive_cards (
  patient_id uuid primary key references public.patients(id) on delete cascade,
  mr_number text,
  full_name text,
  first_visit date,
  last_visit date,
  visits integer not null default 0,
  treatments jsonb not null default '[]'::jsonb,
  total_billed numeric not null default 0,
  total_paid numeric not null default 0,
  with_money boolean not null default false,
  removed jsonb not null default '{}'::jsonb,
  archived_at timestamptz not null default now(),
  archived_by uuid
);

alter table public.patient_archive_cards enable row level security;

drop policy if exists archive_cards_select on public.patient_archive_cards;
create policy archive_cards_select on public.patient_archive_cards for select to authenticated using ((select public.has_perm('clinical.view')));

grant select on public.patient_archive_cards to authenticated;

create or replace function public.audit_log_immutable()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('app.archive_mode', true), '') = '1' then
    return old;
  end if;
  raise exception 'audit_log mein tabdeeli ya delete allowed nahi hai';
end;
$$;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
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
  if coalesce(current_setting('app.archive_mode', true), '') = '1' then
    if TG_OP = 'DELETE' then
      return OLD;
    end if;
    return NEW;
  end if;
  begin
    if TG_OP = 'INSERT' then
      v_new := to_jsonb(NEW);
    elsif TG_OP = 'UPDATE' then
      v_old := to_jsonb(OLD);
      v_new := to_jsonb(NEW);
      if v_old = v_new then
        return NEW;
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

create or replace function public.db_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tables jsonb;
begin
  if auth.uid() is null or not public.is_owner() then
    raise exception 'Ye kaam sirf doctor/admin kar sakta hai';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'bytes', t.bytes) order by t.bytes desc), '[]'::jsonb)
    into v_tables
  from (
    select c.relname::text as name, pg_total_relation_size(c.oid) as bytes
    from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    order by pg_total_relation_size(c.oid) desc
    limit 8
  ) t;
  return jsonb_build_object('db_bytes', pg_database_size(current_database()), 'tables', v_tables);
end $$;

create or replace function public._archive_eligible(p_before date)
returns table(patient_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.patients p
  where p.deleted_at is null
    and greatest(
      p.created_at::date,
      coalesce((select max(v.visit_date)::date from public.clinical_visits v where v.patient_id = p.id), date '1900-01-01'),
      coalesce((select max(n.visit_date)::date from public.visit_notes n where n.patient_id = p.id), date '1900-01-01'),
      coalesce((select max(i.invoice_date)::date from public.invoices i where i.patient_id = p.id), date '1900-01-01'),
      coalesce((select max(y.paid_on)::date from public.payments y where y.patient_id = p.id), date '1900-01-01'),
      coalesce((select max(x.transaction_date)::date from public.transactions x where x.patient_id = p.id), date '1900-01-01'),
      coalesce((select max(r.prescribed_date)::date from public.prescriptions r where r.patient_id = p.id), date '1900-01-01'),
      coalesce((select max(a.preferred_date)::date from public.appointments a where a.patient_id = p.id), date '1900-01-01')
    ) < p_before
    and coalesce((select b.balance from public.patient_balances b where b.patient_id = p.id), 0) <= 0
    and not exists (select 1 from public.patient_treatments t where t.patient_id = p.id and t.status in ('active', 'planned'))
    and not exists (select 1 from public.lab_cases l where l.patient_id = p.id and l.deleted_at is null and l.status in ('pending', 'sent', 'in_progress', 'remake'))
    and not exists (select 1 from public.appointments a where a.patient_id = p.id and a.deleted_at is null and a.status in ('pending', 'confirmed') and a.preferred_date >= current_date)
    and (
      exists (select 1 from public.clinical_visits v where v.patient_id = p.id)
      or exists (select 1 from public.visit_notes n where n.patient_id = p.id)
      or exists (select 1 from public.prescriptions r where r.patient_id = p.id)
      or exists (select 1 from public.patient_photos f where f.patient_id = p.id)
      or exists (select 1 from public.dental_chart d where d.patient_id = p.id)
    )
$$;

revoke all on function public._archive_eligible(date) from public;

create or replace function public.archive_preview(p_before date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  if auth.uid() is null or not public.is_owner() then
    raise exception 'Ye kaam sirf doctor/admin kar sakta hai';
  end if;
  select coalesce(array_agg(patient_id), '{}') into v_ids from public._archive_eligible(p_before);
  return jsonb_build_object(
    'patients', coalesce(array_length(v_ids, 1), 0),
    'visits', (select count(*) from public.clinical_visits where patient_id = any(v_ids)),
    'notes', (select count(*) from public.visit_notes where patient_id = any(v_ids)),
    'prescriptions', (select count(*) from public.prescriptions where patient_id = any(v_ids)),
    'photos', (select count(*) from public.patient_photos where patient_id = any(v_ids)),
    'charts', (select count(*) from public.dental_chart where patient_id = any(v_ids)),
    'invoices', (select count(*) from public.invoices where patient_id = any(v_ids)),
    'payments', (select count(*) from public.payments where patient_id = any(v_ids))
  );
end $$;

create or replace function public._archive_one(p_id uuid, p_include_money boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.patients%rowtype;
  v_inv uuid[];
  v_paths jsonb;
  v_first date; v_last date; v_visits int; v_notes int;
  v_treat jsonb;
  v_billed numeric; v_paid numeric;
  v_rx int; v_ph int; v_ch int;
begin
  select * into v_p from public.patients where id = p_id for update;
  if not found then return '[]'::jsonb; end if;

  perform set_config('app.archive_mode', '1', true);
  if p_include_money then
    perform set_config('app.purge_patient', p_id::text, true);
  end if;

  select min(visit_date)::date, max(visit_date)::date, count(*) into v_first, v_last, v_visits from public.clinical_visits where patient_id = p_id;
  select count(*) into v_notes from public.visit_notes where patient_id = p_id;
  if v_notes > v_visits then
    select least(v_first, min(visit_date)::date), greatest(v_last, max(visit_date)::date) into v_first, v_last from public.visit_notes where patient_id = p_id;
    v_visits := v_notes;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'teeth', teeth, 'price', price, 'status', status, 'on', coalesce(completed_on, started_on)) order by coalesce(started_on, created_at::date)), '[]'::jsonb)
    into v_treat from public.patient_treatments where patient_id = p_id;
  select coalesce(b.total_charges, 0), coalesce(b.total_paid, 0) into v_billed, v_paid from public.patient_balances b where b.patient_id = p_id;
  v_billed := coalesce(v_billed, 0); v_paid := coalesce(v_paid, 0);
  select count(*) into v_rx from public.prescriptions where patient_id = p_id;
  select count(*) into v_ph from public.patient_photos where patient_id = p_id;
  select count(*) into v_ch from public.dental_chart where patient_id = p_id;

  insert into public.patient_archive_cards as c (patient_id, mr_number, full_name, first_visit, last_visit, visits, treatments, total_billed, total_paid, with_money, removed, archived_by)
  values (p_id, v_p.mr_number, v_p.full_name, v_first, v_last, v_visits, v_treat, v_billed, v_paid, p_include_money,
          jsonb_build_object('prescriptions', v_rx, 'photos', v_ph, 'chart', v_ch), auth.uid())
  on conflict (patient_id) do update set
    first_visit = least(c.first_visit, excluded.first_visit),
    last_visit = greatest(c.last_visit, excluded.last_visit),
    visits = c.visits + excluded.visits,
    treatments = c.treatments || excluded.treatments,
    total_billed = case when c.with_money then c.total_billed + excluded.total_billed else excluded.total_billed end,
    total_paid = case when c.with_money then c.total_paid + excluded.total_paid else excluded.total_paid end,
    with_money = c.with_money or excluded.with_money,
    removed = jsonb_build_object(
      'prescriptions', coalesce((c.removed ->> 'prescriptions')::int, 0) + v_rx,
      'photos', coalesce((c.removed ->> 'photos')::int, 0) + v_ph,
      'chart', coalesce((c.removed ->> 'chart')::int, 0) + v_ch),
    archived_at = now(),
    archived_by = auth.uid();

  select coalesce(jsonb_agg(storage_path), '[]'::jsonb) into v_paths from public.patient_photos where patient_id = p_id and storage_path is not null;
  select coalesce(array_agg(id), '{}') into v_inv from public.invoices where patient_id = p_id;

  delete from public.share_links where patient_id = p_id;
  delete from public.notify_log where patient_id = p_id;
  delete from public.dental_chart where patient_id = p_id;
  delete from public.patient_photos where patient_id = p_id;
  delete from public.prescriptions where patient_id = p_id;
  update public.clinical_visits set appointment_id = null, invoice_id = null, next_treatment_id = null where patient_id = p_id;
  update public.invoices set clinical_visit_id = null, patient_treatment_id = null where patient_id = p_id;
  delete from public.appointment_history where appointment_id in (select id from public.appointments where patient_id = p_id);
  delete from public.appointments where patient_id = p_id;
  delete from public.treatment_stages where patient_id = p_id;
  delete from public.lab_cases where patient_id = p_id;
  delete from public.visit_notes where patient_id = p_id;
  delete from public.payment_plans where patient_id = p_id;
  delete from public.clinical_visits where patient_id = p_id;
  delete from public.patient_treatments where patient_id = p_id;

  if p_include_money then
    delete from public.discount_log where patient_id = p_id;
    delete from public.transactions where patient_id = p_id or invoice_id = any(v_inv);
    delete from public.payments where patient_id = p_id;
    update public.inventory_movements set patient_id = null, invoice_id = null where patient_id = p_id or invoice_id = any(v_inv);
    delete from public.invoice_items where invoice_id = any(v_inv);
    delete from public.invoices where patient_id = p_id;
  end if;

  delete from public.audit_log
  where patient_id = p_id
    and action <> 'PATIENT_ARCHIVE'
    and (p_include_money or table_name not in ('invoices', 'invoice_items', 'payments', 'transactions', 'patients'));

  insert into public.audit_log (actor_id, actor_name, actor_role, action, table_name, record_id, patient_id, old_data, new_data)
  select auth.uid(), s.full_name, s.role, 'PATIENT_ARCHIVE', 'patients', p_id::text, p_id,
         jsonb_build_object('mr_number', v_p.mr_number, 'full_name', v_p.full_name),
         jsonb_build_object('visits', v_visits, 'with_money', p_include_money)
  from (select 1) x left join public.staff_profiles s on s.id = auth.uid();

  perform set_config('app.archive_mode', '', true);
  perform set_config('app.purge_patient', '', true);

  return v_paths;
end $$;

revoke all on function public._archive_one(uuid, boolean) from public;

create or replace function public.archive_old_data(p_before date, p_confirm text, p_include_money boolean default false, p_limit integer default 25)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_paths jsonb := '[]'::jsonb;
  v_one jsonb;
  v_done int := 0;
  v_left int;
begin
  if auth.uid() is null or not public.is_owner() then
    raise exception 'Ye kaam sirf doctor/admin kar sakta hai';
  end if;
  if upper(btrim(coalesce(p_confirm, ''))) <> 'DELETE' then
    raise exception 'Tasdeeq ke liye DELETE likhein';
  end if;
  if p_before is null or p_before > current_date - 90 then
    raise exception 'Kam az kam 3 mahine purana data hi hataya ja sakta hai';
  end if;
  for v_id in select e.patient_id from public._archive_eligible(p_before) e order by 1 limit greatest(1, least(coalesce(p_limit, 25), 100)) loop
    v_one := public._archive_one(v_id, coalesce(p_include_money, false));
    v_paths := v_paths || v_one;
    v_done := v_done + 1;
  end loop;
  select count(*) into v_left from public._archive_eligible(p_before);
  return jsonb_build_object('done', v_done, 'remaining', v_left, 'photo_paths', v_paths);
end $$;

revoke all on function public.db_usage() from public;
revoke all on function public.archive_preview(date) from public;
revoke all on function public.archive_old_data(date, text, boolean, integer) from public;
grant execute on function public.db_usage() to authenticated;
grant execute on function public.archive_preview(date) to authenticated;
grant execute on function public.archive_old_data(date, text, boolean, integer) to authenticated;

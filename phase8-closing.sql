-- =====================================================================
-- PHASE 8: Din ki closing (cash milana)
-- Pehle test/staging project par chalayein. Dobara chalane se koi nuqsan nahi.
-- Pehle phase2..7 chal chuki honi chahiye.
-- =====================================================================

-- 1. Din ki closing (ek tareekh = ek closing, kabhi edit/delete nahi)
create table if not exists public.day_closings (
  id              uuid primary key default gen_random_uuid(),
  close_date      date not null unique,
  opening_cash    numeric(12,2) not null default 0,
  cash_in         numeric(12,2) not null default 0,
  cash_out        numeric(12,2) not null default 0,
  expected_cash   numeric(12,2) not null,
  counted_cash    numeric(12,2) not null check (counted_cash >= 0),
  difference      numeric(12,2) generated always as (counted_cash - expected_cash) stored,
  other_in        numeric(12,2) not null default 0,   -- bank/easypaisa/jazzcash ki aamdani (sirf record)
  other_out       numeric(12,2) not null default 0,
  note            text,
  closed_by       uuid,
  closed_by_name  text,
  closed_at       timestamptz not null default now()
);

create or replace function public.day_closings_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Closing mein tabdeeli ya delete allowed nahi hai';
end;
$$;
drop trigger if exists trg_day_closings_immutable on public.day_closings;
create trigger trg_day_closings_immutable
  before update or delete on public.day_closings
  for each row execute function public.day_closings_immutable();

alter table public.day_closings enable row level security;
drop policy if exists owner_select_day_closings on public.day_closings;
create policy owner_select_day_closings on public.day_closings for select using (public.is_owner());
revoke all on public.day_closings from anon;
revoke insert, update, delete, truncate on public.day_closings from authenticated;
grant select on public.day_closings to authenticated;

-- 2. Aaj ka hisaab (cash kitna aaya/gaya, kitna hona chahiye)
create or replace function public.day_summary(p_date date default null)
returns jsonb
language plpgsql stable security invoker
set search_path = public
as $$
declare
  v_date date := coalesce(p_date, (now() at time zone 'Asia/Karachi')::date);
  v_open numeric(12,2);
  v_in numeric(12,2); v_out numeric(12,2); v_oin numeric(12,2); v_oout numeric(12,2);
  v_inv_n int; v_inv_total numeric(12,2);
  v_closed public.day_closings%rowtype;
  v_late int := 0;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin'; end if;

  -- Opening = pichli closing ka ginti shuda cash (pehli dafa 0)
  select counted_cash into v_open from public.day_closings
   where close_date < v_date order by close_date desc limit 1;
  v_open := coalesce(v_open, 0);

  select coalesce(sum(amount) filter (where type = 'income'  and coalesce(payment_method,'cash') = 'cash'), 0),
         coalesce(sum(amount) filter (where type = 'expense' and coalesce(payment_method,'cash') = 'cash'), 0),
         coalesce(sum(amount) filter (where type = 'income'  and coalesce(payment_method,'cash') <> 'cash'), 0),
         coalesce(sum(amount) filter (where type = 'expense' and coalesce(payment_method,'cash') <> 'cash'), 0)
    into v_in, v_out, v_oin, v_oout
    from public.transactions where transaction_date = v_date;

  select count(*), coalesce(sum(total), 0) into v_inv_n, v_inv_total
    from public.invoices where invoice_date = v_date and status <> 'void';

  select * into v_closed from public.day_closings where close_date = v_date;
  if v_closed.id is not null then
    select count(*) into v_late from public.transactions
     where transaction_date = v_date and created_at > v_closed.closed_at;
  end if;

  return jsonb_build_object(
    'date', v_date,
    'opening_cash', v_open,
    'cash_in', v_in, 'cash_out', v_out,
    'expected_cash', v_open + v_in - v_out,
    'other_in', v_oin, 'other_out', v_oout,
    'invoices_count', v_inv_n, 'invoices_total', v_inv_total,
    'closed', v_closed.id is not null,
    'counted_cash', v_closed.counted_cash,
    'difference', v_closed.difference,
    'closed_at', v_closed.closed_at,
    'late_entries', v_late
  );
end;
$$;

-- 3. Din band karna (cash gin kar likhein)
create or replace function public.close_day(p_date date, p_counted_cash numeric, p_note text default null)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_s jsonb;
  v_id uuid;
  v_name text;
  v_diff numeric;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin din band kar sakta hai'; end if;
  if p_date is null then raise exception 'Tareekh zaroori hai'; end if;
  if p_date > v_today then raise exception 'Aane wale din ki closing nahi ho sakti'; end if;
  if p_counted_cash is null or p_counted_cash < 0 then raise exception 'Ginti shuda cash ghalat hai'; end if;
  if exists (select 1 from public.day_closings where close_date = p_date) then
    raise exception 'Is din ki closing pehle ho chuki hai';
  end if;

  v_s := public.day_summary(p_date);  -- invoker, par yahan owner hi hai
  v_diff := round(p_counted_cash,2) - (v_s->>'expected_cash')::numeric;
  if v_diff <> 0 and (p_note is null or btrim(p_note) = '') then
    raise exception 'Cash mein farq hai (Rs. %). Wajah note mein likhna zaroori hai', v_diff;
  end if;

  select full_name into v_name from public.staff_profiles where id = auth.uid();

  insert into public.day_closings
    (close_date, opening_cash, cash_in, cash_out, expected_cash, counted_cash, other_in, other_out, note, closed_by, closed_by_name)
  values
    (p_date, (v_s->>'opening_cash')::numeric, (v_s->>'cash_in')::numeric, (v_s->>'cash_out')::numeric,
     (v_s->>'expected_cash')::numeric, round(p_counted_cash,2),
     (v_s->>'other_in')::numeric, (v_s->>'other_out')::numeric,
     nullif(btrim(p_note), ''), auth.uid(), v_name)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.day_summary(date) from public, anon;
revoke execute on function public.close_day(date, numeric, text) from public, anon;
grant execute on function public.day_summary(date) to authenticated;
grant execute on function public.close_day(date, numeric, text) to authenticated;

-- 4. Audit
do $$
begin
  if to_regprocedure('public.audit_row_change()') is not null then
    drop trigger if exists trg_audit_day_closings on public.day_closings;
    create trigger trg_audit_day_closings after insert on public.day_closings
      for each row execute function public.audit_row_change();
  end if;
end $$;

-- 5. Report (database mein hi hisaab, taake 1000 rows ki hadd na lage)
create or replace function public.report_summary(p_from date, p_to date)
returns jsonb
language plpgsql stable security invoker
set search_path = public
as $$
declare r jsonb;
begin
  if not public.is_owner() then raise exception 'Sirf doctor/admin'; end if;
  if p_from is null or p_to is null or p_from > p_to then raise exception 'Tareekh ghalat hai'; end if;
  if p_to - p_from > 800 then raise exception 'Itni lambi muddat nahi, 2 saal tak chunein'; end if;

  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'income',  coalesce((select sum(amount) from public.transactions where type='income'  and transaction_date between p_from and p_to), 0),
    'expense', coalesce((select sum(amount) from public.transactions where type='expense' and transaction_date between p_from and p_to), 0),
    'income_by_method', coalesce((select jsonb_object_agg(m, s) from (
        select coalesce(payment_method,'cash') m, sum(amount) s from public.transactions
         where type='income' and transaction_date between p_from and p_to group by 1) x), '{}'::jsonb),
    'income_by_doctor', coalesce((select jsonb_object_agg(d, s) from (
        select coalesce(nullif(btrim(treating_doctor),''),'Naam nahi likha') d, sum(amount) s from public.transactions
         where type='income' and transaction_date between p_from and p_to group by 1) x), '{}'::jsonb),
    'expense_by_category', coalesce((select jsonb_object_agg(c, s) from (
        select initcap(lower(coalesce(nullif(btrim(category),''),'Other'))) c, sum(amount) s from public.transactions
         where type='expense' and transaction_date between p_from and p_to group by 1) x), '{}'::jsonb),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('date', d, 'income', i, 'expense', e) order by d) from (
        select transaction_date d,
               sum(amount) filter (where type='income') i,
               sum(amount) filter (where type='expense') e
          from public.transactions where transaction_date between p_from and p_to group by 1) x), '[]'::jsonb),
    'invoices_count', (select count(*) from public.invoices where invoice_date between p_from and p_to and status <> 'void'),
    'invoices_total', coalesce((select sum(total) from public.invoices where invoice_date between p_from and p_to and status <> 'void'), 0),
    'new_patients', (select count(*) from public.patients where created_at >= p_from::timestamptz and created_at < (p_to + 1)::timestamptz and deleted_at is null)
  ) into r;
  return r;
end;
$$;
revoke execute on function public.report_summary(date, date) from public, anon;
grant execute on function public.report_summary(date, date) to authenticated;

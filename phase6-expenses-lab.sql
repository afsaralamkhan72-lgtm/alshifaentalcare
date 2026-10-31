-- =====================================================================
-- PHASE 6: EXPENSES (categories, chhoti kharchian) + LAB FLOW (2 step) + LAB KHARCHA
-- Al Shifa Health Care
--
-- SIRF naya jodta hai. Purani transactions / lab cases ka koi row nahi badalta.
-- Dobara chalane se koi nuqsan nahi.
-- Pehle phase2, phase3 aur phase5 chali honi chahiye (phase5 "source" column bhi jorta hai).
-- PEHLE test (staging) project par chalayein.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Naye khali columns
-- ---------------------------------------------------------------------
alter table public.transactions add column if not exists source text;
alter table public.transactions add column if not exists idempotency_key text;
create unique index if not exists uq_transactions_idem
  on public.transactions (idempotency_key) where idempotency_key is not null;

alter table public.lab_cases add column if not exists lab_paid   numeric(12,2) not null default 0;
alter table public.lab_cases add column if not exists received_at timestamptz;

-- ---------------------------------------------------------------------
-- 2. Kharche ki categories (doctor khud badal sakta hai)
-- ---------------------------------------------------------------------
create table if not exists public.expense_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_expense_category_name
  on public.expense_categories (lower(btrim(name)));

insert into public.expense_categories (name, sort_order) values
  ('Rent', 10), ('Salary', 20), ('Staff Advance', 30), ('Supplies', 40), ('Inventory', 50),
  ('Lab', 60), ('Utilities', 70), ('Maintenance', 80), ('Chai / Chhoti kharchi', 90), ('Other', 100)
on conflict do nothing;

alter table public.expense_categories enable row level security;
drop policy if exists owner_select_expense_categories on public.expense_categories;
drop policy if exists owner_insert_expense_categories on public.expense_categories;
drop policy if exists owner_update_expense_categories on public.expense_categories;
create policy owner_select_expense_categories on public.expense_categories for select using (public.is_owner());
create policy owner_insert_expense_categories on public.expense_categories for insert with check (public.is_owner());
create policy owner_update_expense_categories on public.expense_categories for update using (public.is_owner()) with check (public.is_owner());
revoke all on public.expense_categories from anon;
grant select, insert, update on public.expense_categories to authenticated;
revoke delete, truncate on public.expense_categories from authenticated;

-- ---------------------------------------------------------------------
-- 3. Kharcha likhna (chhota se chhota bhi), dobara click se dohra nahi
-- ---------------------------------------------------------------------
create or replace function public.add_expense(
  p_amount   numeric,
  p_category text,
  p_method   text default 'cash',
  p_note     text default null,
  p_date     date default null,
  p_key      text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_amt   numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_cat   text;
  v_id    uuid;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin kharcha likh sakta hai';
  end if;
  if v_amt <= 0 or v_amt > 100000000 then raise exception 'Raqam ghalat hai'; end if;
  if coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;
  if p_date is not null and p_date > v_today + 1 then
    raise exception 'Aane wali tareekh nahi likh sakte';
  end if;

  select name into v_cat from public.expense_categories
   where lower(btrim(name)) = lower(btrim(coalesce(p_category, ''))) and is_active;
  if v_cat is null then raise exception 'Category list mein nahi hai'; end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('exp:' || p_key));
    select id into v_id from public.transactions where idempotency_key = p_key;
    if found then return v_id; end if;
  end if;

  insert into public.transactions
    (type, category, amount, payment_method, description, transaction_date, recorded_by, idempotency_key)
  values
    ('expense', v_cat, v_amt, p_method, nullif(btrim(coalesce(p_note, '')), ''),
     coalesce(p_date, v_today), auth.uid(), p_key)
  returning id into v_id;
  return v_id;
end;
$$;

-- Galat kharcha cancel (delete nahi): raqam 0 ho jati hai, wajah likhi jati hai,
-- purani raqam audit log mein mehfooz rehti hai. System ki banayi hui entries yahan se nahi.
create or replace function public.void_expense(p_tx_id uuid, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare v_tx public.transactions%rowtype;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin kharcha cancel kar sakta hai';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then raise exception 'Wajah likhna zaroori hai'; end if;

  select * into v_tx from public.transactions where id = p_tx_id for update;
  if not found or v_tx.type <> 'expense' then raise exception 'Kharcha nahi mila'; end if;
  if v_tx.source is not null then
    raise exception 'Ye entry % ne banayi hai, wahin se theek karein', v_tx.source;
  end if;
  if v_tx.amount = 0 then return; end if;

  update public.transactions
     set amount = 0,
         description = coalesce(description, '') || ' [CANCEL Rs. ' || v_tx.amount || ': ' || btrim(p_reason) || ']'
   where id = p_tx_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. LAB: kharcha aur paise seedha badalne se rokna (sirf functions se)
-- ---------------------------------------------------------------------
create or replace function public.guard_lab_money()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.lab_fn', true), '') <> 'on' then
    if TG_OP = 'INSERT' and new.lab_paid <> 0 then
      raise exception 'Lab ki payment seedha nahi likh sakte';
    elsif TG_OP = 'UPDATE' and (new.lab_paid is distinct from old.lab_paid
                                or new.cost is distinct from old.cost) then
      raise exception 'Lab ka kharcha "Lab se wapas aa gaya" ya "Lab ko payment" se likhein';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_lab_money on public.lab_cases;
create trigger trg_guard_lab_money
  before insert or update on public.lab_cases
  for each row execute function public.guard_lab_money();

-- ---------------------------------------------------------------------
-- 5. LAB STEP 2: "Lab se wapas aa gaya": aik hi entry mein status, asal kharcha, aur (agar di) payment
-- ---------------------------------------------------------------------
create or replace function public.receive_lab_case(
  p_case_id uuid,
  p_cost    numeric,
  p_paid    numeric default 0,
  p_method  text    default 'cash',
  p_note    text    default null,
  p_key     text    default null
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_c     public.lab_cases%rowtype;
  v_cost  numeric(12,2) := round(coalesce(p_cost, 0), 2);
  v_paid  numeric(12,2) := round(coalesce(p_paid, 0), 2);
  v_pname text;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;
  if v_cost < 0 then raise exception 'Lab ka kharcha ghalat hai'; end if;
  if v_paid < 0 or v_paid > v_cost then raise exception 'Di hui raqam lab ke kharche se zyada nahi ho sakti'; end if;
  if v_paid > 0 and coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('lab:' || p_key));
    if exists (select 1 from public.transactions where idempotency_key = p_key) then return; end if;
  end if;

  select * into v_c from public.lab_cases where id = p_case_id and deleted_at is null for update;
  if not found then raise exception 'Lab case nahi mila'; end if;
  if v_c.received_at is not null then raise exception 'Ye case pehle hi "wapas aa gaya" likha ja chuka hai'; end if;
  select full_name into v_pname from public.patients where id = v_c.patient_id;

  perform set_config('app.lab_fn', 'on', true);
  update public.lab_cases
     set status = 'received', delivered_date = v_today, received_at = now(),
         cost = v_cost, lab_paid = v_paid, updated_at = now()
   where id = p_case_id;

  if v_paid > 0 then
    insert into public.transactions
      (type, category, amount, payment_method, description, transaction_date, recorded_by, source, idempotency_key)
    values
      ('expense', 'Lab', v_paid, p_method,
       'Lab ' || coalesce(v_c.case_number, '') || ': ' || v_c.lab_name || coalesce(' (' || v_pname || ')', '') ||
         coalesce(' - ' || nullif(btrim(coalesce(p_note, '')), ''), ''),
       v_today, auth.uid(), 'lab', p_key);
  elsif p_key is not null then
    -- payment nahi di: dobara bhejne ki pehchan ke liye kuch likhne ki zaroorat nahi, received_at hi guard hai
    null;
  end if;
  perform set_config('app.lab_fn', 'off', true);
end;
$$;

-- Baad mein lab ko baqaya dena
create or replace function public.pay_lab_case(
  p_case_id uuid,
  p_amount  numeric,
  p_method  text default 'cash',
  p_key     text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_c     public.lab_cases%rowtype;
  v_amt   numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_pname text;
  v_id    uuid;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;
  if v_amt <= 0 then raise exception 'Raqam 0 se zyada honi chahiye'; end if;
  if coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('lab:' || p_key));
    select id into v_id from public.transactions where idempotency_key = p_key;
    if found then return v_id; end if;
  end if;

  select * into v_c from public.lab_cases where id = p_case_id and deleted_at is null for update;
  if not found then raise exception 'Lab case nahi mila'; end if;
  if v_amt > v_c.cost - v_c.lab_paid then
    raise exception 'Raqam lab ke baqaya (Rs. %) se zyada hai', v_c.cost - v_c.lab_paid;
  end if;
  select full_name into v_pname from public.patients where id = v_c.patient_id;

  perform set_config('app.lab_fn', 'on', true);
  update public.lab_cases set lab_paid = lab_paid + v_amt, updated_at = now() where id = p_case_id;
  insert into public.transactions
    (type, category, amount, payment_method, description, transaction_date, recorded_by, source, idempotency_key)
  values
    ('expense', 'Lab', v_amt, p_method,
     'Lab ' || coalesce(v_c.case_number, '') || ': ' || v_c.lab_name || coalesce(' (' || v_pname || ')', '') || ' - baqaya payment',
     v_today, auth.uid(), 'lab', p_key)
  returning id into v_id;
  perform set_config('app.lab_fn', 'off', true);
  return v_id;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'add_expense(numeric,text,text,text,date,text)',
    'void_expense(uuid,text)',
    'receive_lab_case(uuid,numeric,numeric,text,text,text)',
    'pay_lab_case(uuid,numeric,text,text)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. Audit
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  if to_regprocedure('public.audit_row_change()') is not null then
    foreach t in array array['expense_categories']
    loop
      execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
      execute format(
        'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.audit_row_change()', t);
    end loop;
  end if;
end $$;

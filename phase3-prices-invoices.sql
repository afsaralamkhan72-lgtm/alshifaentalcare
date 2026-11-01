-- =====================================================================
-- PHASE 3: TREATMENT PRICE LIST + AUTO INVOICE
-- Al Shifa Health Care
--
-- SIRF naya jodta hai. Purani tables ka koi row, naam ya hisaab nahi badalta.
-- Sirf transactions mein ek khali (null) column "invoice_id" jorta hai.
-- Dobara chalane se koi nuqsan nahi.
--
-- Pehle phase2-audit-permissions.sql chali honi chahiye.
-- PEHLE test (staging) project par chalayein.
--
-- Naya invoice purane hisaab ke saath compatible rehta hai: har naya invoice /
-- payment saath saath transactions mein bhi purane andaaz mein likha jata hai,
-- isliye dashboard, reports aur baqaya list sahi chalti rahti hain.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Purani transactions se jorne ke liye ek khali column
-- ---------------------------------------------------------------------
alter table public.transactions add column if not exists invoice_id uuid;
create index if not exists idx_transactions_invoice
  on public.transactions (invoice_id) where invoice_id is not null;

-- ---------------------------------------------------------------------
-- 2. TREATMENT PRICE LIST (doctor ki fixed qeematein)
-- ---------------------------------------------------------------------
create table if not exists public.treatment_catalog (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  department  text check (department in ('dental', 'homeopathic', 'general')),
  price       numeric(12,2) not null check (price >= 0),
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists uq_catalog_name
  on public.treatment_catalog (lower(btrim(name)));

-- Qeemat ki poori history (kab, kis ne, purani, nayi)
create table if not exists public.treatment_price_history (
  id              bigint generated always as identity primary key,
  treatment_id    uuid not null references public.treatment_catalog(id),
  old_price       numeric(12,2),
  new_price       numeric(12,2) not null,
  changed_by      uuid,
  changed_by_name text,
  changed_at      timestamptz not null default now()
);
create index if not exists idx_price_history_treatment
  on public.treatment_price_history (treatment_id, changed_at desc);

create or replace function public.log_price_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare v_name text;
begin
  if TG_OP = 'UPDATE' and new.price is not distinct from old.price then
    new.updated_at := now();
    return new;
  end if;
  select full_name into v_name from public.staff_profiles where id = auth.uid();
  insert into public.treatment_price_history (treatment_id, old_price, new_price, changed_by, changed_by_name)
  values (new.id, case when TG_OP = 'UPDATE' then old.price end, new.price, auth.uid(), v_name);
  new.updated_at := now();
  return new;
end;
$$;

-- AFTER INSERT ke liye alag, BEFORE UPDATE ke liye alag (updated_at set karna hai)
drop trigger if exists trg_price_history_ins on public.treatment_catalog;
create trigger trg_price_history_ins
  after insert on public.treatment_catalog
  for each row execute function public.log_price_change();

create or replace function public.log_price_change_upd()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare v_name text;
begin
  new.updated_at := now();
  if new.price is distinct from old.price then
    select full_name into v_name from public.staff_profiles where id = auth.uid();
    insert into public.treatment_price_history (treatment_id, old_price, new_price, changed_by, changed_by_name)
    values (new.id, old.price, new.price, auth.uid(), v_name);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_price_history_upd on public.treatment_catalog;
create trigger trg_price_history_upd
  before update on public.treatment_catalog
  for each row execute function public.log_price_change_upd();

-- ---------------------------------------------------------------------
-- 3. INVOICE NUMBER counter (AS-INV-1001 se shuru, badla ja sakta hai)
-- ---------------------------------------------------------------------
create table if not exists public.invoice_counter (
  id       int primary key check (id = 1),
  prefix   text not null default 'AS-INV-',
  next_no  int not null default 1001 check (next_no > 0)
);
insert into public.invoice_counter (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 4. INVOICES, ITEMS, PAYMENTS
-- ---------------------------------------------------------------------
create table if not exists public.invoices (
  id               uuid primary key default gen_random_uuid(),
  invoice_number   text not null unique,
  patient_id       uuid not null references public.patients(id),
  invoice_date     date not null,
  treating_doctor  text,
  subtotal         numeric(12,2) not null check (subtotal >= 0),
  discount_percent numeric(5,2)  not null default 0 check (discount_percent between 0 and 100),
  discount_amount  numeric(12,2) not null default 0 check (discount_amount >= 0),
  total            numeric(12,2) not null check (total >= 0),
  paid_amount      numeric(12,2) not null default 0 check (paid_amount >= 0),
  balance          numeric(12,2) generated always as
                     (case when status = 'void' then 0 else total - paid_amount end) stored,
  due_date         date,
  status           text not null default 'active' check (status in ('active', 'void')),
  notes            text,
  idempotency_key  text unique,
  mirror_tx_id     uuid,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  voided_at        timestamptz,
  voided_by        uuid,
  void_reason      text,
  check (total = subtotal - discount_amount),
  check (paid_amount <= total)
);
create index if not exists idx_invoices_patient on public.invoices (patient_id, invoice_date desc);
create index if not exists idx_invoices_date    on public.invoices (invoice_date desc);

create table if not exists public.invoice_items (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices(id),
  treatment_id  uuid references public.treatment_catalog(id),
  name          text not null,
  tooth         text,
  qty           int  not null check (qty > 0),
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  line_total    numeric(12,2) not null check (line_total >= 0)
);
create index if not exists idx_invoice_items_invoice on public.invoice_items (invoice_id);

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  invoice_id          uuid not null references public.invoices(id),
  patient_id          uuid not null references public.patients(id),
  kind                text not null check (kind in ('payment', 'refund')),
  amount              numeric(12,2) not null check (amount > 0),
  method              text check (method in ('cash', 'bank', 'easypaisa', 'jazzcash')),
  paid_on             date not null,
  note                text,
  reverses_payment_id uuid unique references public.payments(id),
  mirror_tx_id        uuid,
  idempotency_key     text unique,
  received_by         uuid,
  created_at          timestamptz not null default now()
);
create index if not exists idx_payments_invoice on public.payments (invoice_id);
create index if not exists idx_payments_patient on public.payments (patient_id, paid_on desc);

-- transactions.invoice_id ab invoices se jur sakta hai
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_transactions_invoice') then
    alter table public.transactions
      add constraint fk_transactions_invoice foreign key (invoice_id) references public.invoices(id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY: sirf owner (admin/doctor). Delete kisi ko nahi.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'treatment_catalog', 'treatment_price_history', 'invoice_counter',
    'invoices', 'invoice_items', 'payments'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'owner_select_' || t, t);
    execute format('create policy %I on public.%I for select using (public.is_owner())', 'owner_select_' || t, t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke delete, truncate on public.%I from authenticated', t);
  end loop;

  foreach t in array array['treatment_catalog', 'invoices', 'invoice_items', 'payments']
  loop
    execute format('drop policy if exists %I on public.%I', 'owner_insert_' || t, t);
    execute format('create policy %I on public.%I for insert with check (public.is_owner())', 'owner_insert_' || t, t);
  end loop;

  foreach t in array array['treatment_catalog', 'invoices', 'invoice_counter']
  loop
    execute format('drop policy if exists %I on public.%I', 'owner_update_' || t, t);
    execute format('create policy %I on public.%I for update using (public.is_owner()) with check (public.is_owner())', 'owner_update_' || t, t);
  end loop;
end $$;

-- Explicit grants (RLS phir bhi sirf owner ko ijazat deti hai)
grant select on public.treatment_catalog, public.treatment_price_history, public.invoice_counter,
                public.invoices, public.invoice_items, public.payments to authenticated;
grant insert, update on public.treatment_catalog, public.invoices to authenticated;
grant update on public.invoice_counter to authenticated;
grant insert on public.invoice_items, public.payments to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Payments aur invoice items ko seedha update karne ki ijazat nahi (sirf functions se)
revoke update on public.payments, public.invoice_items, public.treatment_price_history from authenticated;

-- ---------------------------------------------------------------------
-- 6. Invoice se juri transactions ko seedha badalne se rokna
-- (sirf neeche ke functions badal sakte hain; SQL editor / service key par rok nahi)
-- ---------------------------------------------------------------------
create or replace function public.guard_invoice_transactions()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('app.invoice_fn', true), '') <> 'on'
     and ((TG_OP = 'UPDATE' and old.invoice_id is not null)
          or (TG_OP = 'INSERT' and new.invoice_id is not null)) then
    raise exception 'Ye entry invoice se juri hai. Tabdeeli invoice page se karein.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_invoice_transactions on public.transactions;
create trigger trg_guard_invoice_transactions
  before insert or update on public.transactions
  for each row execute function public.guard_invoice_transactions();


-- Invoice ki raqam/status/paid seedha (API se) badalna band: sirf upar ke functions (payment/refund/cancel) badal sakte hain.
-- Notes / treating_doctor / due_date seedha badal sakte hain.
create or replace function public.guard_invoice_row()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('app.invoice_row_fn', true), '') <> 'on'
     and (new.invoice_number, new.patient_id, new.invoice_date, new.subtotal, new.discount_percent,
          new.discount_amount, new.total, new.paid_amount, new.status, new.mirror_tx_id, new.voided_at,
          new.voided_by, new.void_reason, new.idempotency_key, new.created_by)
         is distinct from
         (old.invoice_number, old.patient_id, old.invoice_date, old.subtotal, old.discount_percent,
          old.discount_amount, old.total, old.paid_amount, old.status, old.mirror_tx_id, old.voided_at,
          old.voided_by, old.void_reason, old.idempotency_key, old.created_by) then
    raise exception 'Invoice ki raqam ya status seedha badalna allowed nahi. Payment / Refund / Cancel ke button se karein.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_invoice_row on public.invoices;
create trigger trg_guard_invoice_row
  before update on public.invoices
  for each row execute function public.guard_invoice_row();


-- Naye invoice / invoice-items / payments seedha (API se) insert karna band: sirf upar ke functions se.
create or replace function public.guard_invoice_insert()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.invoice_ins_fn', true), '') <> 'on' then
    raise exception 'Invoice/Payment seedha nahi banti. Invoice page ke button se banayein.';
  end if;
  return new;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['invoices', 'invoice_items', 'payments'] loop
    execute format('drop trigger if exists trg_guard_insert_%1$s on public.%1$s', t);
    execute format('create trigger trg_guard_insert_%1$s before insert on public.%1$s
                    for each row execute function public.guard_invoice_insert()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 7. FUNCTIONS (invoker: RLS lagu rehti hai, audit mein asli user aata hai)
-- ---------------------------------------------------------------------

-- 7a. Naya invoice (aik hi step mein: invoice + items + pehli payment + purana hisaab)
create or replace function public.create_invoice(
  p_patient_id       uuid,
  p_items            jsonb,
  p_discount_percent numeric default 0,
  p_paid             numeric default 0,
  p_method           text    default 'cash',
  p_doctor           text    default null,
  p_due_date         date    default null,
  p_notes            text    default null,
  p_idempotency_key  text    default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_today   date := (now() at time zone 'Asia/Karachi')::date;
  v_inv     uuid;
  v_tx      uuid;
  v_no      text;
  v_prefix  text;
  v_n       int;
  v_sub     numeric(12,2) := 0;
  v_disc    numeric(12,2);
  v_total   numeric(12,2);
  v_bal     numeric(12,2);
  v_item    jsonb;
  v_qty     int;
  v_price   numeric(12,2);
  v_name    text;
  v_names   text[] := '{}';
  v_due     date;
  v_pct     numeric := coalesce(p_discount_percent, 0);
  v_paid    numeric(12,2) := round(coalesce(p_paid, 0), 2);
begin
  perform set_config('app.invoice_ins_fn', 'on', true);  -- naye invoice/payment sirf is function se bante hain
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin invoice bana sakta hai';
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtext('inv:' || p_idempotency_key));
    select id into v_inv from public.invoices where idempotency_key = p_idempotency_key;
    if found then
      return v_inv; -- dobara click / dobara bhejna: wahi purana invoice
    end if;
  end if;

  if not exists (select 1 from public.patients where id = p_patient_id and deleted_at is null) then
    raise exception 'Patient nahi mila';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Kam az kam aik treatment chahiye';
  end if;
  if v_pct < 0 or v_pct > 100 then
    raise exception 'Discount 0 se 100 percent ke beech hona chahiye';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_name  := btrim(coalesce(v_item ->> 'name', ''));
    v_qty   := coalesce(nullif(v_item ->> 'qty', '')::int, 1);
    v_price := round((v_item ->> 'unit_price')::numeric, 2);
    if v_name = '' then raise exception 'Treatment ka naam khali hai'; end if;
    if v_qty < 1 or v_qty > 100 then raise exception 'Qty 1 se 100 ke beech honi chahiye'; end if;
    if v_price is null or v_price < 0 then raise exception 'Qeemat ghalat hai'; end if;
    v_sub := v_sub + v_qty * v_price;
    v_names := v_names || (case when v_qty > 1 then v_name || ' x' || v_qty else v_name end);
  end loop;

  v_disc  := round(v_sub * v_pct / 100, 2);
  v_total := v_sub - v_disc;

  if v_paid < 0 or v_paid > v_total then
    raise exception 'Mili hui raqam 0 se invoice total ke beech honi chahiye';
  end if;
  if v_paid > 0 and coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;

  v_bal := v_total - v_paid;
  v_due := case when v_bal > 0 then coalesce(p_due_date, v_today + 7) end;

  -- Invoice number (update row ko lock karta hai, is liye number kabhi dohra nahi hota)
  update public.invoice_counter set next_no = next_no + 1 where id = 1
    returning prefix, next_no - 1 into v_prefix, v_n;
  v_no := v_prefix || v_n;

  insert into public.invoices
    (invoice_number, patient_id, invoice_date, treating_doctor, subtotal, discount_percent,
     discount_amount, total, paid_amount, due_date, notes, idempotency_key, created_by)
  values
    (v_no, p_patient_id, v_today, nullif(btrim(coalesce(p_doctor, '')), ''), v_sub, v_pct,
     v_disc, v_total, v_paid, v_due, nullif(btrim(coalesce(p_notes, '')), ''),
     p_idempotency_key, v_uid)
  returning id into v_inv;

  insert into public.invoice_items (invoice_id, treatment_id, name, tooth, qty, unit_price, line_total)
  select v_inv,
         nullif(e ->> 'treatment_id', '')::uuid,
         btrim(e ->> 'name'),
         nullif(btrim(coalesce(e ->> 'tooth', '')), ''),
         coalesce(nullif(e ->> 'qty', '')::int, 1),
         round((e ->> 'unit_price')::numeric, 2),
         coalesce(nullif(e ->> 'qty', '')::int, 1) * round((e ->> 'unit_price')::numeric, 2)
  from jsonb_array_elements(p_items) e;

  -- Purane hisaab wali entry (dashboard / reports / baqaya list ke liye)
  perform set_config('app.invoice_fn', 'on', true);
  insert into public.transactions
    (patient_id, type, category, treatment_name, description, rate, discount_amount, discount_pct,
     amount, balance_due, due_date, payment_method, treating_doctor, transaction_date,
     settled_at, recorded_by, invoice_id)
  values
    (p_patient_id, 'income', 'treatment', array_to_string(v_names, ', '), 'Invoice ' || v_no,
     v_sub, v_disc, v_pct, v_paid, v_bal, v_due,
     case when v_paid > 0 then p_method end,
     nullif(btrim(coalesce(p_doctor, '')), ''), v_today,
     case when v_bal = 0 then now() end, v_uid, v_inv)
  returning id into v_tx;
  perform set_config('app.invoice_fn', 'off', true);

  perform set_config('app.invoice_row_fn', 'on', true);
  update public.invoices set mirror_tx_id = v_tx where id = v_inv;
  perform set_config('app.invoice_row_fn', 'off', true);

  if v_paid > 0 then
    insert into public.payments (invoice_id, patient_id, kind, amount, method, paid_on, mirror_tx_id, received_by)
    values (v_inv, p_patient_id, 'payment', v_paid, p_method, v_today, v_tx, v_uid);
  end if;

  return v_inv;
end;
$$;

-- 7b. Baqaya payment lena
create or replace function public.record_payment(
  p_invoice_id      uuid,
  p_amount          numeric,
  p_method          text,
  p_note            text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_inv   public.invoices%rowtype;
  v_bill  public.transactions%rowtype;
  v_amt   numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_tx    uuid;
  v_pay   uuid;
  v_new   numeric(12,2);
begin
  perform set_config('app.invoice_ins_fn', 'on', true);  -- naye invoice/payment sirf is function se bante hain
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin payment le sakta hai';
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtext('pay:' || p_idempotency_key));
    select id into v_pay from public.payments where idempotency_key = p_idempotency_key;
    if found then return v_pay; end if;
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice nahi mila'; end if;
  if v_inv.status <> 'active' then raise exception 'Ye invoice cancel ho chuka hai'; end if;
  if v_amt <= 0 then raise exception 'Raqam 0 se zyada honi chahiye'; end if;
  if v_amt > v_inv.total - v_inv.paid_amount then
    raise exception 'Raqam baqaya (Rs. %) se zyada hai', v_inv.total - v_inv.paid_amount;
  end if;
  if coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;

  select * into v_bill from public.transactions where id = v_inv.mirror_tx_id for update;
  v_new := v_inv.total - (v_inv.paid_amount + v_amt);

  perform set_config('app.invoice_fn', 'on', true);
  insert into public.transactions
    (patient_id, type, category, treatment_name, description, amount, balance_due,
     payment_method, treating_doctor, transaction_date, settled_at, recorded_by, invoice_id)
  values
    (v_inv.patient_id, 'income', 'treatment', coalesce(v_bill.treatment_name, 'Treatment') || ' (baqaya)',
     'Invoice ' || v_inv.invoice_number, v_amt, 0, p_method, v_inv.treating_doctor, v_today,
     now(), v_uid, v_inv.id)
  returning id into v_tx;

  update public.transactions
     set balance_due = v_new,
         settled_at  = case when v_new = 0 then now() else null end
   where id = v_inv.mirror_tx_id;
  perform set_config('app.invoice_fn', 'off', true);

  insert into public.payments
    (invoice_id, patient_id, kind, amount, method, paid_on, note, mirror_tx_id, idempotency_key, received_by)
  values
    (v_inv.id, v_inv.patient_id, 'payment', v_amt, p_method, v_today,
     nullif(btrim(coalesce(p_note, '')), ''), v_tx, p_idempotency_key, v_uid)
  returning id into v_pay;

  perform set_config('app.invoice_row_fn', 'on', true);
  update public.invoices set paid_amount = paid_amount + v_amt where id = v_inv.id;
  perform set_config('app.invoice_row_fn', 'off', true);
  return v_pay;
end;
$$;

-- 7c. Aik payment ko ulta karna (refund entry banti hai, purani payment nahi mitti)
create or replace function public.reverse_payment(p_payment_id uuid, p_reason text)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_pay   public.payments%rowtype;
  v_inv   public.invoices%rowtype;
  v_ref   uuid;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin payment ulta kar sakta hai';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'Wajah likhna zaroori hai';
  end if;

  select * into v_pay from public.payments where id = p_payment_id;
  if not found then raise exception 'Payment nahi mili'; end if;
  if v_pay.kind <> 'payment' then raise exception 'Ye payment nahi, refund entry hai'; end if;
  if exists (select 1 from public.payments where reverses_payment_id = p_payment_id) then
    raise exception 'Ye payment pehle hi ulti ho chuki hai';
  end if;

  select * into v_inv from public.invoices where id = v_pay.invoice_id for update;
  if v_inv.status <> 'active' then raise exception 'Ye invoice cancel ho chuka hai'; end if;

  v_ref := public._reverse_payment_core(v_pay, v_inv, p_reason, v_uid, v_today);
  return v_ref;
end;
$$;

create or replace function public._reverse_payment_core(
  v_pay public.payments, v_inv public.invoices, p_reason text, v_uid uuid, v_today date
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_ref uuid;
begin
  perform set_config('app.invoice_ins_fn', 'on', true);  -- naye invoice/payment sirf is function se bante hain
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;

  perform set_config('app.invoice_fn', 'on', true);
  if v_pay.mirror_tx_id = v_inv.mirror_tx_id then
    -- pehli payment invoice wali entry mein hi likhi gayi thi
    update public.transactions
       set amount = greatest(0, amount - v_pay.amount)
     where id = v_inv.mirror_tx_id;
  else
    update public.transactions
       set amount = 0,
           description = coalesce(description, '') || ' [ULTI: ' || btrim(p_reason) || ']'
     where id = v_pay.mirror_tx_id;
  end if;

  update public.transactions
     set balance_due = balance_due + v_pay.amount,
         settled_at  = null,
         due_date    = coalesce(due_date, v_today + 7)
   where id = v_inv.mirror_tx_id;
  perform set_config('app.invoice_fn', 'off', true);

  insert into public.payments
    (invoice_id, patient_id, kind, amount, method, paid_on, note, reverses_payment_id, received_by)
  values
    (v_pay.invoice_id, v_pay.patient_id, 'refund', v_pay.amount, v_pay.method, v_today,
     btrim(p_reason), v_pay.id, v_uid)
  returning id into v_ref;

  perform set_config('app.invoice_row_fn', 'on', true);
  update public.invoices set paid_amount = paid_amount - v_pay.amount where id = v_inv.id;
  perform set_config('app.invoice_row_fn', 'off', true);
  return v_ref;
end;
$$;

-- 7d. Poora invoice cancel (delete nahi). Mili hui sab payments ulti ho jati hain.
create or replace function public.void_invoice(p_invoice_id uuid, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_inv   public.invoices%rowtype;
  v_pay   public.payments%rowtype;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin invoice cancel kar sakta hai';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'Wajah likhna zaroori hai';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice nahi mila'; end if;
  if v_inv.status = 'void' then return; end if;

  for v_pay in
    select p.* from public.payments p
    where p.invoice_id = p_invoice_id and p.kind = 'payment'
      and not exists (select 1 from public.payments r where r.reverses_payment_id = p.id)
    order by p.created_at desc
  loop
    perform public._reverse_payment_core(v_pay, v_inv, 'Invoice cancel: ' || p_reason, v_uid, v_today);
    select * into v_inv from public.invoices where id = p_invoice_id;
  end loop;

  perform set_config('app.invoice_fn', 'on', true);
  update public.transactions
     set rate = 0, discount_amount = 0, discount_pct = 0, amount = 0, balance_due = 0,
         settled_at = now(), due_date = null,
         description = coalesce(description, '') || ' [CANCEL]'
   where id = v_inv.mirror_tx_id;
  perform set_config('app.invoice_fn', 'off', true);

  perform set_config('app.invoice_row_fn', 'on', true);
  update public.invoices
     set status = 'void', voided_at = now(), voided_by = v_uid, void_reason = btrim(p_reason)
   where id = p_invoice_id;
  perform set_config('app.invoice_row_fn', 'off', true);
end;
$$;

-- 7e. Purani transactions ke treatment naamon aur rate se price list ka pehla masauda
create or replace function public.seed_treatment_catalog_from_history()
returns int
language plpgsql
set search_path = public
as $$
declare v_n int;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;

  with src as (
    select distinct on (lower(btrim(treatment_name)))
           btrim(treatment_name) as name, rate
    from public.transactions
    where treatment_name is not null and btrim(treatment_name) <> ''
      and rate is not null and rate > 0 and invoice_id is null
      and treatment_name !~* '\((baqaya|advance|month [0-9]+)\)'
    order by lower(btrim(treatment_name)), transaction_date desc, created_at desc
  ), ins as (
    insert into public.treatment_catalog (name, price)
    select name, rate from src
    on conflict do nothing
    returning 1
  )
  select count(*) into v_n from ins;
  return v_n;
end;
$$;

-- 7f. Agla invoice number badalna (sirf already jari number se aage)
create or replace function public.set_next_invoice_number(p_next int, p_prefix text default null)
returns void
language plpgsql
set search_path = public
as $$
declare v_max int;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;
  select coalesce(max((substring(invoice_number from '([0-9]+)$'))::int), 0) into v_max from public.invoices;
  if p_next is null or p_next <= v_max then
    raise exception 'Number % se bara hona chahiye (jari ho chuka: %)', v_max, v_max;
  end if;
  update public.invoice_counter
     set next_no = p_next,
         prefix  = coalesce(nullif(btrim(p_prefix), ''), prefix)
   where id = 1;
end;
$$;

-- Sirf login shuda user chala sakta hai, anonymous nahi
do $$
declare f text;
begin
  foreach f in array array[
    'create_invoice(uuid,jsonb,numeric,numeric,text,text,date,text,text)',
    'record_payment(uuid,numeric,text,text,text)',
    'reverse_payment(uuid,text)',
    'void_invoice(uuid,text)',
    'seed_treatment_catalog_from_history()',
    'set_next_invoice_number(int,text)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on function public._reverse_payment_core(public.payments, public.invoices, text, uuid, date) from public, anon;
grant  execute on function public._reverse_payment_core(public.payments, public.invoices, text, uuid, date) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Naye tables par bhi audit (agar Phase 2 lagi hui hai)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  if to_regprocedure('public.audit_row_change()') is not null then
    foreach t in array array['treatment_catalog', 'invoice_counter', 'invoices', 'invoice_items', 'payments']
    loop
      execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
      execute format(
        'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.audit_row_change()', t);
    end loop;
  end if;
end $$;

-- =====================================================================
-- PHASE 7: STAFF (salary, advance, bonus, deduction, ledger) + STAFF PORTAL (link + PIN)
-- Al Shifa Health Care
--
-- SIRF naya jodta hai. Purana kuch nahi badalta. Dobara chalana safe.
-- Pehle phase2 aur phase6 chali honi chahiye (kharcha "Staff Advance"/"Salary" category wahin se).
-- PEHLE test (staging) project par chalayein.
--
-- Hisaab ka usool (staff ledger):
--   + salary_due  (mahine ki tankhwah jo banti hai)      + bonus
--   - advance     (peshgi di gayi, cash nikla)           - payout (tankhwah di gayi, cash nikla)
--   - deduction   (katauti, cash nahi)
--   Baqaya = sab ka jor = staff ko abhi kitna dena baqi hai. Manfi = staff ne peshgi li hui hai.
-- Sirf cash nikalne wali entries (advance, payout) kharche mein khud likhi jati hain.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Staff (payroll par jo log hain; login ho ya na ho)
-- ---------------------------------------------------------------------
create table if not exists public.staff_members (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null check (length(btrim(full_name)) > 0),
  title          text,
  phone          text,
  profile_id     uuid references public.staff_profiles(id),
  monthly_salary numeric(12,2) not null default 0 check (monthly_salary >= 0),
  joined_on      date,
  is_active      boolean not null default true,
  notes          text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Staff ledger (kabhi edit/delete nahi, sirf "mujhe mil gaye" ka nishan lag sakta hai)
-- ---------------------------------------------------------------------
create table if not exists public.staff_ledger (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references public.staff_members(id),
  entry_date      date not null,
  kind            text not null check (kind in ('salary_due', 'bonus', 'deduction', 'advance', 'payout')),
  amount          numeric(12,2) not null,
  period          text check (period ~ '^[0-9]{4}-[0-9]{2}$'),
  method          text check (method in ('cash', 'bank', 'easypaisa', 'jazzcash')),
  note            text,
  expense_tx_id   uuid,
  acknowledged_at timestamptz,
  created_by      uuid,
  created_by_name text,
  idempotency_key text unique,
  created_at      timestamptz not null default now(),
  check ((kind in ('salary_due', 'bonus') and amount > 0)
      or (kind in ('deduction', 'advance', 'payout') and amount < 0))
);
create index if not exists idx_staff_ledger_staff on public.staff_ledger (staff_id, entry_date desc, created_at desc);
create unique index if not exists uq_staff_salary_period
  on public.staff_ledger (staff_id, period) where kind = 'salary_due';

create or replace function public.staff_ledger_guard()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'DELETE' then
    raise exception 'Staff ledger mein delete allowed nahi hai';
  end if;
  -- sirf acknowledged_at (pehli baar) badal sakta hai
  if (to_jsonb(old) - 'acknowledged_at') is distinct from (to_jsonb(new) - 'acknowledged_at')
     or old.acknowledged_at is not null then
    raise exception 'Staff ledger mein tabdeeli allowed nahi hai';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_staff_ledger_guard on public.staff_ledger;
create trigger trg_staff_ledger_guard
  before update or delete on public.staff_ledger
  for each row execute function public.staff_ledger_guard();

-- ---------------------------------------------------------------------
-- 3. Access: sirf owner. Ledger mein likhna sirf functions se.
-- ---------------------------------------------------------------------
alter table public.staff_members enable row level security;
alter table public.staff_ledger  enable row level security;

drop policy if exists owner_select_staff_members on public.staff_members;
drop policy if exists owner_insert_staff_members on public.staff_members;
drop policy if exists owner_update_staff_members on public.staff_members;
create policy owner_select_staff_members on public.staff_members for select using (public.is_owner());
create policy owner_insert_staff_members on public.staff_members for insert with check (public.is_owner());
create policy owner_update_staff_members on public.staff_members for update using (public.is_owner()) with check (public.is_owner());

drop policy if exists owner_select_staff_ledger on public.staff_ledger;
create policy owner_select_staff_ledger on public.staff_ledger for select using (public.is_owner());

revoke all on public.staff_members, public.staff_ledger from anon;
revoke all on public.staff_ledger from authenticated;
grant select on public.staff_ledger to authenticated;
grant select, insert, update on public.staff_members to authenticated;
revoke delete, truncate on public.staff_members from authenticated;

-- Baqaya ek nazar mein
create or replace view public.staff_balances
with (security_invoker = true)
as
select s.id as staff_id,
       coalesce(sum(l.amount), 0)                                          as balance,
       coalesce(sum(l.amount) filter (where l.kind = 'salary_due'), 0)     as total_salary_due,
       coalesce(sum(l.amount) filter (where l.kind = 'bonus'), 0)          as total_bonus,
       coalesce(-sum(l.amount) filter (where l.kind = 'advance'), 0)       as total_advance,
       coalesce(-sum(l.amount) filter (where l.kind = 'deduction'), 0)     as total_deduction,
       coalesce(-sum(l.amount) filter (where l.kind = 'payout'), 0)        as total_payout,
       count(*) filter (where l.kind in ('advance', 'payout') and l.acknowledged_at is null) as unconfirmed
from public.staff_members s
left join public.staff_ledger l on l.staff_id = s.id
group by s.id;
grant select on public.staff_balances to authenticated;
revoke all on public.staff_balances from anon;

-- ---------------------------------------------------------------------
-- 4. FUNCTIONS (owner check andar; definer taake ledger table seedha band rahe)
-- ---------------------------------------------------------------------
create or replace function public.staff_add_entry(
  p_staff_id uuid,
  p_kind     text,
  p_amount   numeric,
  p_date     date    default null,
  p_period   text    default null,
  p_method   text    default 'cash',
  p_note     text    default null,
  p_key      text    default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_amt   numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_s     public.staff_members%rowtype;
  v_name  text;
  v_bal   numeric(12,2);
  v_signed numeric(12,2);
  v_tx    uuid;
  v_id    uuid;
  v_date  date := coalesce(p_date, v_today);
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin staff ka hisaab likh sakta hai';
  end if;
  if p_kind not in ('salary_due', 'bonus', 'deduction', 'advance', 'payout') then
    raise exception 'Qism ghalat hai';
  end if;
  if v_amt <= 0 or v_amt > 100000000 then raise exception 'Raqam ghalat hai'; end if;
  if v_date > v_today + 1 then raise exception 'Aane wali tareekh nahi likh sakte'; end if;

  if p_key is not null then
    perform pg_advisory_xact_lock(hashtext('stf:' || p_key));
    select id into v_id from public.staff_ledger where idempotency_key = p_key;
    if found then return v_id; end if;
  end if;

  select * into v_s from public.staff_members where id = p_staff_id for update;
  if not found then raise exception 'Staff nahi mila'; end if;
  if not v_s.is_active then raise exception 'Ye staff band hai'; end if;

  if p_kind in ('advance', 'payout') and coalesce(p_method, '') not in ('cash', 'bank', 'easypaisa', 'jazzcash') then
    raise exception 'Payment ka tareeqa ghalat hai';
  end if;
  if p_kind = 'deduction' and btrim(coalesce(p_note, '')) = '' then
    raise exception 'Katauti ki wajah likhna zaroori hai';
  end if;
  if p_kind = 'salary_due' and (p_period is null or p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$') then
    raise exception 'Mahina YYYY-MM likhein';
  end if;

  select coalesce(sum(amount), 0) into v_bal from public.staff_ledger where staff_id = p_staff_id;
  if p_kind = 'payout' and v_amt > greatest(v_bal, 0) then
    raise exception 'Baqaya sirf Rs. % hai. Is se zyada dena ho to "Advance" likhein', greatest(v_bal, 0);
  end if;

  v_signed := case when p_kind in ('salary_due', 'bonus') then v_amt else -v_amt end;
  select full_name into v_name from public.staff_profiles where id = v_uid;

  -- Cash nikla to kharcha khud likha jata hai
  if p_kind in ('advance', 'payout') then
    insert into public.transactions
      (type, category, amount, payment_method, description, transaction_date, recorded_by, source)
    values
      ('expense',
       case when p_kind = 'advance' then 'Staff Advance' else 'Salary' end,
       v_amt, p_method,
       case when p_kind = 'advance' then 'Advance: ' else 'Tankhwah: ' end || v_s.full_name ||
         coalesce(' (' || p_period || ')', '') ||
         coalesce(' - ' || nullif(btrim(coalesce(p_note, '')), ''), ''),
       v_date, v_uid, 'payroll')
    returning id into v_tx;
  end if;

  insert into public.staff_ledger
    (staff_id, entry_date, kind, amount, period, method, note, expense_tx_id, created_by, created_by_name, idempotency_key)
  values
    (p_staff_id, v_date, p_kind, v_signed, p_period,
     case when p_kind in ('advance', 'payout') then p_method end,
     nullif(btrim(coalesce(p_note, '')), ''), v_tx, v_uid, v_name, p_key)
  returning id into v_id;

  return v_id;
end;
$$;

-- Mahine ki tankhwah sab active staff ke liye (jis ki ban chuki ho usay chhor kar)
create or replace function public.staff_generate_salary(p_period text)
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  v_n    int;
  v_today date := (now() at time zone 'Asia/Karachi')::date;
begin
  if not public.is_owner() then
    raise exception 'Sirf doctor/admin ye kar sakta hai';
  end if;
  if p_period is null or p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Mahina YYYY-MM likhein';
  end if;
  select full_name into v_name from public.staff_profiles where id = v_uid;

  with ins as (
    insert into public.staff_ledger (staff_id, entry_date, kind, amount, period, note, created_by, created_by_name)
    select s.id, v_today, 'salary_due', s.monthly_salary, p_period, 'Mahine ki tankhwah', v_uid, v_name
    from public.staff_members s
    where s.is_active and s.monthly_salary > 0
    on conflict (staff_id, period) where kind = 'salary_due' do nothing
    returning 1
  )
  select count(*) into v_n from ins;
  return v_n;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'staff_add_entry(uuid,text,numeric,date,text,text,text,text)',
    'staff_generate_salary(text)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. STAFF PORTAL (link + alag PIN). In tables ko sirf server (service key) chhoo sakta hai.
-- ---------------------------------------------------------------------
create table if not exists public.staff_portal_access (
  staff_id        uuid primary key references public.staff_members(id),
  token_hash      text not null unique,
  pin_hash        text not null,
  failed_attempts int  not null default 0,
  locked_until    timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  last_login_at   timestamptz,
  issued_by       uuid
);

create table if not exists public.staff_portal_log (
  id         bigint generated always as identity primary key,
  staff_id   uuid references public.staff_members(id),
  event      text not null,
  ip         text,
  detail     text,
  created_at timestamptz not null default now()
);
create index if not exists idx_staff_portal_log_staff on public.staff_portal_log (staff_id, created_at desc);

create or replace function public.staff_portal_log_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Portal log mein tabdeeli ya delete allowed nahi hai';
end;
$$;
drop trigger if exists trg_staff_portal_log_immutable on public.staff_portal_log;
create trigger trg_staff_portal_log_immutable
  before update or delete on public.staff_portal_log
  for each row execute function public.staff_portal_log_immutable();

alter table public.staff_portal_access enable row level security;
alter table public.staff_portal_log    enable row level security;
revoke all on public.staff_portal_access, public.staff_portal_log from anon, authenticated;
-- (koi policy nahi: sirf service key wala server hi parh/likh sakta hai)

-- Galat PIN: ginti barhao, 5 ghalat par 15 minute ka lock
create or replace function public.staff_portal_fail(p_staff_id uuid, p_ip text, p_max int default 5, p_lock_minutes int default 15)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare v_until timestamptz;
begin
  update public.staff_portal_access
     set failed_attempts = failed_attempts + 1,
         locked_until = case when failed_attempts + 1 >= p_max
                             then now() + make_interval(mins => p_lock_minutes) else locked_until end
   where staff_id = p_staff_id
   returning locked_until into v_until;
  insert into public.staff_portal_log (staff_id, event, ip)
  values (p_staff_id, case when v_until is not null and v_until > now() then 'locked' else 'login_fail' end, p_ip);
  return v_until;
end;
$$;

create or replace function public.staff_portal_ok(p_staff_id uuid, p_ip text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.staff_portal_access
     set failed_attempts = 0, locked_until = null, last_login_at = now()
   where staff_id = p_staff_id;
  insert into public.staff_portal_log (staff_id, event, ip) values (p_staff_id, 'login_ok', p_ip);
end;
$$;

-- Staff "mujhe mil gaye" dabaye: sirf apni cash entry par, sirf aik baar
create or replace function public.staff_acknowledge(p_staff_id uuid, p_entry_id uuid, p_ip text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare v_n int;
begin
  update public.staff_ledger
     set acknowledged_at = now()
   where id = p_entry_id and staff_id = p_staff_id
     and kind in ('advance', 'payout') and acknowledged_at is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into public.staff_portal_log (staff_id, event, ip, detail) values (p_staff_id, 'ack', p_ip, p_entry_id::text);
  end if;
  return v_n > 0;
end;
$$;

-- Ye teeno sirf server (service key) chala sakta hai, browser se nahi
do $$
declare f text;
begin
  foreach f in array array[
    'staff_portal_fail(uuid,text,int,int)',
    'staff_portal_ok(uuid,text)',
    'staff_acknowledge(uuid,uuid,text)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function public.%s to service_role', f);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. Audit (staff_members; ledger khud record hai)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  if to_regprocedure('public.audit_row_change()') is not null then
    foreach t in array array['staff_members']
    loop
      execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
      execute format(
        'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.audit_row_change()', t);
    end loop;
  end if;
end $$;

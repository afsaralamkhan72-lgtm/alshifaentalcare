-- =====================================================================
-- PHASE 11 — Baqaya raqam aur due date (har patient ke liye)
-- Run AFTER SETUP-ALL.sql
-- =====================================================================

-- Aksar patient poore paise aik baar mein nahi deta. Har treatment ke
-- sath ye mehfooz hota hai ke kitna baqaya hai aur kab tak dena hai.
alter table public.transactions
  add column if not exists balance_due numeric(12,2) default 0,
  add column if not exists due_date    date,
  add column if not exists settled_at  timestamptz;

-- Jo baqaya rehta hai us par due date se index, taake dues list tez chale
create index if not exists idx_transactions_due
  on public.transactions (due_date)
  where balance_due > 0;

-- Purani entries ka baqaya nikal lein (rate - discount - jitna mila)
update public.transactions
   set balance_due = greatest(0, coalesce(rate, 0) - coalesce(discount_amount, 0) - coalesce(amount, 0))
 where rate is not null
   and balance_due = 0
   and settled_at is null;

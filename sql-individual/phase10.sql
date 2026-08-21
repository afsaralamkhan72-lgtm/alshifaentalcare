-- =====================================================================
-- PHASE 10 — Bill ki tafseel (treatment, rate, discount)
-- Run AFTER SETUP-ALL.sql
-- =====================================================================

-- Ab tak sirf amount mehfooz hoti thi. Bill par ye batane ke liye ke
-- kaunsa treatment hua, uska rate kya tha aur kitna discount diya gaya,
-- ye columns chahiye.
alter table public.transactions
  add column if not exists treatment_name  text,
  add column if not exists rate            numeric(12,2),
  add column if not exists discount_amount numeric(12,2) default 0,
  add column if not exists discount_pct    numeric(5,2)  default 0;

create index if not exists idx_transactions_treatment
  on public.transactions (treatment_name);

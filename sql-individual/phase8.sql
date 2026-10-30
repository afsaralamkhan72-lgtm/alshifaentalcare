-- =====================================================================
-- PHASE 8 — Treating Doctor on Transactions
-- Run AFTER phase7.sql
-- =====================================================================

-- `recorded_by` batata hai kis ne entry ki (aksar receptionist).
-- `doctor_id` batata hai kis doctor ne asal treatment kiya, taake
-- Reports mein har doctor ki earning aur cases alag dikhein.
alter table public.transactions
  add column if not exists doctor_id uuid references public.staff_profiles(id);

create index if not exists idx_transactions_doctor
  on public.transactions (doctor_id, transaction_date);

-- Treatment plans par bhi doctor pehle se hai, lekin index nahi tha
create index if not exists idx_plans_doctor
  on public.treatment_plans (doctor_id);

-- Purani income entries jin par doctor nahi laga, unhein us staff se
-- jor dein jis ne entry ki thi, agar wo doctor tha.
update public.transactions t
   set doctor_id = t.recorded_by
  from public.staff_profiles s
 where t.doctor_id is null
   and t.recorded_by = s.id
   and s.role = 'doctor'
   and t.type = 'income';

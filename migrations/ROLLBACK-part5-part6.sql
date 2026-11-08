-- ROLLBACK for part5 + part6 (sirf zaroorat par). Koi patient/invoice/payment/stock record nahi mitta.
-- Naye functions hatana: app ke "qist payment" aur "Wapas/Kharab" buttons phir kaam nahi karenge.
drop function if exists public.pay_installment(uuid, numeric, text, text, text);
drop function if exists public.pay_legacy_due(uuid, numeric, text, text);
drop function if exists public.stock_return_or_damage(uuid, numeric, text, numeric, text, text, text);
-- Movement kind: purani list wapas, magar NOT VALID taake jo return/damaged records ban chuke hain wo mehfooz rahein.
alter table public.inventory_movements drop constraint if exists inventory_movements_kind_check;
alter table public.inventory_movements add constraint inventory_movements_kind_check
  check (kind in ('opening','purchase','usage','count_correction','merge_in','merge_out')) not valid;
-- Audit action ka constraint wapas karne ki zaroorat nahi: naya (format wala) constraint purane saare naam qubool karta hai,
-- aur audit_log mein pehle se likhi entries kabhi nahi chhedi jatin.

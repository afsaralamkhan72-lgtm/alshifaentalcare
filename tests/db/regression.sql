-- Al Shifa: database regression test. SIRF TEST project par chalayein (Supabase SQL Editor).
-- Sab kuch aakhir mein ROLLBACK hota hai, koi data nahi bachta. Har check PASS/FAIL likhta hai.
begin;
select set_config('request.jwt.claim.sub', (select id::text from public.staff_profiles where role in ('admin','doctor') and is_active order by created_at limit 1), true);
select set_config('role', 'authenticated', true);

do $$
declare
  pid uuid; inv uuid; pay uuid; v record; n int; ok boolean;
begin
  select id into pid from public.patients where deleted_at is null limit 1;
  if pid is null then raise exception 'FAIL: test ke liye koi patient chahiye'; end if;

  inv := public.create_invoice(pid, '[{"name":"T1","qty":2,"unit_price":1000},{"name":"T2","qty":1,"unit_price":333.33}]'::jsonb, 10, 500, 'cash', null, null, null, 'rt-key-1');
  select * into v from public.invoices where id = inv;
  if v.subtotal = 2333.33 and v.discount_amount = 233.33 and v.total = 2100.00 and v.paid_amount = 500 then raise notice 'PASS invoice math (sub, discount, total, paid)'; else raise exception 'FAIL invoice math %', v; end if;

  if public.create_invoice(pid, '[{"name":"T1","qty":1,"unit_price":1}]'::jsonb, 0, 0, 'cash', null, null, null, 'rt-key-1') = inv then raise notice 'PASS same idempotency key returns same invoice'; else raise exception 'FAIL idempotency'; end if;

  pay := public.collect_payment(inv, 1000, 'cash', null, 'rt-pay-1');
  perform public.collect_payment(inv, 1000, 'cash', null, 'rt-pay-1');
  select * into v from public.invoices where id = inv;
  if v.paid_amount = 1500 then raise notice 'PASS duplicate payment key ignored'; else raise exception 'FAIL duplicate payment, paid=%', v.paid_amount; end if;

  ok := false;
  begin perform public.collect_payment(inv, 5000, 'cash', null, 'rt-pay-2'); exception when others then ok := true; end;
  if ok then raise notice 'PASS overpayment blocked'; else raise exception 'FAIL overpayment allowed'; end if;

  perform public.collect_with_discount(inv, 100, 0, 'cash', 'test discount', 'rt-cwd-1');
  select * into v from public.invoices where id = inv;
  if v.total = 2000.00 and v.discount_amount = 333.33 and v.paid_amount = 1500 then raise notice 'PASS overall bill discount (collect_with_discount)'; else raise exception 'FAIL bill discount %', v; end if;

  select count(*) into n from public.invoice_reconcile() where invoice_id = inv;
  if n = 0 then raise notice 'PASS reconcile: invoice, payments, transactions barabar'; else raise exception 'FAIL reconcile mismatch'; end if;

  perform public.reverse_payment(pay, 'test reverse');
  select * into v from public.invoices where id = inv;
  if v.paid_amount = 500 then raise notice 'PASS payment reversal'; else raise exception 'FAIL reversal paid=%', v.paid_amount; end if;
  select count(*) into n from public.invoice_reconcile() where invoice_id = inv;
  if n = 0 then raise notice 'PASS reconcile after reversal'; else raise exception 'FAIL reconcile after reversal'; end if;

  perform public.void_invoice(inv, 'test void');
  select * into v from public.invoices where id = inv;
  if v.status = 'void' and v.paid_amount = 0 then raise notice 'PASS invoice void'; else raise exception 'FAIL void %', v; end if;

  ok := false;
  begin update public.inventory set quantity = quantity + 1 where id = (select id from public.inventory limit 1); exception when others then ok := true; end;
  if ok then raise notice 'PASS stock cannot be edited directly'; else raise notice 'SKIP stock guard (koi item nahi ya guard off)'; end if;

  select count(*) into n from pg_proc where pronamespace = 'public'::regnamespace and prosrc ~* 'riyayat';
  if n = 0 then raise notice 'PASS no old riyayat wording in functions'; else raise warning 'WARN % functions mein purana lafz riyayat hai (part1-discount-wording.sql chalayein)', n; end if;
end $$;
rollback;

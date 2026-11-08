create or replace function public.invoice_reconcile()
returns table(invoice_id uuid, invoice_number text, paid_amount numeric, payments_sum numeric, txn_sum numeric)
language sql stable security definer set search_path = public as $$
  select i.id, i.invoice_number, i.paid_amount, x.ps, y.ts
  from public.invoices i
  cross join lateral (select coalesce(sum(case when p.kind = 'refund' then -p.amount else p.amount end), 0) as ps from public.payments p where p.invoice_id = i.id) x
  cross join lateral (select coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0) as ts from public.transactions t where t.invoice_id = i.id) y
  where i.status = 'active' and (public.is_owner() or public.has_perm('reports.view'))
    and (abs(i.paid_amount - x.ps) > 0.01 or abs(i.paid_amount - y.ts) > 0.01)
  order by i.invoice_number
$$;
grant execute on function public.invoice_reconcile() to authenticated;

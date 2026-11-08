\pset format unaligned
\pset tuples_only on
select 'invoice paid != sum(payments)', count(*) from invoices i where status='active' and paid_amount <> coalesce((select sum(case when kind='refund' then -amount else amount end) from payments p where p.invoice_id=i.id),0);
select 'invoice balance != total-paid', count(*) from invoices where status='active' and balance <> total - paid_amount;
select 'payments without invoice', count(*) from payments p where not exists (select 1 from invoices i where i.id=p.invoice_id);
select 'payment mirror tx missing', count(*) from payments p where mirror_tx_id is not null and not exists (select 1 from transactions t where t.id=p.mirror_tx_id);
select 'tx invoice_id orphan', count(*) from transactions t where invoice_id is not null and not exists (select 1 from invoices i where i.id=t.invoice_id);
select 'income tx w/o patient (not inventory/manual)', count(*) from transactions where type='income' and patient_id is null and coalesce(source,'') not in ('inventory','manual') and category in ('treatment','treatment-installment');
select 'duplicate invoice numbers', count(*) from (select invoice_number from invoices group by 1 having count(*)>1) x;
select 'duplicate idempotency tx', count(*) from (select idempotency_key from transactions where idempotency_key is not null group by 1 having count(*)>1) x;
select 'installments paid but no tx', count(*) from installments i join treatment_plans p on p.id=i.plan_id where i.paid_amount>0 and not exists (select 1 from transactions t where t.patient_id=p.patient_id and t.amount=i.paid_amount and (t.treatment_name ~* ('month '||i.installment_no||'\)') or t.description like '%installment #'||i.installment_no||'%' or t.category='treatment-installment'));
select 'inventory qty != movements', count(*) from inventory_reconcile();
select 'negative stock', count(*) from inventory where quantity<0;
select 'expense tx w/o amount>0', count(*) from transactions where type='expense' and amount<=0;
select 'patients dup phone (active)', count(*) from (select phone from patients where deleted_at is null and phone is not null group by 1 having count(*)>1) x;
select 'orphan patient refs: treatment_plans', count(*) from treatment_plans t where not exists (select 1 from patients p where p.id=t.patient_id);
select 'orphan clinical_visits', count(*) from clinical_visits t where not exists (select 1 from patients p where p.id=t.patient_id);
select 'staff ledger orphan', count(*) from staff_ledger l where not exists (select 1 from staff_members s where s.id=l.staff_id) ;

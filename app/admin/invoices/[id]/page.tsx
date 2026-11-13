import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAnyPerm } from '@/lib/auth'
import RewardBanner from '@/components/admin/RewardBanner'
import { getReadyRewards } from '@/lib/rewards'
import InvoiceSheets from '@/components/print/InvoiceSheets'
import { getPrintCfg } from '@/lib/printSettings'
import InvoicePanel, { type PayRow } from '@/components/admin/InvoicePanel'
import { rxForInvoice } from '@/lib/visitDocs'

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tpl?: string; w?: string }> }) {
  const { tpl: askTpl, w: askWhat } = await searchParams
  await requireAnyPerm('billing.view')
  const { id } = await params
  const supabase = await createClient()

  const { data: inv } = await supabase
    .from('invoices')
    .select('*, patients(id, full_name, phone, mr_number, age, department, gender, address)')
    .eq('id', id)
    .maybeSingle()
  if (!inv) notFound()

  const [itemsRes, payRes, clinicRes] = await Promise.all([
    supabase.from('invoice_items').select('id, name, tooth, qty, unit_price, line_total').eq('invoice_id', id).order('name'),
    supabase
      .from('payments')
      .select('id, kind, amount, method, paid_on, note, reverses_payment_id, created_at')
      .eq('invoice_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('site_settings').select('value').eq('key', 'clinic_info').maybeSingle(),
  ])

  const items = itemsRes.data ?? []
  const rawPays = payRes.data ?? []
  const reversedIds = new Set(rawPays.filter((p) => p.reverses_payment_id).map((p) => p.reverses_payment_id as string))
  const payments: PayRow[] = rawPays.map((p) => ({
    id: p.id,
    kind: p.kind,
    amount: Number(p.amount),
    method: p.method,
    paid_on: p.paid_on,
    note: p.note,
    reversed: reversedIds.has(p.id),
  }))

  const printCfg = await getPrintCfg()
  const rewards = inv.status === 'active' ? await getReadyRewards(supabase, inv.patient_id) : []
  const patient = inv.patients as { id: string; full_name: string; phone: string; mr_number: string | null; age: number | null; department: string; gender: string | null; address: string | null } | null
  const info = (clinicRes.data?.value ?? {}) as { logo_url?: string }
  const void_ = inv.status === 'void'
  const { rx, rxId } = await rxForInvoice(
    supabase,
    { patient_id: inv.patient_id, clinical_visit_id: inv.clinical_visit_id ?? null, invoice_date: inv.invoice_date },
    patient ? { full_name: patient.full_name, mr_number: patient.mr_number, age: patient.age, gender: patient.gender } : null
  )

  return (
    <div>
      <Link href={patient ? `/admin/patients/${patient.id}` : '/admin/invoices'} className="text-sm text-clinic-ink/50 hover:text-clinic-teal print:hidden">
        ← {patient?.full_name ?? 'Invoices'}
      </Link>

      <RewardBanner rewards={rewards} invoice={{ id: inv.id, open: inv.status === 'active' && Number(inv.balance) > 0, items: items.map((i) => ({ name: i.name, line_total: Number(i.line_total) })) }} />

      <InvoiceSheets
        logo={printCfg.logo}
        logoUrl={info.logo_url ?? null}
        defaultTpl={askTpl === 'duo' ? 'duo' : printCfg.defaults.bill}
        rx={rx}
        rxId={rxId}
        rxHref={rxId ? '/admin/prescriptions/' + rxId + '/print' : null}
        initialWhat={askWhat === 'both' ? 'both' : 'bill'}
        patient={patient ? { name: patient.full_name, mr: patient.mr_number, age: patient.age, gender: patient.gender, address: patient.address, phone: patient.phone } : null}
        layout={printCfg.layout}
        d={{
          id: inv.id,
          patientId: patient?.id ?? inv.patient_id,
          age: patient?.age ?? null,
          number: inv.invoice_number,
          date: inv.invoice_date,
          patientName: patient?.full_name ?? '',
          mr: patient?.mr_number ?? null,
          phone: patient?.phone ?? '',
          doctor: inv.treating_doctor ?? null,
          items: items.map((it) => ({ id: it.id, name: it.name, tooth: it.tooth, qty: Number(it.qty), unit_price: Number(it.unit_price), line_total: Number(it.line_total) })),
          subtotal: Number(inv.subtotal),
          discountAmount: Number(inv.discount_amount),
          discountPercent: Number(inv.discount_percent),
          total: Number(inv.total),
          paid: Number(inv.paid_amount),
          balance: Number(inv.balance),
          dueDate: inv.due_date,
          voided: void_,
          voidReason: inv.void_reason ?? null,
          notes: inv.notes ?? null,
        }}
      />

      <div className="mt-4">
        <InvoicePanel
          invoiceId={inv.id}
          patientId={patient?.id ?? inv.patient_id}
          invoiceNumber={inv.invoice_number}
          status={inv.status}
          total={Number(inv.total)}
          paid={Number(inv.paid_amount)}
          balance={Number(inv.balance)}
          patientName={patient?.full_name ?? ''}
          patientPhone={patient?.phone ?? ''}
          dueDate={inv.due_date}
          payments={payments}
          subtotal={Number(inv.subtotal)}
          discountAmount={Number(inv.discount_amount)}
          items={items.map((it) => ({ name: it.name, tooth: it.tooth, qty: Number(it.qty), line_total: Number(it.line_total) }))}
        />
      </div>
    </div>
  )
}

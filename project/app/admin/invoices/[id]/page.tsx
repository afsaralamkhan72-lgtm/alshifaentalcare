import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import ClinicLogo from '@/components/ClinicLogo'
import InvoicePanel, { type PayRow } from '@/components/admin/InvoicePanel'
import { CLINIC } from '@/clinic.config'
import { fmtDate, money } from '@/lib/karachi'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner()
  const { id } = await params
  const supabase = await createClient()

  const { data: inv } = await supabase
    .from('invoices')
    .select('*, patients(id, full_name, phone, mr_number, age, department)')
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

  const patient = inv.patients as { id: string; full_name: string; phone: string; mr_number: string | null; age: number | null; department: string } | null
  const info = (clinicRes.data?.value ?? {}) as { logo_url?: string }
  const void_ = inv.status === 'void'

  return (
    <div>
      <Link href={patient ? `/admin/patients/${patient.id}` : '/admin/invoices'} className="text-sm text-clinic-ink/50 hover:text-clinic-teal print:hidden">
        ← {patient?.full_name ?? 'Invoices'}
      </Link>

      <div id="invoice-sheet" className="relative mt-3 rounded-2xl border border-clinic-teal/10 bg-white p-6 sm:p-8">
        {void_ && (
          <p className="absolute right-6 top-6 rotate-6 rounded border-2 border-red-500 px-3 py-1 font-display text-lg font-bold uppercase text-red-500">
            Cancelled
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-clinic-gold/40 pb-4">
          <ClinicLogo logoUrl={info.logo_url ?? null} size={52} withName />
          <div className="text-right text-xs text-clinic-ink/70">
            <p>{CLINIC.address.full}</p>
            <p>{CLINIC.phone.display}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-clinic-ink/50">Invoice</p>
            <p className="font-display text-2xl font-semibold text-clinic-teal">{inv.invoice_number}</p>
            <p className="text-sm text-clinic-ink/60">{fmtDate(inv.invoice_date)}</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-clinic-ink">{patient?.full_name}</p>
            <p className="text-clinic-ink/60">{patient?.mr_number} · {patient?.phone}</p>
            {inv.treating_doctor && <p className="text-clinic-ink/60">Dr: {inv.treating_doctor}</p>}
          </div>
        </div>

        <table className="mt-5 w-full text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60">
            <tr>
              <th className="px-3 py-2">Treatment</th>
              <th className="px-3 py-2">Daant</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Qeemat</th>
              <th className="px-3 py-2 text-right">Raqam</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-clinic-teal/10">
                <td className="px-3 py-2">{it.name}</td>
                <td className="px-3 py-2">{it.tooth ?? '—'}</td>
                <td className="px-3 py-2 text-right">{it.qty}</td>
                <td className="px-3 py-2 text-right">{money(it.unit_price)}</td>
                <td className="px-3 py-2 text-right">{money(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto grid max-w-xs gap-1 text-sm">
          <p className="flex justify-between"><span className="text-clinic-ink/60">Subtotal</span><span>{money(inv.subtotal)}</span></p>
          {Number(inv.discount_amount) > 0 && (
            <p className="flex justify-between"><span className="text-clinic-ink/60">Discount ({Number(inv.discount_percent)}%)</span><span>− {money(inv.discount_amount)}</span></p>
          )}
          <p className="flex justify-between font-semibold"><span>Total</span><span>{money(inv.total)}</span></p>
          <p className="flex justify-between text-emerald-700"><span>Mile</span><span>{money(inv.paid_amount)}</span></p>
          <p className="flex justify-between border-t border-clinic-teal/10 pt-1 font-display text-lg font-semibold text-amber-700">
            <span>Baqaya</span><span>{money(inv.balance)}</span>
          </p>
          {Number(inv.balance) > 0 && inv.due_date && <p className="text-right text-xs text-clinic-ink/60">Aakhri tareekh: {fmtDate(inv.due_date)}</p>}
        </div>

        {void_ && inv.void_reason && <p className="mt-4 text-xs text-red-700">Cancel ki wajah: {inv.void_reason}</p>}
        {inv.notes && <p className="mt-4 text-xs text-clinic-ink/60">Note: {inv.notes}</p>}

        <p className="mt-8 text-center text-xs text-clinic-ink/50">{CLINIC.doctor.name} · {CLINIC.name}</p>
      </div>

      <div className="mt-4">
        <InvoicePanel
          invoiceId={inv.id}
          invoiceNumber={inv.invoice_number}
          status={inv.status}
          total={Number(inv.total)}
          paid={Number(inv.paid_amount)}
          balance={Number(inv.balance)}
          patientName={patient?.full_name ?? ''}
          patientPhone={patient?.phone ?? ''}
          dueDate={inv.due_date}
          payments={payments}
        />
      </div>
    </div>
  )
}

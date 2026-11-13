import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requirePerm } from '@/lib/auth'
import { CLINIC } from '@/clinic.config'
import { fmtDate, money } from '@/lib/karachi'
import SheetPrintButton from '@/components/admin/SheetPrintButton'
import DocShare from '@/components/print/DocShare'
import { numFmt } from '@/lib/karachi'

type Inv = { id: string; invoice_number: string; total: number; paid_amount: number; invoice_items: { name: string; tooth: string | null; qty: number; unit_price: number }[] }

/** Aik visit ka poora bill: us visit ke tamam invoices aik hi page par (PDF sirf print par banti hai) */
export default async function VisitInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm('billing.view')
  const { id } = await params
  const supabase = await createClient()
  const { data: v } = await supabase.from('clinical_visits').select('id, patient_id, visit_date, doctor, patients(full_name, mr_number, phone)').eq('id', id).maybeSingle()
  if (!v) notFound()
  const [invRes, payRes, balRes, rxRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, total, paid_amount, invoice_items(name, tooth, qty, unit_price)')
      .eq('clinical_visit_id', id)
      .neq('status', 'void')
      .order('created_at'),
    supabase.from('payments').select('id, amount, method, invoice_id').eq('patient_id', v.patient_id).eq('paid_on', v.visit_date),
    supabase.from('patient_balances').select('*').eq('patient_id', v.patient_id).maybeSingle(),
    supabase.from('prescriptions').select('id, items').eq('clinical_visit_id', id).order('created_at', { ascending: false }).limit(1),
  ])
  const rxRow = ((rxRes.data ?? []) as { id: string; items: unknown[] | null }[])[0]
  const rxId = rxRow && (rxRow.items ?? []).length ? rxRow.id : null
  const invs = (invRes.data ?? []) as unknown as Inv[]
  const p = v.patients as unknown as { full_name: string; mr_number: string | null; phone: string } | null
  const total = invs.reduce((s, i) => s + Number(i.total), 0)
  const paidOnBills = invs.reduce((s, i) => s + Number(i.paid_amount), 0)
  const todayPaid = (payRes.data ?? []).reduce((s, x) => s + Number(x.amount), 0)
  const bal = balRes.data ? Number((balRes.data as Record<string, unknown>).balance ?? 0) : null

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/patients/${v.patient_id}`} className="text-sm text-clinic-ink/50 hover:text-clinic-teal">
          ← Patient
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {rxId && (
            <Link data-testid="both-link" href={'/admin/prescriptions/' + rxId + '/print?w=both'} className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal">
              Invoice + Prescription aik sath
            </Link>
          )}
          <DocShare
            fileName={'Invoice-' + (p?.mr_number ?? 'mareez') + '-' + v.visit_date + '.pdf'}
            patientId={v.patient_id}
            phone={p?.phone ?? null}
            message={'Assalam o Alaikum ' + (p?.full_name ?? '') + ',\n\n' + CLINIC.name + ' ka invoice (' + fmtDate(v.visit_date) + ')\nBill: Rs. ' + numFmt(total) + '\nAaj mila: Rs. ' + numFmt(todayPaid) + (bal != null ? '\nKul baqaya: Rs. ' + numFmt(Math.max(0, bal)) : '')}
          />
          <SheetPrintButton />
        </div>
      </div>
      <div id="print-sheet" className="rounded-2xl border border-clinic-teal/10 bg-white p-8 text-clinic-ink">
        <header className="flex items-start justify-between border-b-2 border-clinic-teal pb-4">
          <div>
            <p className="font-display text-2xl font-semibold text-clinic-teal">{CLINIC.name}</p>
            <p className="mt-1 text-xs text-clinic-ink/60">
              {CLINIC.address.full} · {CLINIC.phone.display}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Invoice</p>
            <p className="text-xs text-clinic-ink/70">{fmtDate(v.visit_date)}</p>
            {invs.length > 0 && <p className="text-xs text-clinic-ink/70">{invs.map((i) => i.invoice_number).join(', ')}</p>}
          </div>
        </header>
        <p className="mt-4 text-sm">
          <span className="text-clinic-ink/50">Patient: </span>
          <span className="font-semibold capitalize">{p?.full_name}</span> · {p?.mr_number ?? ''} · {p?.phone}
        </p>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-clinic-ink/20 text-left text-xs text-clinic-ink/50">
              <th className="py-1.5">Tafseel</th>
              <th className="py-1.5 text-right">Tadaad</th>
              <th className="py-1.5 text-right">Qeemat</th>
              <th className="py-1.5 text-right">Raqam</th>
            </tr>
          </thead>
          <tbody>
            {invs.flatMap((i) =>
              (i.invoice_items ?? []).map((it, k) => (
                <tr key={i.id + k} className="border-b border-clinic-ink/10">
                  <td className="py-1.5">
                    {it.name}
                    {it.tooth ? <span className="text-clinic-ink/50"> ({it.tooth})</span> : null}
                  </td>
                  <td className="py-1.5 text-right">{it.qty}</td>
                  <td className="py-1.5 text-right">{money(it.unit_price)}</td>
                  <td className="py-1.5 text-right">{money(Number(it.qty) * Number(it.unit_price))}</td>
                </tr>
              ))
            )}
            {invs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-clinic-ink/50">
                  Is visit mein koi naya bill nahi bana.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-4 ml-auto grid max-w-xs gap-1 text-sm">
          <p className="flex justify-between">
            <span>Is visit ka bill</span>
            <span>{money(total)}</span>
          </p>
          <p className="flex justify-between">
            <span>Aaj mile</span>
            <span className="text-emerald-700">{money(todayPaid)}</span>
          </p>
          {bal != null && (
            <p className="flex justify-between border-t border-clinic-ink/20 pt-1 font-semibold">
              <span>Baqaya (kul)</span>
              <span className={bal > 0 ? 'text-red-600' : ''}>{money(bal)}</span>
            </p>
          )}
          {paidOnBills !== todayPaid && <p className="text-[11px] text-clinic-ink/40">Is bill par ab tak mile: {money(paidOnBills)}</p>}
        </div>
      </div>
    </div>
  )
}

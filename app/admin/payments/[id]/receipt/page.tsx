import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissions, getStaffProfile, isOwnerRole } from '@/lib/auth'
import { CLINIC } from '@/clinic.config'
import { fmtDate, money } from '@/lib/karachi'
import SheetPrintButton from '@/components/admin/SheetPrintButton'

/** Aik payment ki receipt (print / PDF). Database ki asli entry se banti hai. */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaffProfile()
  const perms = await getPermissions()
  if (!isOwnerRole(staff.role) && !perms.includes('billing.view') && !perms.includes('billing.collect')) redirect('/admin/dashboard')
  const { id } = await params
  const supabase = await createClient()
  const { data: pay } = await supabase
    .from('payments')
    .select('id, invoice_id, patient_id, kind, amount, method, paid_on, note, created_at')
    .eq('id', id)
    .maybeSingle()
  if (!pay) notFound()
  const [{ data: inv }, { data: items }, { data: patient }] = await Promise.all([
    supabase.from('invoices').select('invoice_number, total, paid_amount, balance, patient_treatment_id, status').eq('id', pay.invoice_id).maybeSingle(),
    supabase.from('invoice_items').select('name, tooth').eq('invoice_id', pay.invoice_id),
    supabase.from('patients').select('full_name, mr_number, phone').eq('id', pay.patient_id).maybeSingle(),
  ])
  let tBal: { charged: number; paid: number; balance: number } | null = null
  if (inv?.patient_treatment_id) {
    const { data } = await supabase.from('treatment_balances').select('charged, paid, balance').eq('treatment_id', inv.patient_treatment_id).maybeSingle()
    if (data) tBal = { charged: Number(data.charged), paid: Number(data.paid), balance: Number(data.balance) }
  }
  const isRefund = pay.kind === 'refund'
  const receiptNo = `R-${String(pay.id).slice(0, 8).toUpperCase()}`

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/patients/${pay.patient_id}`} className="text-sm text-clinic-ink/50 hover:text-clinic-teal">
          ← Patient
        </Link>
        <SheetPrintButton />
      </div>
      <div id="print-sheet" className="rounded-2xl border border-clinic-teal/10 bg-white p-6 text-sm text-clinic-ink">
        <div className="border-b-2 border-clinic-teal pb-3 text-center">
          <p className="font-display text-xl font-semibold text-clinic-teal">{CLINIC.name}</p>
          <p className="text-xs text-clinic-ink/60">
            {CLINIC.address.full} · {CLINIC.phone.display}
          </p>
          <p className="mt-2 font-semibold">{isRefund ? 'REFUND RECEIPT' : 'PAYMENT RECEIPT'}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1">
          <span className="text-clinic-ink/50">Receipt</span>
          <span className="text-right">{receiptNo}</span>
          <span className="text-clinic-ink/50">Tareekh</span>
          <span className="text-right">{fmtDate(pay.paid_on)}</span>
          <span className="text-clinic-ink/50">Patient</span>
          <span className="text-right capitalize">{patient?.full_name}</span>
          <span className="text-clinic-ink/50">MR</span>
          <span className="text-right">{patient?.mr_number}</span>
          <span className="text-clinic-ink/50">Bill</span>
          <span className="text-right">{inv?.invoice_number}</span>
          <span className="text-clinic-ink/50">Treatment</span>
          <span className="text-right">{(items ?? []).map((i) => `${i.name}${i.tooth ? ` (${i.tooth})` : ''}`).join(', ')}</span>
          <span className="text-clinic-ink/50">Tareeqa</span>
          <span className="text-right capitalize">{pay.method}</span>
        </div>
        <div className={`mt-4 rounded-xl px-4 py-3 text-center ${isRefund ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <p className="text-xs text-clinic-ink/60">{isRefund ? 'Wapas diye' : 'Wusool hue'}</p>
          <p className={`font-display text-2xl font-semibold ${isRefund ? 'text-red-700' : 'text-emerald-700'}`}>{money(pay.amount)}</p>
        </div>
        {tBal && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-clinic-ink/50">Treatment kul</p>
              <p className="font-semibold">{money(tBal.charged)}</p>
            </div>
            <div>
              <p className="text-clinic-ink/50">Ab tak mile</p>
              <p className="font-semibold">{money(tBal.paid)}</p>
            </div>
            <div>
              <p className="text-clinic-ink/50">Baqaya</p>
              <p className="font-semibold">{money(tBal.balance)}</p>
            </div>
          </div>
        )}
        {pay.note && <p className="mt-3 text-xs text-clinic-ink/60">Note: {pay.note}</p>}
        <p className="mt-6 text-center text-xs text-clinic-ink/50">Shukriya · {CLINIC.timings.full}</p>
      </div>
    </div>
  )
}

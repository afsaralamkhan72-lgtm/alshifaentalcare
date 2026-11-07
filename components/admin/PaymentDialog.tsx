'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DuesList, { type DueRow } from '@/components/admin/DuesList'
import { money } from '@/lib/karachi'

/**
 * "Payment lein": visit khole baghair patient se paise lena.
 * Patient ke baqaya wale bills dikhte hain; jis ki payment mili wahan "Payment Mili" dabayein.
 * (Wohi tested raasta jo Baqaya Payments page ka hai, koi nayi hisaab ki logic nahi.)
 */
export default function PaymentDialog({
  patient,
  balance,
  size = 'md',
}: {
  patient: { id: string; full_name: string; phone: string; mr_number?: string | null; portal_code?: string | null }
  balance: number
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<DueRow[] | null>(null)
  const [err, setErr] = useState('')

  async function load() {
    setErr('')
    setRows(null)
    const { data, error } = await createClient()
      .from('transactions')
      .select('id, treatment_name, rate, discount_amount, amount, balance_due, due_date, invoice_id, transaction_date, treating_doctor')
      .eq('patient_id', patient.id)
      .gt('balance_due', 0)
      .is('settled_at', null)
      .order('transaction_date', { ascending: true })
    if (error) return setErr(error.message)
    setRows(((data ?? []) as Omit<DueRow, 'patients'>[]).map((r) => ({ ...r, patients: { id: patient.id, full_name: patient.full_name, phone: patient.phone, mr_number: patient.mr_number ?? null, portal_code: patient.portal_code ?? null, deleted_at: null } })))
  }

  const pad = size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          load()
        }}
        className={`rounded-full bg-clinic-teal font-semibold text-white ${pad}`}
      >
        Payment lein
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-label="Payment lein">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-clinic-sand p-4 sm:rounded-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-clinic-ink">Payment lein</p>
                <p className="text-sm text-clinic-ink/70">
                  {patient.full_name} · Kul baqaya <strong className={balance > 0 ? 'text-red-600' : ''}>{money(balance)}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-clinic-teal/30 px-3 py-1 text-sm text-clinic-ink/70">
                Band karein
              </button>
            </div>
            {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
            {!err && rows === null && <p className="mt-4 text-sm text-clinic-ink/60">Dekh raha hai...</p>}
            {rows && rows.length > 0 && (
              <DuesList
                rows={rows}
                openFirst
                onPaid={() => {
                  setOpen(false)
                }}
              />
            )}
            {rows && rows.length === 0 && (
              <p className="mt-4 rounded-lg bg-white px-3 py-3 text-sm text-clinic-ink/70">
                {balance > 0
                  ? 'Is patient ka baqaya purane hisaab (installment) mein hai, yahan se nahi liya ja sakta. "Poora hisaab" kholein.'
                  : 'Is patient ka koi baqaya nahi.'}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

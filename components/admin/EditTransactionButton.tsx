'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  id: string
  label: string
  amount: number
  rate: number | null
  discountAmount: number
  paymentMethod: string | null
  transactionDate: string
}

/**
 * Galti se ghalat amount likh diya? Ab dobara patient banane ki
 * zaroorat nahi — yahin se theek kar dein.
 */
export default function EditTransactionButton({
  id,
  label,
  amount,
  rate,
  discountAmount,
  paymentMethod,
  transactionDate,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [amt, setAmt] = useState(String(amount))
  const [rateVal, setRateVal] = useState(rate != null ? String(rate) : '')
  const [discount, setDiscount] = useState(String(discountAmount))
  const [method, setMethod] = useState(paymentMethod ?? 'cash')
  const [date, setDate] = useState(transactionDate)

  async function save() {
    setSaving(true)
    setError('')

    const newAmount = Number(amt || 0)
    const newRate = rateVal ? Number(rateVal) : null
    const newDiscount = Number(discount || 0)

    // Agar is entry par rate/qeemat thi to baqaya bhi dobara nikal lein
    const payload: Record<string, unknown> = {
      amount: newAmount,
      payment_method: method,
      transaction_date: date,
    }
    if (newRate != null) {
      payload.rate = newRate
      payload.discount_amount = newDiscount
      const newBalance = Math.max(0, newRate - newDiscount - newAmount)
      payload.balance_due = newBalance
      payload.settled_at = newBalance === 0 ? new Date().toISOString() : null
    }

    const supabase = createClient()
    const { error: err } = await supabase.from('transactions').update(payload).eq('id', id)

    setSaving(false)
    if (err) {
      setError('Save nahi hua, dobara koshish karein.')
      return
    }

    setOpen(false)
    router.refresh()
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Edit karein"
        className="rounded px-1.5 py-0.5 text-xs font-semibold text-clinic-teal hover:bg-clinic-mint print:hidden"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">
                Entry Theek Karein
              </p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40">
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-clinic-ink/50">{label}</p>

            <div className="mt-4 grid gap-3">
              {rate != null && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-clinic-ink/60">Rate</label>
                    <input
                      type="number"
                      value={rateVal}
                      onChange={(e) => setRateVal(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-clinic-ink/60">Discount (Rs.)</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-clinic-ink/60">Kitne mile (amount)</label>
                <input
                  type="number"
                  autoFocus
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-clinic-ink/60">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className={inputClass}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-clinic-ink/60">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={save}
                disabled={saving}
                className="mt-1 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Karein'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

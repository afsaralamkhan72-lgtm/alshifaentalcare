'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  patientId: string
}

export default function TreatmentPlanForm({ patientId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('Orthodontics, Braces')
  const [totalCost, setTotalCost] = useState('')
  const [advance, setAdvance] = useState('0')
  const [months, setMonths] = useState('24')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))

  // Live preview so the doctor sees the monthly figure before saving
  const total = Number(totalCost || 0)
  const adv = Number(advance || 0)
  const m = Math.max(1, Number(months || 1))
  const monthly = Math.max(0, Math.round((total - adv) / m))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: plan, error: planError } = await supabase
      .from('treatment_plans')
      .insert({
        patient_id: patientId,
        title,
        total_cost: total,
        advance_paid: adv,
        duration_months: m,
        monthly_amount: monthly,
        start_date: startDate,
        doctor_id: user?.id ?? null,
      })
      .select('id')
      .single()

    if (planError || !plan) {
      setError('Plan save nahi hua.')
      setSaving(false)
      return
    }

    // Generate one installment row per month, due on the same day each month
    const rows = []
    const base = new Date(startDate)
    for (let i = 1; i <= m; i++) {
      const due = new Date(base)
      due.setMonth(due.getMonth() + i)
      rows.push({
        plan_id: plan.id,
        installment_no: i,
        due_date: due.toISOString().slice(0, 10),
        amount: monthly,
      })
    }

    const { error: instError } = await supabase.from('installments').insert(rows)

    setSaving(false)
    if (instError) {
      setError('Plan bana lekin installments nahi bane. Dobara koshish karein.')
      return
    }

    setOpen(false)
    setTotalCost('')
    router.refresh()
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white"
      >
        + Treatment Plan
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">New Treatment Plan</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 grid gap-3">
              <div>
                <label className="text-sm font-medium text-clinic-ink">Treatment</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Total Cost (Rs.)</label>
                  <input
                    required
                    type="number"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Advance (Rs.)</label>
                  <input
                    type="number"
                    value={advance}
                    onChange={(e) => setAdvance(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Duration (months)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-clinic-mint p-4 text-center">
                <p className="text-xs text-clinic-ink/50">Monthly Installment</p>
                <p className="font-display text-2xl font-semibold text-clinic-teal">
                  Rs. {monthly.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-clinic-ink/50">
                  {m} months · {m} installments auto-generate hongi
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Creating...' : 'Create Plan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

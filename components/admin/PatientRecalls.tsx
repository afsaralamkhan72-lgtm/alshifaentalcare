'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface PatientRecall {
  id: string
  recall_type: string
  interval_months: number
  last_done: string | null
  next_due: string
  status: string
}

const PRESETS = [
  { type: 'Scaling & Polishing', months: 6 },
  { type: 'Routine Check-up', months: 6 },
  { type: 'Orthodontic Review', months: 1 },
  { type: 'Denture Review', months: 12 },
  { type: 'Post-RCT Review', months: 6 },
  { type: 'Implant Review', months: 12 },
]

export default function PatientRecalls({
  patientId,
  recalls,
}: {
  patientId: string
  recalls: PatientRecall[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [type, setType] = useState(PRESETS[0].type)
  const [months, setMonths] = useState('6')
  const [lastDone, setLastDone] = useState(new Date().toISOString().slice(0, 10))

  function applyPreset(p: (typeof PRESETS)[number]) {
    setType(p.type)
    setMonths(String(p.months))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    // Next due = last done + interval
    const next = new Date(lastDone)
    next.setMonth(next.getMonth() + Number(months || 6))

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: err } = await supabase.from('recalls').insert({
      patient_id: patientId,
      recall_type: type,
      interval_months: Number(months || 6),
      last_done: lastDone || null,
      next_due: next.toISOString().slice(0, 10),
      created_by: user?.id ?? null,
    })

    setSaving(false)
    if (err) {
      setError(
        err.message.includes('duplicate')
          ? 'Is patient ka ye recall pehle se laga hua hai.'
          : 'Save nahi hua. Kya phase6.sql chalayi thi?'
      )
      return
    }

    setOpen(false)
    router.refresh()
  }

  async function remove(id: string) {
    if (!confirm('Ye recall band karein?')) return
    const supabase = createClient()
    await supabase.from('recalls').update({ status: 'stopped' }).eq('id', id)
    router.refresh()
  }

  const active = recalls.filter((r) => r.status === 'active')
  const today = new Date().toISOString().slice(0, 10)

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Recalls</h2>
          <p className="text-sm text-clinic-ink/60">
            When to call the patient back — you'll be reminded automatically.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white"
        >
          + Set Recall
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">Set Recall</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40">
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    type === p.type
                      ? 'bg-clinic-teal text-white'
                      : 'bg-clinic-mint text-clinic-teal'
                  }`}
                >
                  {p.type}
                </button>
              ))}
            </div>

            <form onSubmit={save} className="mt-4 grid gap-3">
              <div>
                <label className="text-sm font-medium text-clinic-ink">Recall Type</label>
                <input
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Har kitne mahine</label>
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
                  <label className="text-sm font-medium text-clinic-ink">Pichli baar kab</label>
                  <input
                    type="date"
                    value={lastDone}
                    onChange={(e) => setLastDone(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Set Recall'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="mt-4 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
        {active.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-clinic-ink/50">
            No recall set. Add a 6-month recall after scaling.
          </p>
        ) : (
          active.map((r) => {
            const isOverdue = r.next_due < today
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-clinic-ink">{r.recall_type}</p>
                  <p className="text-xs text-clinic-ink/50">
                    Har {r.interval_months} mahine · pichli baar{' '}
                    {r.last_done ? new Date(r.last_done).toLocaleDateString('en-GB') : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isOverdue ? 'bg-red-50 text-red-700' : 'bg-clinic-mint text-clinic-teal'
                    }`}
                  >
                    {new Date(r.next_due).toLocaleDateString('en-GB')}
                  </span>
                  <button
                    onClick={() => remove(r.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Stop
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

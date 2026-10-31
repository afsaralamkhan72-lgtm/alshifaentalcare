'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { todayKarachi } from '@/lib/karachi'

export interface VisitNote {
  id: string
  visit_date: string
  procedure: string | null
  notes: string | null
  next_visit: string | null
  voided_at?: string | null
  void_reason?: string | null
  visit_no?: number | null
  treatment_name?: string | null
}

export default function VisitNotes({
  patientId,
  notes,
  allowAdd = false,
  canCancel = true,
}: {
  patientId: string
  notes: VisitNote[]
  /** Naye visits ab treatment ke andar "Agla visit" se bante hain; yahan sirf list */
  allowAdd?: boolean
  canCancel?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = todayKarachi()
  const [visitDate, setVisitDate] = useState(today)
  const [procedure, setProcedure] = useState('')
  const [text, setText] = useState('')
  const [nextVisit, setNextVisit] = useState('')

  // Quick presets, the common follow-up gaps at this clinic
  function setWeeksAhead(weeks: number) {
    const d = new Date(visitDate)
    d.setDate(d.getDate() + weeks * 7)
    setNextVisit(d.toISOString().slice(0, 10))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: err } = await supabase.from('visit_notes').insert({
      patient_id: patientId,
      visit_date: visitDate,
      procedure: procedure || null,
      notes: text || null,
      next_visit: nextVisit || null,
      doctor_id: user?.id ?? null,
    })

    setSaving(false)
    if (err) {
      setError('Save nahi hua: ' + err.message)
      return
    }

    setProcedure('')
    setText('')
    setNextVisit('')
    setOpen(false)
    router.refresh()
  }

  // Note delete nahi hota: galti ho to wajah likh kar "Cancel" karte hain, record mehfooz rehta hai
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')

  async function cancelNote() {
    if (!cancelId) return
    if (!cancelReason.trim()) {
      setCancelError('Wajah likhna zaroori hai')
      return
    }
    const supabase = createClient()
    const { error: err } = await supabase
      .from('visit_notes')
      .update({ voided_at: new Date().toISOString(), void_reason: cancelReason.trim() })
      .eq('id', cancelId)
    if (err) {
      setCancelError('Cancel nahi hua: ' + err.message)
      return
    }
    setCancelId(null)
    setCancelReason('')
    setCancelError('')
    router.refresh()
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Visit Notes</h2>
          <p className="text-sm text-clinic-ink/60">
            Har visit tareekh ke hisaab se. Naya visit treatment ke andar &quot;Agla visit&quot; se banta hai.
          </p>
        </div>
        {allowAdd && (
          <button
            onClick={() => setOpen(true)}
            className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white"
          >
            + Add Visit
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">Add Visit Note</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40">
                ✕
              </button>
            </div>

            <form onSubmit={save} className="mt-4 grid gap-3">
              <div>
                <label className="text-sm font-medium text-clinic-ink">Visit Date</label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-clinic-ink">Procedure</label>
                <input
                  placeholder="Wire change / Tightening / RCT sitting 2"
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-clinic-ink">Notes</label>
                <textarea
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-clinic-ink">Next Visit</label>
                <input
                  type="date"
                  value={nextVisit}
                  onChange={(e) => setNextVisit(e.target.value)}
                  className={inputClass}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[1, 2, 4, 6].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeeksAhead(w)}
                      className="rounded-full bg-clinic-mint px-3 py-1 text-xs font-semibold text-clinic-teal"
                    >
                      +{w} week{w > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Visit'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="mt-4 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
        {notes.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-clinic-ink/50">
            No visits recorded yet.
          </p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className={`px-4 py-3 ${n.voided_at ? 'bg-red-50/40 opacity-70' : ''}`}>
              {n.voided_at && (
                <p className="mb-1 text-xs font-semibold text-red-700">
                  Cancel (galti): {n.void_reason}
                </p>
              )}
              {cancelId === n.id && (
                <div className="mb-2 rounded-xl border border-red-200 bg-white p-3">
                  <input
                    autoFocus
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Cancel ki wajah (zaroori)"
                    className="w-full rounded-lg border border-red-200 px-3 py-1.5 text-sm outline-none"
                  />
                  {cancelError && <p className="mt-1 text-xs text-red-600">{cancelError}</p>}
                  <div className="mt-2 flex gap-2">
                    <button onClick={cancelNote} className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
                      Cancel kar do
                    </button>
                    <button onClick={() => setCancelId(null)} className="text-xs text-clinic-ink/60">
                      Wapas
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-clinic-ink">
                  {n.visit_no ? (
                    <span className="mr-2 rounded bg-clinic-teal/10 px-1.5 py-0.5 text-[11px] font-bold text-clinic-teal">V{n.visit_no}</span>
                  ) : null}
                  {n.treatment_name && n.treatment_name !== n.procedure ? `${n.treatment_name}: ` : ''}
                  {n.procedure ?? 'Visit'}
                </p>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-clinic-ink/40">
                    {new Date(n.visit_date).toLocaleDateString('en-GB')}
                  </p>
                  {!n.voided_at && canCancel && (
                    <button
                      onClick={() => {
                        setCancelId(n.id)
                        setCancelReason('')
                        setCancelError('')
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Cancel note
                    </button>
                  )}
                </div>
              </div>
              {n.notes && <p className="mt-1 text-sm text-clinic-ink/60">{n.notes}</p>}
              {n.next_visit && (
                <p className="mt-1 text-xs font-medium text-clinic-teal">
                  Next visit: {new Date(n.next_visit).toLocaleDateString('en-GB')}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

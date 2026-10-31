'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HISTORY_STEPS, type Field } from '@/lib/history-steps'

type Section = Record<string, unknown>
/** Sirf aik baar bharne wali cheezein. Roz ka visit (takleef, muaina, chart, diagnosis) ab visit ke steps mein hai. */
const COLUMNS = ['medical_history', 'dental_history', 'demographics', 'consent'] as const
const TITLES: Record<string, string> = {
  medical_history: 'Medical history',
  dental_history: 'Dental history',
  demographics: 'Aur maloomat',
  consent: 'Consent',
}

const input = 'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'
const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm ${on ? 'bg-clinic-teal text-white' : 'bg-clinic-mint text-clinic-ink/70 hover:bg-clinic-teal/20'}`

export default function HistoryForm({
  patientId,
  initial,
  canEdit,
  startOpen,
}: {
  patientId: string
  initial: Record<string, unknown> | null
  canEdit: boolean
  startOpen: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(startOpen)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [data, setData] = useState<Record<string, Section>>(() => {
    const d: Record<string, Section> = {}
    for (const c of COLUMNS) d[c] = ((initial?.[c] as Section) ?? {}) as Section
    return d
  })

  const set = (col: string, key: string, v: unknown) => setData((p) => ({ ...p, [col]: { ...p[col], [key]: v } }))
  const toggle = (col: string, key: string, o: string) => {
    const cur = ((data[col][key] as string[]) ?? []).slice()
    set(col, key, cur.includes(o) ? cur.filter((x) => x !== o) : [...cur.filter((x) => (o === 'None' ? false : x !== 'None')), o])
  }
  const visible = (col: string, f: Field) => !f.showIf || (typeof data[col][f.showIf.key] === 'string' && f.showIf.equals.includes(data[col][f.showIf.key] as string))

  async function save() {
    setSaving(true)
    setMsg(null)
    const supabase = createClient()
    const payload: Record<string, unknown> = { patient_id: patientId, completed_step: 9 }
    for (const c of COLUMNS) payload[c] = data[c]
    const { error } = await supabase.from('patient_history').upsert(payload, { onConflict: 'patient_id' })
    setSaving(false)
    if (error) return setMsg({ ok: false, t: 'Save nahi hua: ' + error.message })
    setMsg({ ok: true, t: 'Save ho gaya' })
    setOpen(false)
    router.refresh()
  }

  if (!canEdit) return null
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
        {initial ? 'History badlein' : 'Medical / Dental history bharein'}
      </button>
    )

  return (
    <div className="grid gap-5 rounded-2xl border-2 border-clinic-teal/25 bg-white p-4">
      {COLUMNS.map((col) => {
        const step = HISTORY_STEPS.find((s) => s.column === col)!
        return (
          <div key={col}>
            <p className="text-xs font-semibold uppercase tracking-wide text-clinic-teal">{TITLES[col]}</p>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              {step.fields
                .filter((f) => visible(col, f))
                .map((f) => (
                  <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                    <label className="text-sm font-medium text-clinic-ink">{f.label}</label>
                    {f.type === 'radio' && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {f.options?.map((o) => (
                          <button key={o} type="button" onClick={() => set(col, f.key, data[col][f.key] === o ? '' : o)} className={chip(data[col][f.key] === o)}>
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                    {f.type === 'checkboxes' && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {f.options?.map((o) => (
                          <button key={o} type="button" onClick={() => toggle(col, f.key, o)} className={chip(((data[col][f.key] as string[]) ?? []).includes(o))}>
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                    {(f.type === 'text' || f.type === 'number' || f.type === 'date') && (
                      <input
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        placeholder={f.placeholder}
                        value={(data[col][f.key] as string) ?? ''}
                        onChange={(e) => set(col, f.key, e.target.value)}
                        className={input}
                      />
                    )}
                    {f.type === 'textarea' && (
                      <textarea rows={2} placeholder={f.placeholder} value={(data[col][f.key] as string) ?? ''} onChange={(e) => set(col, f.key, e.target.value)} className={input} />
                    )}
                  </div>
                ))}
            </div>
          </div>
        )
      })}
      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.t}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-clinic-teal px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Save...' : 'Save'}
        </button>
        {initial && (
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-clinic-ink/60">
            Wapas
          </button>
        )}
      </div>
    </div>
  )
}

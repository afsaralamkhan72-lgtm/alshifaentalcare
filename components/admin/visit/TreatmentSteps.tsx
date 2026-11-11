'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate, todayKarachi } from '@/lib/karachi'
import { defaultSteps } from '@/lib/treatmentSteps'

interface Step {
  id: string
  step_no: number
  title: string
  done_on: string | null
}

export default function TreatmentSteps({ treatmentId, name, canEdit }: { treatmentId: string; name: string; canEdit: boolean }) {
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [broken, setBroken] = useState(false)
  const [err, setErr] = useState('')
  const [title, setTitle] = useState('')
  const defaults = defaultSteps(name)

  const load = useCallback(async () => {
    const { data, error } = await createClient().from('treatment_steps').select('id, step_no, title, done_on').eq('treatment_id', treatmentId).order('step_no')
    if (error) {
      setBroken(true)
      return
    }
    setSteps((data ?? []) as Step[])
  }, [treatmentId])

  useEffect(() => {
    let alive = true
    createClient()
      .from('treatment_steps')
      .select('id, step_no, title, done_on')
      .eq('treatment_id', treatmentId)
      .order('step_no')
      .then(({ data, error }) => {
        if (!alive) return
        if (error) setBroken(true)
        else setSteps((data ?? []) as Step[])
      })
    return () => {
      alive = false
    }
  }, [treatmentId])

  if (broken || steps === null) return null
  if (steps.length === 0 && (defaults.length === 0 || !canEdit)) return null

  async function make() {
    setErr('')
    const rows = defaults.map((t, i) => ({ treatment_id: treatmentId, step_no: i + 1, title: t }))
    const { error } = await createClient().from('treatment_steps').insert(rows)
    if (error) return setErr('Qadam nahi ban sake: ' + error.message)
    await load()
  }
  async function toggle(s: Step) {
    setErr('')
    const nd = s.done_on ? null : todayKarachi()
    setSteps((cur) => (cur ? cur.map((x) => (x.id === s.id ? { ...x, done_on: nd } : x)) : cur))
    const { error } = await createClient().from('treatment_steps').update({ done_on: nd }).eq('id', s.id)
    if (error) setErr('Save nahi hua: ' + error.message)
    await load()
  }
  async function remove(s: Step) {
    setErr('')
    const { error } = await createClient().from('treatment_steps').delete().eq('id', s.id)
    if (error) return setErr('Hata nahi saka: ' + error.message)
    await load()
  }
  async function add() {
    const t = title.trim()
    if (!t) return
    setErr('')
    const next = steps && steps.length ? Math.max(...steps.map((s) => s.step_no)) + 1 : 1
    const { error } = await createClient().from('treatment_steps').insert({ treatment_id: treatmentId, step_no: next, title: t })
    if (error) return setErr('Qadam nahi ban saka: ' + error.message)
    setTitle('')
    await load()
  }

  const nextIdx = steps.findIndex((s) => !s.done_on)
  const doneN = steps.filter((s) => s.done_on).length

  return (
    <div className="mt-2 rounded-lg bg-clinic-mint/30 p-2 text-xs" data-testid="steps-box">
      {steps.length === 0 ? (
        <button type="button" onClick={make} data-testid="steps-make" className="font-semibold text-clinic-teal underline">
          Is ilaaj ke qadam banayein ({defaults.length} qadam)
        </button>
      ) : (
        <>
          <p className="font-semibold text-clinic-ink/70">
            Ilaaj ke qadam: {doneN}/{steps.length} ho gaye{nextIdx >= 0 ? ' · agla: ' + steps[nextIdx].title : ' · sab mukammal'}
          </p>
          <ul className="mt-1 grid gap-1">
            {steps.map((s, i) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2" data-testid="step-row">
                <input type="checkbox" aria-label={s.title} disabled={!canEdit} checked={Boolean(s.done_on)} onChange={() => toggle(s)} className="h-4 w-4" />
                <span className={s.done_on ? 'text-clinic-ink/60 line-through' : i === nextIdx ? 'font-semibold text-clinic-ink' : 'text-clinic-ink/80'}>
                  {s.step_no}. {s.title}
                </span>
                {s.done_on && <span className="text-clinic-ink/50">{fmtDate(s.done_on)}</span>}
                {canEdit && (
                  <button type="button" onClick={() => remove(s)} className="text-red-700 underline" aria-label={'Hatayein ' + s.title}>
                    Hatayein
                  </button>
                )}
              </li>
            ))}
          </ul>
          {canEdit && (
            <div className="mt-2 flex gap-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Naya qadam likhein" aria-label="Naya qadam likhein" className="min-w-0 flex-1 rounded-lg border border-clinic-teal/20 px-2 py-1" />
              <button type="button" onClick={add} data-testid="step-add" className="rounded-full border border-clinic-teal/40 px-3 py-1 font-semibold text-clinic-teal">
                Jodein
              </button>
            </div>
          )}
        </>
      )}
      {err && <p className="mt-1 text-red-700">{err}</p>}
    </div>
  )
}

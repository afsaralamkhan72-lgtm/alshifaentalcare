'use client'

import { HISTORY_STEPS, type Field } from '@/lib/history-steps'

type Data = Record<string, unknown>
const input = 'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'
const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm ${on ? 'bg-clinic-teal text-white' : 'bg-clinic-mint text-clinic-ink/70 hover:bg-clinic-teal/20'}`

/** Medical ya dental history ke sawal (pehle se bhare hue, badal sakte hain) */
export default function HistoryFields({ column, data, onChange, canEdit }: { column: 'medical_history' | 'dental_history'; data: Data; onChange: (d: Data) => void; canEdit: boolean }) {
  const step = HISTORY_STEPS.find((s) => s.column === column)!
  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v })
  const toggle = (k: string, o: string) => {
    const cur = ((data[k] as string[]) ?? []).slice()
    set(k, cur.includes(o) ? cur.filter((x) => x !== o) : [...cur.filter((x) => (o === 'None' ? false : x !== 'None')), o])
  }
  const visible = (f: Field) => !f.showIf || (typeof data[f.showIf.key] === 'string' && f.showIf.equals.includes(data[f.showIf.key] as string))

  return (
    <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
      {step.fields.filter(visible).map((f) => (
        <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
          <label className="text-sm font-medium text-clinic-ink">{f.label}</label>
          {f.type === 'radio' && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {f.options?.map((o) => (
                <button key={o} type="button" onClick={() => set(f.key, data[f.key] === o ? '' : o)} className={chip(data[f.key] === o)}>
                  {o}
                </button>
              ))}
            </div>
          )}
          {f.type === 'checkboxes' && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {f.options?.map((o) => (
                <button key={o} type="button" onClick={() => toggle(f.key, o)} className={chip(((data[f.key] as string[]) ?? []).includes(o))}>
                  {o}
                </button>
              ))}
            </div>
          )}
          {(f.type === 'text' || f.type === 'number' || f.type === 'date') && (
            <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} placeholder={f.placeholder} value={(data[f.key] as string) ?? ''} onChange={(e) => set(f.key, e.target.value)} className={input} />
          )}
          {f.type === 'textarea' && <textarea rows={2} placeholder={f.placeholder} value={(data[f.key] as string) ?? ''} onChange={(e) => set(f.key, e.target.value)} className={input} />}
        </div>
      ))}
    </fieldset>
  )
}

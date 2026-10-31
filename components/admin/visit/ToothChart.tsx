'use client'

import { useState } from 'react'
import { isPrimary, PRIMARY, toothLabel, toothName, localNumber } from '@/lib/teeth'
import ToothShape from '../ToothShape'
import { CONDITIONS, TOOTH_FILL } from '../DentalChart'

export interface Mark {
  tooth: string
  condition: string
  surfaces: string[]
  state: 'existing' | 'planned' | 'completed'
}
export interface OldRecord {
  tooth_number: string
  condition: string
  treatment_date: string
  created_at?: string | null
}

const UR = ['18', '17', '16', '15', '14', '13', '12', '11']
const UL = ['21', '22', '23', '24', '25', '26', '27', '28']
const LR = ['48', '47', '46', '45', '44', '43', '42', '41']
const LL = ['31', '32', '33', '34', '35', '36', '37', '38']
const SURFACES = ['M', 'O', 'D', 'B', 'L']
const STATES: { k: Mark['state']; l: string }[] = [
  { k: 'existing', l: 'Pehle se hai' },
  { k: 'planned', l: 'Karna hai' },
  { k: 'completed', l: 'Aaj kiya' },
]

/**
 * Aik hi chart: umar se khud tay hota hai — bachon (12 saal se kam) ka sirf A-E, baqi sab ka 1-8.
 * Daant sirf yahin aik baar chune jate hain; diagnosis aur treatment mein khud aa jate hain.
 */
export default function ToothChart({
  age,
  selected,
  onSelect,
  marks,
  onMarks,
  old,
  canEdit,
}: {
  age: number | null
  selected: string[]
  onSelect: (t: string[]) => void
  marks: Mark[]
  onMarks: (m: Mark[]) => void
  old: OldRecord[]
  canEdit: boolean
}) {
  const [kid, setKid] = useState(age != null && age < 12)
  const [condition, setCondition] = useState('caries')
  const [state, setState] = useState<Mark['state']>('existing')
  const [surf, setSurf] = useState<string[]>([])
  const canSwitch = age != null && age >= 6 && age < 12

  const markOf = (t: string) => marks.find((m) => m.tooth === t)
  const oldOf = (t: string) =>
    old
      .filter((r) => r.tooth_number === t)
      .sort((a, b) => b.treatment_date.localeCompare(a.treatment_date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]

  function switchTo(k: boolean) {
    setKid(k)
    onSelect(selected.filter((t) => isPrimary(t) === k))
    onMarks(marks.filter((m) => isPrimary(m.tooth) === k))
  }
  const toggle = (t: string) => onSelect(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t])

  function apply(c: string) {
    setCondition(c)
    if (selected.length === 0) return
    const rest = marks.filter((m) => !selected.includes(m.tooth))
    onMarks([...rest, ...selected.map((tooth) => ({ tooth, condition: c, surfaces: surf, state }))])
  }
  function clearSelected() {
    onMarks(marks.filter((m) => !selected.includes(m.tooth)))
  }

  const Tooth = ({ t, upper }: { t: string; upper: boolean }) => {
    const m = markOf(t)
    const o = oldOf(t)
    const cond = m?.condition ?? o?.condition
    const sel = selected.includes(t)
    return (
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => toggle(t)}
        title={`${toothLabel(t)}${cond ? ' · ' + cond : ''}`}
        className={`flex min-w-0 flex-1 flex-col items-center rounded-md px-0.5 py-1 ${sel ? 'bg-sky-100 ring-2 ring-sky-500' : 'hover:bg-clinic-mint'}`}
      >
        {upper && <span className="text-[10px] font-semibold text-clinic-ink/60">{toothName(t)}</span>}
        <ToothShape number={localNumber(t)} upper={upper} selected={false} fill={cond ? TOOTH_FILL[cond] : undefined} size={26} />
        {!upper && <span className="text-[10px] font-semibold text-clinic-ink/60">{toothName(t)}</span>}
        {m && <span className="text-[9px] text-clinic-teal">{m.state === 'planned' ? 'plan' : m.state === 'completed' ? 'done' : '•'}</span>}
      </button>
    )
  }

  const rows = kid
    ? { ur: PRIMARY.upperRight, ul: PRIMARY.upperLeft, lr: PRIMARY.lowerRight, ll: PRIMARY.lowerLeft }
    : { ur: UR, ul: UL, lr: LR, ll: LL }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-clinic-ink/70">{kid ? 'Bacche ka chart (doodh ke daant A-E)' : 'Bade daant (1-8)'}</span>
        {canSwitch && (
          <button type="button" onClick={() => switchTo(!kid)} className="rounded-full border border-clinic-teal/30 px-3 py-1 font-semibold text-clinic-teal">
            {kid ? 'Bade daant dikhayen' : 'Doodh ke daant dikhayen'}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="mx-auto min-w-[320px] max-w-2xl">
          <div className="flex">
            <div className="flex flex-1 border-r-2 border-clinic-ink/20">{rows.ur.map((t) => <Tooth key={t} t={t} upper />)}</div>
            <div className="flex flex-1">{rows.ul.map((t) => <Tooth key={t} t={t} upper />)}</div>
          </div>
          <div className="my-1 border-t-2 border-clinic-ink/20" />
          <div className="flex">
            <div className="flex flex-1 border-r-2 border-clinic-ink/20">{rows.lr.map((t) => <Tooth key={t} t={t} upper={false} />)}</div>
            <div className="flex flex-1">{rows.ll.map((t) => <Tooth key={t} t={t} upper={false} />)}</div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-clinic-ink/60">
        {selected.length ? (
          <>
            Chune hue daant: <b>{[...selected].sort().map(toothLabel).join(', ')}</b>{' '}
            <button type="button" onClick={() => onSelect([])} className="ml-1 text-clinic-teal underline">
              sab hatao
            </button>
          </>
        ) : canEdit ? (
          'Daant par dabayein (aik baar). Wohi daant diagnosis aur treatment mein khud aa jayenge.'
        ) : (
          'Chart sirf dekhne ke liye.'
        )}
      </p>

      {canEdit && selected.length > 0 && (
        <div className="mt-2 grid gap-2 rounded-xl bg-clinic-mint/50 p-3">
          <p className="text-xs font-semibold text-clinic-ink/70">Chune hue daanton par nishan (optional)</p>
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => apply(c.value)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${condition === c.value && selected.some((t) => markOf(t)?.condition === c.value) ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 bg-white text-clinic-ink/75'}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-clinic-ink/60">Surface:</span>
            {SURFACES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  const next = surf.includes(s) ? surf.filter((x) => x !== s) : [...surf, s]
                  setSurf(next)
                  onMarks(marks.map((m) => (selected.includes(m.tooth) ? { ...m, surfaces: next } : m)))
                }}
                className={`h-7 w-7 rounded-full font-semibold ${surf.includes(s) ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 bg-white'}`}
              >
                {s}
              </button>
            ))}
            <span className="ml-2 text-clinic-ink/60">Halat:</span>
            {STATES.map((s) => (
              <button
                key={s.k}
                type="button"
                onClick={() => {
                  setState(s.k)
                  onMarks(marks.map((m) => (selected.includes(m.tooth) ? { ...m, state: s.k } : m)))
                }}
                className={`rounded-full px-2.5 py-1 font-semibold ${state === s.k ? 'bg-clinic-ink/80 text-white' : 'border border-clinic-ink/20 bg-white text-clinic-ink/70'}`}
              >
                {s.l}
              </button>
            ))}
            <button type="button" onClick={clearSelected} className="ml-auto text-red-600">
              nishan hatao
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { isPrimary, PRIMARY, toothTitle as toothLabel, toothLabel as toothShort, toothName, localNumber } from '@/lib/teeth'
import ArchChart, { type ToothInfo } from './ArchChart'
import { CONDITIONS, TOOTH_FILL } from '../DentalChart'

export interface Mark {
  tooth: string
  condition: string
  surfaces: string[]
  state: 'existing' | 'planned' | 'completed'
  notes?: string
}
export interface OldRecord {
  tooth_number: string
  condition: string
  treatment_date: string
  created_at?: string | null
  state?: string | null
}

const UR = ['18', '17', '16', '15', '14', '13', '12', '11']
const UL = ['21', '22', '23', '24', '25', '26', '27', '28']
const LR = ['48', '47', '46', '45', '44', '43', '42', '41']
const LL = ['31', '32', '33', '34', '35', '36', '37', '38']

// Aam istemaal hone wale nishan pehle, baqi "Aur nishan" mein
const COMMON = ['caries', 'filling', 'rct', 'crown', 'missing', 'extraction', 'fracture', 'implant', 'bridge', 'denture']
// Masoorhon / perio ke nishan alag hissay mein
const GUM = ['calculus', 'plaque', 'bleeding', 'pocket', 'recession', 'mobility', 'furcation']
// Jo kaam doctor karta hai: chunne par wo aaj ka kaam (bill mein) ginta hai. Baqi masla/halat hain.
const WORK = ['filling', 'rct', 'crown', 'bridge', 'extraction', 'implant', 'scaling', 'denture', 'pulpotomy', 'pulpectomy', 'ssc', 'space_maintainer']
// Bachon (doodh ke daant) ke kaam: sirf tab dikhte hain jab doodh ka daant chuna ho
const PEDO = ['pulpotomy', 'pulpectomy', 'ssc', 'space_maintainer', 'exfoliation']
const SURFACES: { v: string; l: string }[] = [
  { v: 'M', l: 'M darmiyan ki taraf' },
  { v: 'O', l: 'O chabane ki sath' },
  { v: 'D', l: 'D door ki taraf' },
  { v: 'B', l: 'B gaal ki taraf' },
  { v: 'L', l: 'L zubaan ki taraf' },
]
const SURFACE_CONDS = ['caries', 'filling']

type Mode = 'adult' | 'milk' | 'both'

/**
 * Aik hi chart (visit, lab, sab jagah). Umar se khud tay hota hai:
 *   5 saal tak: doodh ke daant (A-E) | 6 se 11: dono | 12 se upar: pakke daant (1-8).
 * Phone par 16 daant aik line mein bohat chhote hote hain, isliye wahan aik hissa (quadrant) aik waqt mein bade size mein.
 * pickOnly = sirf daant chunna (lab form), nishan ya surface nahi.
 */
export default function ToothChart({
  age,
  selected,
  onSelect,
  marks = [],
  onMarks,
  old = [],
  canEdit,
  pickOnly = false,
  renderExtra,
}: {
  age: number | null
  selected: string[]
  onSelect: (t: string[]) => void
  marks?: Mark[]
  onMarks?: (m: Mark[]) => void
  old?: OldRecord[]
  canEdit: boolean
  pickOnly?: boolean
  /** Is daant ke liye masla / kaam likhne ka hissa (visit mein) */
  renderExtra?: (tooth: string) => React.ReactNode
}) {
  const [mode, setMode] = useState<Mode>(() => {
    if (selected.some(isPrimary) && selected.some((t) => !isPrimary(t))) return 'both'
    if (selected.some(isPrimary)) return 'milk'
    if (age != null && age < 6) return 'milk'
    if (age != null && age < 12) return 'both'
    return 'adult'
  })
  const canSwitch = true
  const [narrow, setNarrow] = useState(false)
  const [more, setMore] = useState(false)
  const [planLater, setPlanLater] = useState(false)
  const stateFor = (c: string): Mark['state'] => (WORK.includes(c) && !planLater ? 'completed' : planLater && WORK.includes(c) ? 'planned' : 'existing')

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Aik daant par aik se zyada nishan ho sakte hain (jaise Filling + Mobility)
  const marksOf = (t: string) => marks.filter((m) => m.tooth === t)
  const oldOf = (t: string) =>
    old
      .filter((r) => r.tooth_number === t && r.state !== 'planned')
      .sort((a, b) => b.treatment_date.localeCompare(a.treatment_date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]

  const [activeT, setActiveT] = useState('')
  const act = selected.includes(activeT) ? activeT : (selected[selected.length - 1] ?? '')
  // Nishan pehle sirf us daant par jo upar chuna hua hai; "sab par ek saath" tick karne par sab chune hue par
  const [bulk, setBulk] = useState(false)
  const targets = bulk && selected.length > 1 ? selected : act ? [act] : []
  const toggle = (t: string) => {
    if (!selected.includes(t)) setActiveT(t)
    onSelect(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t])
  }

  function apply(c: string) {
    if (!onMarks || targets.length === 0) return
    const same = (m: Mark, t: string) => m.tooth === t && m.condition === c
    const markState = stateFor(c)
    const allHave = targets.every((t) => marks.some((m) => same(m, t) && m.state === markState))
    if (allHave) {
      // wohi nishan wahi halat mein dobara dabane par hat jata hai
      onMarks(marks.filter((m) => !(targets.includes(m.tooth) && m.condition === c)))
      return
    }
    const kept = marks.map((m) => (targets.includes(m.tooth) && m.condition === c ? { ...m, state: markState } : m))
    const add = targets
      .filter((t) => !marks.some((m) => same(m, t)))
      .map((tooth) => ({ tooth, condition: c, surfaces: [] as string[], state: markState }))
    onMarks([...kept, ...add])
    setPlanLater(false)
  }
  function toggleSurface(s: string) {
    if (!onMarks) return
    const has = (m: Mark) => m.tooth === act && SURFACE_CONDS.includes(m.condition)
    const targets = marks.filter(has)
    const on = targets.length > 0 && targets.every((m) => m.surfaces.includes(s))
    onMarks(marks.map((m) => (has(m) ? { ...m, surfaces: on ? m.surfaces.filter((x) => x !== s) : [...new Set([...m.surfaces, s])] } : m)))
  }

  function setNote(v: string) {
    if (!onMarks) return
    onMarks(marks.map((m) => (m.tooth === act ? { ...m, notes: v } : m)))
  }

  const showAdult = mode !== 'milk'
  const showMilk = mode !== 'adult'

  const infoOf = (t: string): ToothInfo => {
    const ms = marksOf(t)
    const m = ms[0]
    const o = m ? undefined : oldOf(t)
    const cond = m?.condition ?? o?.condition
    return {
      sel: selected.includes(t),
      fill: cond && cond !== 'healthy' ? TOOTH_FILL[cond] : undefined,
      ghost: Boolean(o),
      cond,
      badge: ms.some((x) => x.state === 'planned') ? '⏳' : ms.some((x) => x.state === 'completed') ? '✓' : undefined,
    }
  }
  const archOf = (k: 'adultUpper' | 'adultLower' | 'kidsUpper' | 'kidsLower') => <ArchChart key={k} kind={k} canEdit={canEdit} info={infoOf} onToggle={toggle} />
  const arch = (
    <div className="px-1 py-4">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-1 flex text-[11px] font-semibold uppercase tracking-wide text-clinic-ink/45">
          <span className="flex-1 text-center">Seedha (patient ka seedha hath)</span>
          <span className="flex-1 text-center">Ulta</span>
        </div>
        {showAdult && archOf('adultUpper')}
        {showMilk && <div className={showAdult ? 'mt-2' : ''}>{archOf('kidsUpper')}</div>}
        <div className="my-2 border-t-2 border-clinic-ink/20" />
        {showMilk && archOf('kidsLower')}
        {showAdult && <div className={showMilk ? 'mt-2' : ''}>{archOf('adultLower')}</div>}
      </div>
    </div>
  )

  // ---- Chart par jo nishan hain un ka rang-legend ----
  const usedConds = [...new Set([...marks.map((m) => m.condition), ...old.filter((r) => !marksOf(r.tooth_number).length).map((r) => r.condition)])].filter((c) => c && c !== 'healthy')
  const hasGhost = old.some((r) => !marksOf(r.tooth_number).length)
  const showCard = !pickOnly && canEdit && selected.length > 0 && Boolean(onMarks)
  const inc = selected.length > 0 && selected.every((t) => ['1', '2', '3'].includes(localNumber(t)) && !isPrimary(t))

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-clinic-ink/70">
          {mode === 'milk' ? 'Doodh ke daant (A–E)' : mode === 'both' ? 'Pakke (1–8) aur doodh ke (A–E) daant' : 'Pakke daant (1–8)'}
        </span>
        {canSwitch && (
          <div className="flex overflow-hidden rounded-full border border-clinic-teal/30 text-xs font-semibold">
            {(
              [
                ['adult', 'Adult (32 Teeth)'],
                ['milk', 'Kids (20 Teeth)'],
                ['both', 'Dono'],
              ] as [Mode, string][]
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k} className={`px-3 py-1 ${mode === k ? 'bg-clinic-teal text-white' : 'text-clinic-teal'}`}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={showCard && !narrow ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-4' : ''}>
      <div className="min-w-0">
      {arch}

      <p className="mt-2 text-xs text-clinic-ink/60">
        {selected.length ? (
          <>
            Chune hue daant: <b>{[...selected].sort().map(toothLabel).join(', ')}</b>{' '}
            <button type="button" onClick={() => onSelect([])} className="ml-1 text-clinic-teal underline">
              sab hatao
            </button>
          </>
        ) : canEdit ? (
          pickOnly ? 'Daant par dabayein.' : 'Sirf wahi daant chunein jin par kaam ya nishan lagana hai (poore muh ka kaam, jaise scaling, ke liye kuch nahi chunna).'
        ) : (
          'Chart sirf dekhne ke liye.'
        )}
      </p>

      {!pickOnly && (usedConds.length > 0 || hasGhost) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-clinic-ink/65">
          {usedConds.map((c) => {
            const cd = CONDITIONS.find((x) => x.value === c)
            return (
              <span key={c} className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-sm border border-clinic-ink/20" style={{ background: TOOTH_FILL[c] ?? '#fff' }} />
                {cd?.label ?? c}
              </span>
            )
          })}
          {hasGhost && <span className="italic">halka rang = pichli visit ka</span>}
        </div>
      )}

      </div>

      {showCard && onMarks && (
        <>
        {narrow && <div className="h-[55vh]" aria-hidden="true" />}
        <div
          className={
            narrow
              ? 'fixed inset-x-0 bottom-0 z-40 grid max-h-[65vh] gap-2 overflow-y-auto rounded-t-2xl border-t border-clinic-teal/20 bg-white p-4 pb-6 shadow-[0_-10px_30px_rgba(20,43,80,0.25)]'
              : 'mt-3 grid gap-2 rounded-xl border border-sky-200 bg-sky-50/60 p-3 lg:sticky lg:top-3 lg:mt-0'
          }
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="grid h-12 min-w-12 place-items-center rounded-xl bg-sky-700 px-2 text-base font-bold text-white">{toothShort(act)}</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-clinic-ink/50">Chuna hua daant</p>
                <p className="text-sm font-semibold text-clinic-ink">{toothLabel(act)}</p>
              </div>
            </div>
            <button type="button" onClick={() => onSelect([])} className="rounded-full border border-clinic-ink/20 px-3 py-1 text-xs font-semibold text-clinic-ink/70">
              Band karein ✕
            </button>
          </div>
          {selected.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-clinic-ink/60">Surface/note kis daant ka:</span>
              {selected.map((t) => (
                <button key={t} type="button" onClick={() => setActiveT(t)} aria-pressed={t === act} className={`rounded-full px-2.5 py-1 font-semibold ${t === act ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 bg-white'}`}>
                  {toothLabel(t)}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs font-semibold text-clinic-ink/70">
            Nishan / kaam — {targets.length > 1 ? 'sab chune hue daanton par lagega' : <>sirf <span className="text-clinic-teal">{toothLabel(act)}</span> par lagega</>}
          </p>
          {selected.length > 1 && (
            <label className="flex items-center gap-2 text-xs text-clinic-ink/70">
              <input type="checkbox" checked={bulk} onChange={(e) => setBulk(e.target.checked)} className="h-4 w-4" />
              Sab chune hue daanton par ek saath lagayein
            </label>
          )}
          <label className="flex items-center gap-2 text-xs text-clinic-ink/70">
            <input type="checkbox" checked={planLater} onChange={(e) => setPlanLater(e.target.checked)} className="h-4 w-4" />
            Ye kaam aaj nahi, baad mein karna hai (plan mein jayega)
          </label>
          {(() => {
            const btn = (c: (typeof CONDITIONS)[number]) => {
              const on = targets.every((t) => marks.some((m) => m.tooth === t && m.condition === c.value && m.state === stateFor(c.value)))
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => apply(c.value)}
                  aria-pressed={on}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${on ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 bg-white text-clinic-ink/75'}`}
                >
                  <span className="h-3 w-3 rounded-sm border border-black/10" style={{ background: TOOTH_FILL[c.value] ?? '#fff' }} />
                  {c.label}
                </button>
              )
            }
            const rest = CONDITIONS.filter((c) => c.value !== 'healthy' && !COMMON.includes(c.value) && !GUM.includes(c.value) && !PEDO.includes(c.value))
            return (
              <>
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-clinic-ink/55">Daant</p>
                  <div className="flex flex-wrap gap-1.5">{CONDITIONS.filter((c) => COMMON.includes(c.value)).map(btn)}</div>
                </div>
                {selected.some(isPrimary) && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-clinic-ink/55">Bachon ke daant ka kaam</p>
                    <div className="flex flex-wrap gap-1.5">{CONDITIONS.filter((c) => PEDO.includes(c.value)).map(btn)}</div>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-clinic-ink/55">Masoorhe / gums</p>
                  <div className="flex flex-wrap gap-1.5">{CONDITIONS.filter((c) => GUM.includes(c.value)).map(btn)}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {more && rest.map(btn)}
                  {targets.some((t) => marksOf(t).length > 0) && (
                    <button type="button" onClick={() => onMarks(marks.filter((m) => !targets.includes(m.tooth)))} className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 underline">
                      Sab nishan hatao
                    </button>
                  )}
                  <button type="button" onClick={() => setMore(!more)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-clinic-teal underline">
                    {more ? 'Kam dikhayen' : 'Aur nishan'}
                  </button>
                </div>
                {selected.map((t) => {
                  const o = marksOf(t).length === 0 ? oldOf(t) : undefined
                  if (!o || o.condition === 'healthy') return null
                  return (
                    <p key={t} className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-clinic-ink/75">
                      Pehle ka nishan {toothLabel(t)}: <b>{CONDITIONS.find((x) => x.value === o.condition)?.label ?? o.condition}</b> ({o.treatment_date})
                      <button type="button" onClick={() => onMarks([...marks, { tooth: t, condition: 'healthy', surfaces: [], state: 'existing' }])} className="font-semibold text-clinic-teal underline">
                        Ab nahi hai (theek hai)
                      </button>
                    </p>
                  )
                })}
              </>
            )
          })()}
          {marksOf(act).some((m) => SURFACE_CONDS.includes(m.condition)) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-clinic-ink/60">Daant ka kaun sa hissa?</span>
              {SURFACES.map((s) => {
                const label = s.v === 'O' && inc ? { v: 'O', l: 'I samne ki dhaar' } : s
                const sm = marks.filter((m) => m.tooth === act && SURFACE_CONDS.includes(m.condition))
                const on = sm.length > 0 && sm.every((m) => m.surfaces.includes(s.v))
                return (
                  <button key={s.v} type="button" onClick={() => toggleSurface(s.v)} aria-pressed={on} title={label.l} className={`rounded-full px-2.5 py-1 font-semibold ${on ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 bg-white'}`}>
                    {label.l}
                  </button>
                )
              })}
            </div>
          )}
          {renderExtra?.(act)}
          <label className="grid gap-1 text-xs text-clinic-ink/60">
            Note ({toothLabel(act)})
            <textarea
              rows={2}
              value={marksOf(act)[0]?.notes ?? ''}
              disabled={marksOf(act).length === 0}
              onChange={(e) => setNote(e.target.value)}
              placeholder={marksOf(act).length === 0 ? 'Pehle is daant par koi nishan ya kaam chunein' : 'Is daant ke bare mein note (optional)'}
              className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm text-clinic-ink disabled:bg-clinic-ink/5"
            />
          </label>
        </div>
        </>
      )}
      </div>
    </div>
  )
}

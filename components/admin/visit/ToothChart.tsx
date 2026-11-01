'use client'

import { useEffect, useState } from 'react'
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

type Quad = 'UR' | 'UL' | 'LR' | 'LL'
const QUADS: { k: Quad; l: string; short: string; adult: string[]; milk: string[]; upper: boolean }[] = [
  { k: 'UR', l: 'Upar seedha', short: 'UR', adult: UR, milk: PRIMARY.upperRight, upper: true },
  { k: 'UL', l: 'Upar ulta', short: 'UL', adult: UL, milk: PRIMARY.upperLeft, upper: true },
  { k: 'LR', l: 'Neeche seedha', short: 'LR', adult: LR, milk: PRIMARY.lowerRight, upper: false },
  { k: 'LL', l: 'Neeche ulta', short: 'LL', adult: LL, milk: PRIMARY.lowerLeft, upper: false },
]

// Aam istemaal hone wale nishan pehle, baqi "Aur nishan" mein
const COMMON = ['caries', 'filling', 'rct', 'crown', 'missing', 'extraction', 'fracture', 'mobility', 'implant', 'calculus']
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
}: {
  age: number | null
  selected: string[]
  onSelect: (t: string[]) => void
  marks?: Mark[]
  onMarks?: (m: Mark[]) => void
  old?: OldRecord[]
  canEdit: boolean
  pickOnly?: boolean
}) {
  const [mode, setMode] = useState<Mode>(() => {
    if (selected.some(isPrimary) && selected.some((t) => !isPrimary(t))) return 'both'
    if (selected.some(isPrimary)) return 'milk'
    if (age != null && age < 6) return 'milk'
    if (age != null && age < 12) return 'both'
    return 'adult'
  })
  const canSwitch = age == null || (age >= 6 && age < 12) || pickOnly
  const [narrow, setNarrow] = useState(false)
  const [quad, setQuad] = useState<Quad>('UR')
  const [more, setMore] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const markOf = (t: string) => marks.find((m) => m.tooth === t)
  const oldOf = (t: string) =>
    old
      .filter((r) => r.tooth_number === t)
      .sort((a, b) => b.treatment_date.localeCompare(a.treatment_date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]

  const toggle = (t: string) => onSelect(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t])

  function apply(c: string) {
    if (!onMarks || selected.length === 0) return
    const allHave = selected.every((t) => markOf(t)?.condition === c)
    if (allHave) {
      // wohi nishan dobara dabane par hat jata hai
      onMarks(marks.filter((m) => !selected.includes(m.tooth)))
      return
    }
    const rest = marks.filter((m) => !selected.includes(m.tooth))
    onMarks([
      ...rest,
      ...selected.map((tooth) => ({ tooth, condition: c, surfaces: markOf(tooth)?.surfaces ?? [], state: 'existing' as const })),
    ])
  }
  function toggleSurface(s: string) {
    if (!onMarks) return
    const on = selected.every((t) => markOf(t)?.surfaces.includes(s))
    onMarks(
      marks.map((m) =>
        selected.includes(m.tooth) ? { ...m, surfaces: on ? m.surfaces.filter((x) => x !== s) : [...new Set([...m.surfaces, s])] } : m
      )
    )
  }

  const showAdult = mode !== 'milk'
  const showMilk = mode !== 'adult'
  const size = narrow ? 34 : 30

  function Tooth({ t, upper }: { t: string; upper: boolean }) {
    const m = markOf(t)
    const o = m ? undefined : oldOf(t)
    const cond = m?.condition ?? o?.condition
    const sel = selected.includes(t)
    const primary = isPrimary(t)
    return (
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => toggle(t)}
        aria-pressed={sel}
        aria-label={`${toothLabel(t)}${cond ? ' ' + cond : ''}`}
        title={`${toothLabel(t)}${cond ? ' · ' + cond : ''}${o ? ' (purani visit)' : ''}`}
        className={`relative flex min-w-0 flex-1 flex-col items-center rounded-lg px-0.5 py-1 transition-colors ${
          sel ? 'bg-sky-100 ring-2 ring-sky-600' : 'hover:bg-clinic-mint'
        } ${narrow ? 'min-h-[84px]' : ''}`}
      >
        {sel && (
          <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold leading-none text-white">✓</span>
        )}
        {upper && <span className={`text-[11px] font-bold ${sel ? 'text-sky-700' : 'text-clinic-ink/70'}`}>{toothName(t)}</span>}
        <ToothShape
          number={localNumber(t)}
          upper={upper}
          selected={sel}
          fill={cond && cond !== 'healthy' ? TOOTH_FILL[cond] : undefined}
          ghost={Boolean(o)}
          primary={primary}
          size={size}
        />
        {!upper && <span className={`text-[11px] font-bold ${sel ? 'text-sky-700' : 'text-clinic-ink/70'}`}>{toothName(t)}</span>}
        {m && m.surfaces.length > 0 && <span className="text-[9px] font-semibold text-clinic-teal">{m.surfaces.join('')}</span>}
      </button>
    )
  }

  const rowOf = (teeth: string[], upper: boolean) => (
    <div className="flex">
      {teeth.map((t) => (
        <Tooth key={t} t={t} upper={upper} />
      ))}
    </div>
  )

  // ---- Computer / bari screen: poora muh ----
  const wide = (
    <div className="mx-auto max-w-2xl">
      <div className="mb-1 flex text-[11px] font-semibold uppercase tracking-wide text-clinic-ink/45">
        <span className="flex-1 text-center">Seedha (patient ka seedha hath)</span>
        <span className="flex-1 text-center">Ulta</span>
      </div>
      <div className="flex">
        <span className="mr-1 w-10 self-center text-[11px] font-semibold text-clinic-ink/45">Upar</span>
        <div className="min-w-0 flex-1">
          {showAdult && (
            <div className="flex">
              <div className="flex flex-1 border-r-2 border-clinic-ink/25">{UR.map((t) => <Tooth key={t} t={t} upper />)}</div>
              <div className="flex flex-1">{UL.map((t) => <Tooth key={t} t={t} upper />)}</div>
            </div>
          )}
          {showMilk && (
            <div className="flex">
              <div className="flex flex-1 justify-end border-r-2 border-clinic-ink/25">{PRIMARY.upperRight.map((t) => <Tooth key={t} t={t} upper />)}</div>
              <div className="flex flex-1">{PRIMARY.upperLeft.map((t) => <Tooth key={t} t={t} upper />)}</div>
            </div>
          )}
        </div>
      </div>
      <div className="my-1 border-t-2 border-clinic-ink/25" />
      <div className="flex">
        <span className="mr-1 w-10 self-center text-[11px] font-semibold text-clinic-ink/45">Neeche</span>
        <div className="min-w-0 flex-1">
          {showMilk && (
            <div className="flex">
              <div className="flex flex-1 justify-end border-r-2 border-clinic-ink/25">{PRIMARY.lowerRight.map((t) => <Tooth key={t} t={t} upper={false} />)}</div>
              <div className="flex flex-1">{PRIMARY.lowerLeft.map((t) => <Tooth key={t} t={t} upper={false} />)}</div>
            </div>
          )}
          {showAdult && (
            <div className="flex">
              <div className="flex flex-1 border-r-2 border-clinic-ink/25">{LR.map((t) => <Tooth key={t} t={t} upper={false} />)}</div>
              <div className="flex flex-1">{LL.map((t) => <Tooth key={t} t={t} upper={false} />)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ---- Phone: aik hissa aik waqt mein, bade daant ----
  const q = QUADS.find((x) => x.k === quad) ?? QUADS[0]
  const inQuad = (k: Quad) => selected.filter((t) => (isPrimary(t) ? QUADS.find((x) => x.milk.includes(t))?.k : QUADS.find((x) => x.adult.includes(t))?.k) === k).length
  const phone = (
    <div>
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        {QUADS.map((x) => (
          <button
            key={x.k}
            type="button"
            onClick={() => setQuad(x.k)}
            aria-pressed={quad === x.k}
            className={`rounded-lg px-2 py-2 text-sm font-semibold ${quad === x.k ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 bg-white text-clinic-ink/75'}`}
          >
            {x.l}
            {inQuad(x.k) > 0 && <span className={`ml-1.5 rounded-full px-1.5 text-xs ${quad === x.k ? 'bg-white/25' : 'bg-sky-100 text-sky-700'}`}>{inQuad(x.k)}</span>}
          </button>
        ))}
      </div>
      <p className="mb-1 text-[11px] text-clinic-ink/55">
        {q.upper ? 'Upar ka jabda' : 'Neeche ka jabda'}, {q.k.endsWith('R') ? 'patient ka seedha hath' : 'patient ka ulta hath'}.
      </p>
      {showAdult && (
        <div>
          {showMilk && <p className="text-[11px] font-semibold text-clinic-ink/50">Pakke daant</p>}
          {rowOf(q.adult, q.upper)}
        </div>
      )}
      {showMilk && (
        <div className="mt-1">
          {showAdult && <p className="text-[11px] font-semibold text-clinic-ink/50">Doodh ke daant</p>}
          {rowOf(q.milk, q.upper)}
        </div>
      )}
    </div>
  )

  // ---- Chart par jo nishan hain un ka rang-legend ----
  const usedConds = [...new Set([...marks.map((m) => m.condition), ...old.filter((r) => !markOf(r.tooth_number)).map((r) => r.condition)])].filter((c) => c && c !== 'healthy')
  const hasGhost = old.some((r) => !markOf(r.tooth_number))
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
                ['adult', 'Pakke'],
                ['milk', 'Doodh ke'],
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

      {narrow ? phone : wide}

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

      {!pickOnly && canEdit && selected.length > 0 && onMarks && (
        <div className="mt-3 grid gap-2 rounded-xl bg-clinic-mint/50 p-3">
          <p className="text-xs font-semibold text-clinic-ink/70">Chune hue daanton par nishan (zaroori nahi)</p>
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.filter((c) => c.value !== 'healthy' && (more || COMMON.includes(c.value))).map((c) => {
              const on = selected.every((t) => markOf(t)?.condition === c.value)
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
            })}
            <button type="button" onClick={() => setMore(!more)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-clinic-teal underline">
              {more ? 'Kam dikhayen' : 'Aur nishan'}
            </button>
          </div>
          {selected.some((t) => SURFACE_CONDS.includes(markOf(t)?.condition ?? '')) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-clinic-ink/60">Daant ka kaun sa hissa?</span>
              {SURFACES.map((s) => {
                const label = s.v === 'O' && inc ? { v: 'O', l: 'I samne ki dhaar' } : s
                const on = selected.every((t) => markOf(t)?.surfaces.includes(s.v))
                return (
                  <button key={s.v} type="button" onClick={() => toggleSurface(s.v)} aria-pressed={on} title={label.l} className={`rounded-full px-2.5 py-1 font-semibold ${on ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 bg-white'}`}>
                    {label.l}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

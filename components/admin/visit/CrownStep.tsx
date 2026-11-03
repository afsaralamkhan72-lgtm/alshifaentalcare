'use client'

import { useMemo, useState } from 'react'
import { toothTitle as toothLabel } from '@/lib/teeth'
import type { CatalogOpt } from './types'

export interface CrownPick {
  name: string
  catalog_id: string | null
  teeth: string[]
  /** har daant ki qeemat (list se); null = doctor ne khud likhi */
  unit: number | null
  price: string
  planned: boolean
}

const NONE = '__none__'

/**
 * RCT ke baad crown: har daant ke liye alag type (Zirconia / PFM / ...) ya "nahi lagana".
 * Qeemat Price List se khud aati hai; list mein na ho to doctor khud likhta hai.
 */
export default function CrownStep({
  from,
  teeth,
  catalog,
  canBill,
  labHref,
  onAdd,
  onClose,
}: {
  from: string
  teeth: string[]
  catalog: CatalogOpt[]
  canBill: boolean
  labHref?: string
  onAdd: (picks: CrownPick[]) => void
  onClose: () => void
}) {
  const crowns = useMemo(() => catalog.filter((c) => /crown/i.test(c.name) && !/re-?cement|implant|temporary/i.test(c.name)), [catalog])
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [manual, setManual] = useState<Record<string, string>>({})
  const [planned, setPlanned] = useState(true)
  const list = teeth.length ? teeth : []

  const priceOf = (t: string): number | null => {
    const c = crowns.find((x) => x.id === choice[t])
    return c && c.price > 0 ? c.price : null
  }
  const chosen = list.filter((t) => choice[t] && choice[t] !== NONE)
  const needsManual = (t: string) => canBill && choice[t] && choice[t] !== NONE && priceOf(t) == null
  const missing = chosen.some((t) => needsManual(t) && !(Number(manual[t]) > 0))

  function add() {
    const picks: CrownPick[] = []
    const byType = new Map<string, string[]>()
    for (const t of chosen) byType.set(choice[t], [...(byType.get(choice[t]) ?? []), t])
    for (const [cid, ts] of byType) {
      const c = crowns.find((x) => x.id === cid)
      if (!c) continue
      if (c.price > 0) {
        picks.push({ name: c.name, catalog_id: c.id, teeth: ts, unit: c.price, price: String(c.price * ts.length), planned })
      } else {
        picks.push({ name: c.name, catalog_id: c.id, teeth: ts, unit: null, price: String(ts.reduce((s, t) => s + (Number(manual[t]) || 0), 0)), planned })
      }
    }
    if (picks.length) onAdd(picks)
    else onClose()
  }

  return (
    <div className="grid gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="crown-step">
      <p className="font-semibold">{from} ke baad aam tor par Crown lagta hai. Har daant ke liye chunein:</p>
      {list.length === 0 && <p className="text-xs">Daant ka pata nahi chala. Pehle upar chart se daant chunein.</p>}
      <div className="grid gap-2">
        {list.map((t) => {
          const v = choice[t] ?? ''
          const pr = priceOf(t)
          return (
            <div key={t} className="grid gap-1.5 rounded-lg bg-white/70 p-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
              <span className="font-semibold text-clinic-ink">{toothLabel(t)}</span>
              <select aria-label={`Crown ${toothLabel(t)}`} value={v} onChange={(e) => setChoice({ ...choice, [t]: e.target.value })} className="rounded-lg border border-clinic-teal/25 bg-white px-2 py-2 text-sm text-clinic-ink">
                <option value="">— chunein —</option>
                {crowns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.price > 0 && canBill ? ` — Rs. ${c.price}` : ''}
                  </option>
                ))}
                <option value={NONE}>Crown nahi lagana (patient nahi chahta)</option>
              </select>
              {v && v !== NONE && canBill && (pr != null ? <span className="text-xs font-semibold text-clinic-ink">Rs. {pr}</span> : <input type="number" min={0} aria-label="Qeemat" value={manual[t] ?? ''} onChange={(e) => setManual({ ...manual, [t]: e.target.value })} placeholder="Qeemat Rs. (list mein nahi)" className="w-40 rounded-lg border border-amber-400 bg-white px-2 py-2 text-sm text-clinic-ink" />)}
            </div>
          )
        })}
      </div>
      {crowns.length === 0 && <p className="text-xs">Price List mein koi Crown nahi mila. Settings → Price List mein Crown jorein.</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={() => setPlanned(true)} aria-pressed={planned} className={`rounded-full px-3 py-1 font-semibold ${planned ? 'bg-amber-500 text-white' : 'border border-clinic-ink/20 text-clinic-ink/60'}`}>
          Sirf plan (baad mein)
        </button>
        <button type="button" onClick={() => setPlanned(false)} aria-pressed={!planned} className={`rounded-full px-3 py-1 font-semibold ${!planned ? 'bg-emerald-600 text-white' : 'border border-clinic-ink/20 text-clinic-ink/60'}`}>
          Aaj bill mein
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={missing || chosen.length === 0} onClick={add} className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
          Crown {planned ? 'plan' : 'bill'} mein jorein{chosen.length ? ` (${chosen.length} daant)` : ''}
        </button>
        {labHref && (
          <a href={labHref} target="_blank" className="rounded-full border border-clinic-teal px-4 py-1.5 text-xs font-semibold text-clinic-teal">
            Seedha lab ke liye tayyar karein
          </a>
        )}
        <button type="button" onClick={onClose} className="text-xs underline">
          {list.length > 0 && list.every((t) => choice[t] === NONE) ? 'Theek hai, band karein' : 'Abhi nahi'}
        </button>
      </div>
      {missing && <p className="text-[11px] text-red-700">Jis crown ki qeemat list mein nahi, uski qeemat khud likhein.</p>}
    </div>
  )
}

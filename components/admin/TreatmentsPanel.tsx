'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toothLabel } from '@/lib/teeth'
import { addDays, todayKarachi, money, fmtDate } from '@/lib/karachi'
const VALID_TOOTH = /^([1-4][1-8]|[5-8][1-5])$/
import MediaStrip, { type MediaItem } from './MediaStrip'
import { uploadPatientFiles } from '@/lib/upload'

export interface TVisit {
  id: string
  visit_no: number | null
  visit_date: string
  procedure: string | null
  notes: string | null
  next_visit: string | null
}

export interface TItem {
  id: string
  name: string
  teeth: string[]
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  price: number
  list_price: number
  doctor: string | null
  started_on: string
  completed_on: string | null
  cancel_reason: string | null
  charged: number
  paid: number
  balance: number
  visits: TVisit[]
  /** Is treatment ki payments (receipt ke liye) */
  payments?: { id: string; paid_on: string; amount: number; method: string | null; kind: string }[]
  /** Visit / treatment ki tasveerein aur files */
  photos?: (MediaItem & { visit_id: string | null })[]
}

export interface MaterialOpt {
  inventory_id: string
  name: string
  unit: string | null
  default_qty: number
}

export interface CatalogOpt {
  id: string
  name: string
  price: number
  category: string | null
  department: string | null
}

interface Props {
  patientId: string
  department: string
  treatments: TItem[]
  catalog: CatalogOpt[]
  doctors: string[]
  defaultDoctor: string | null
  canEdit: boolean
  canBill: boolean
  canCollect: boolean
  canSeeMoney: boolean
  isOwner: boolean
  canLab?: boolean
  /** Price list ki har treatment ka aam samaan (stock se katne ke liye) */
  materials?: Record<string, MaterialOpt[]>
  /** Chart se aaya daant: form khud khul jata hai */
  startTeeth?: string[] | null
  onStartConsumed?: () => void
}

const METHODS = [
  { v: 'cash', l: 'Cash' },
  { v: 'bank', l: 'Bank' },
  { v: 'easypaisa', l: 'EasyPaisa' },
  { v: 'jazzcash', l: 'JazzCash' },
]

/** Treatment ke naam se chart ka rang (na mile to chart par nishan nahi) */
function chartCondition(name: string): string | null {
  const n = name.toLowerCase()
  if (/root canal|rct|pulp/.test(n)) return 'rct'
  if (/implant/.test(n)) return 'implant'
  if (/bridge/.test(n)) return 'bridge'
  if (/crown|veneer/.test(n)) return 'crown'
  if (/denture/.test(n)) return 'denture'
  if (/filling|capping/.test(n)) return 'filling'
  if (/extraction|wisdom|impacted/.test(n)) return 'extraction'
  if (/scaling|polish/.test(n)) return 'scaling'
  return null
}

const teethText = (t: string[]) => t.map(toothLabel).join(', ')
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()))
const inputClass =
  'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

/** Appointment ke waqt (clinic 10 se 8), bina type kiye chunne ke liye */
const TIME_SLOTS = (() => {
  const out: string[] = []
  for (let h = 10; h <= 20; h++)
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) continue
      const hh = h > 12 ? h - 12 : h
      out.push(`${hh}:${m === 0 ? '00' : '30'} ${h >= 12 ? 'PM' : 'AM'}`)
    }
  return out
})()

function NextVisitInput({
  value,
  onChange,
  time = '',
  onTime,
}: {
  value: string
  onChange: (v: string) => void
  time?: string
  onTime?: (v: string) => void
}) {
  const today = todayKarachi()
  return (
    <div>
      <label className="text-xs font-medium text-clinic-ink/70">Agla visit (appointment khud ban jayegi)</label>
      <div className="flex gap-2">
        <input type="date" value={value} min={today} onChange={(e) => onChange(e.target.value)} className={inputClass} />
        {onTime && (
          <select value={time} onChange={(e) => onTime(e.target.value)} className={`${inputClass} max-w-[7.5rem]`} disabled={!value}>
            <option value="">Waqt</option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {[3, 7, 14, 30].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(addDays(today, d))}
            className="rounded-full bg-clinic-mint px-2.5 py-0.5 text-[11px] font-semibold text-clinic-teal"
          >
            +{d < 30 ? `${d} din` : '1 mahina'}
          </button>
        ))}
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-[11px] text-clinic-ink/50">
            hatao
          </button>
        )}
      </div>
    </div>
  )
}

function PayFields({
  label,
  max,
  amount,
  setAmount,
  method,
  setMethod,
}: {
  label: string
  max: number
  amount: string
  setAmount: (v: string) => void
  method: string
  setMethod: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-xs font-medium text-clinic-ink/70">{label}</label>
        <input
          type="number"
          min={0}
          max={max > 0 ? max : undefined}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className={inputClass}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-clinic-ink/70">Tareeqa</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
          {METHODS.map((m) => (
            <option key={m.v} value={m.v}>
              {m.l}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* NAYI TREATMENT                                                       */
/* ------------------------------------------------------------------ */
function NewTreatmentForm({
  patientId,
  department,
  catalog,
  doctors,
  defaultDoctor,
  canBill,
  canCollect,
  isOwner,
  initialTeeth,
  materials = {},
  onClose,
}: {
  materials?: Record<string, MaterialOpt[]>
  patientId: string
  department: string
  catalog: CatalogOpt[]
  doctors: string[]
  defaultDoctor: string | null
  canBill: boolean
  canCollect: boolean
  isOwner: boolean
  initialTeeth: string[]
  onClose: () => void
}) {
  const router = useRouter()
  const keyRef = useRef(newKey()) // aik form = aik key: dobara click se dobara treatment/bill nahi banta
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<CatalogOpt | null>(null)
  const [name, setName] = useState('')
  const [teeth, setTeeth] = useState<string[]>(initialTeeth)
  const [teethInput, setTeethInput] = useState(initialTeeth.join(' '))
  const [price, setPrice] = useState('')
  const [paid, setPaid] = useState('')
  const [method, setMethod] = useState('cash')
  const [doctor, setDoctor] = useState(defaultDoctor ?? '')
  const [notes, setNotes] = useState('')
  const [nextVisit, setNextVisit] = useState('')
  const [nextTime, setNextTime] = useState('')
  const [planned, setPlanned] = useState(false)
  const [onChart, setOnChart] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [used, setUsed] = useState<Record<string, string>>({}) // inventory_id -> qty ('' = nahi)
  const [warn, setWarn] = useState('')

  const isDental = department === 'dental'
  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    const own = catalog.filter((c) => (isDental ? c.department !== 'homeopathic' : c.department !== 'dental'))
    const pool = own.length ? own : catalog
    return term ? pool.filter((c) => c.name.toLowerCase().includes(term) || (c.category ?? '').toLowerCase().includes(term)) : pool
  }, [q, catalog, isDental])

  const groups = useMemo(() => {
    const g = new Map<string, CatalogOpt[]>()
    for (const c of list) {
      const k = c.category || 'Doosri'
      if (!g.has(k)) g.set(k, [])
      g.get(k)!.push(c)
    }
    return [...g.entries()]
  }, [list])

  function pick(c: CatalogOpt) {
    setPicked(c)
    setName(c.name)
    setPrice(c.price > 0 ? String(c.price) : '')
    setQ('')
    setUsed(Object.fromEntries((materials[c.id] ?? []).map((m) => [m.inventory_id, String(m.default_qty)])))
  }
  const mats = picked && picked.name === name ? materials[picked.id] ?? [] : []

  const priceNum = Number(price) || 0
  const paidNum = Number(paid) || 0
  const cond = chartCondition(name)
  const belowList = picked && picked.price > 0 && priceNum < picked.price
  const total = priceNum

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setError('')
    if (!name.trim()) return setError('Treatment chunein ya naam likhein')
    if (paidNum > priceNum) return setError('Mili raqam qeemat se zyada nahi ho sakti')
    if (belowList && !isOwner) return setError('Price list se kam qeemat sirf doctor/admin de sakta hai')
    setSaving(true)
    const supabase = createClient()
    const { error: err } = await supabase.rpc('start_treatment', {
      p_patient_id: patientId,
      p_name: name.trim(),
      p_catalog_id: picked && picked.name === name ? picked.id : null,
      p_teeth: teeth,
      p_price: canBill ? priceNum : 0,
      p_paid: canCollect && !planned ? paidNum : 0,
      p_method: method,
      p_doctor: doctor || null,
      p_notes: notes || null,
      p_next_visit: planned ? null : nextVisit || null,
      p_chart_condition: !planned && onChart && cond && teeth.length > 0 ? cond : null,
      p_key: keyRef.current,
      p_next_time: planned ? null : nextTime || null,
      p_planned: planned,
    })
    if (err) {
      setSaving(false)
      return setError(err.message)
    }
    // Samaan stock se kaatein (treatment save ho chuki; stock kam ho to sirf warning)
    const usage = (planned ? [] : mats)
      .map((m) => ({ inventory_id: m.inventory_id, qty: Number(used[m.inventory_id]) || 0, treatment_id: picked?.id ?? null }))
      .filter((u) => u.qty > 0)
    if (usage.length > 0) {
      const { error: sErr } = await supabase.rpc('record_usage', {
        p_items: usage,
        p_patient_id: patientId,
        p_invoice_id: null,
        p_note: name.trim(),
        p_key: keyRef.current + ':stk',
      })
      if (sErr) {
        setSaving(false)
        setWarn('Treatment save ho gayi, magar samaan stock se nahi kata: ' + sErr.message)
        return
      }
    }
    setSaving(false)
    onClose()
    router.refresh()
  }

  if (warn) {
    return (
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm">
        <p className="text-amber-900">{warn}</p>
        <button
          onClick={() => {
            onClose()
            router.refresh()
          }}
          className="mt-3 rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white"
        >
          Theek hai
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={save} className="rounded-2xl border-2 border-clinic-teal/30 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-semibold text-clinic-ink">Nayi treatment</p>
        <button type="button" onClick={onClose} className="text-clinic-ink/40 hover:text-clinic-ink">
          ✕
        </button>
      </div>

      {/* 1. Kaunsi treatment */}
      <div className="mt-3">
        <label className="text-xs font-medium text-clinic-ink/70">Treatment</label>
        {picked && name === picked.name ? (
          <div className="mt-1 flex items-center justify-between rounded-lg bg-clinic-mint px-3 py-2 text-sm">
            <span className="font-semibold text-clinic-ink">
              {picked.name}
              {picked.price > 0 && <span className="ml-2 font-normal text-clinic-ink/60">list: {money(picked.price)}</span>}
            </span>
            <button type="button" onClick={() => { setPicked(null); setName('') }} className="text-xs text-clinic-teal">
              badlein
            </button>
          </div>
        ) : (
          <>
            <input
              autoFocus
              value={q || name}
              onChange={(e) => { setQ(e.target.value); setName(e.target.value); setPicked(null) }}
              placeholder="Talash karein (RCT, crown, scaling...) ya naya naam likhein"
              className={inputClass}
            />
            <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-clinic-teal/10">
              {groups.length === 0 ? (
                <p className="px-3 py-2 text-xs text-clinic-ink/50">List mein nahi. Yahi naam istemal hoga.</p>
              ) : (
                groups.map(([cat, items]) => (
                  <div key={cat}>
                    <p className="sticky top-0 bg-clinic-sand px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-clinic-ink/50">{cat}</p>
                    {items.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pick(c)}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-clinic-mint"
                      >
                        <span>{c.name}</span>
                        <span className="text-xs text-clinic-ink/50">{c.price > 0 ? `${money(c.price)}` : 'qeemat likhein'}</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* 2. Daant */}
      {isDental && (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-clinic-ink/70">
              Daant {teeth.length > 0 && <span className="font-semibold text-clinic-teal">: {teethText(teeth)}</span>}
            </label>
          </div>
          <input
            value={teethInput}
            onChange={(e) => {
              setTeethInput(e.target.value)
              setTeeth(Array.from(new Set(e.target.value.split(/[\s,]+/).filter((x) => VALID_TOOTH.test(x)))).sort())
            }}
            placeholder="Chart se daant chunein, ya yahan number likhein: 36 46 (bachon ke: 74 85)"
            className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
          />
          {cond && teeth.length > 0 && (
            <label className="mt-1.5 flex items-center gap-2 text-xs text-clinic-ink/60">
              <input type="checkbox" checked={onChart} onChange={(e) => setOnChart(e.target.checked)} />
              Chart par &quot;{cond.toUpperCase()}&quot; ka nishan lagao
            </label>
          )}
        </div>
      )}

      {/* Plan ya aaj se shuru */}
      <label className="mt-3 flex items-center gap-2 rounded-lg bg-clinic-mint/60 px-3 py-2 text-sm text-clinic-ink">
        <input type="checkbox" checked={planned} onChange={(e) => setPlanned(e.target.checked)} />
        Sirf <b>Treatment Plan</b> mein daalo (aaj shuru nahi, bill baad mein)
      </label>

      {/* 3. Paisa */}
      {canBill && (
        <div className="mt-3 rounded-xl bg-clinic-sand/60 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-clinic-ink/70">Qeemat (Rs.)</label>
              <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-clinic-ink/70">Doctor</label>
              <input list="doctor-list" value={doctor} onChange={(e) => setDoctor(e.target.value)} className={inputClass} />
              <datalist id="doctor-list">
                {doctors.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
          </div>
          {belowList && (
            <p className={`mt-1 text-xs ${isOwner ? 'text-amber-700' : 'text-red-600'}`}>
              Riyayat: {money(picked!.price - priceNum)} {isOwner ? '(bill par likha jayega)' : '(sirf doctor/admin de sakta hai)'}
            </p>
          )}
          {canCollect && total > 0 && !planned && (
            <div className="mt-2">
              <PayFields label="Abhi kitne mile" max={total} amount={paid} setAmount={setPaid} method={method} setMethod={setMethod} />
              {paidNum > 0 && paidNum < total && <p className="mt-1 text-xs text-clinic-ink/60">Baqaya: {money(total - paidNum)}</p>}
            </div>
          )}
          {total === 0 && <p className="mt-1 text-xs text-clinic-ink/50">Qeemat 0 = abhi koi bill nahi. Baad mein &quot;Agla visit&quot; mein charge likh sakte hain.</p>}
        </div>
      )}

      {/* Samaan (stock se katega) */}
      {mats.length > 0 && !planned && (
        <div className="mt-3">
          <p className="text-xs font-medium text-clinic-ink/70">Samaan istemal hua (stock se katega)</p>
          <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
            {mats.map((m) => (
              <label key={m.inventory_id} className="flex items-center gap-2 rounded-lg bg-clinic-sand/60 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={(used[m.inventory_id] ?? '') !== ''}
                  onChange={(e) => setUsed((u) => ({ ...u, [m.inventory_id]: e.target.checked ? String(m.default_qty) : '' }))}
                />
                <span className="flex-1">{m.name}</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={used[m.inventory_id] ?? ''}
                  onChange={(e) => setUsed((u) => ({ ...u, [m.inventory_id]: e.target.value }))}
                  className="w-16 rounded border border-clinic-teal/20 px-1.5 py-0.5 text-right text-xs"
                />
                <span className="text-xs text-clinic-ink/50">{m.unit}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 4. Pehla visit (V1) */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-clinic-ink/70">{planned ? 'Plan ki note' : 'Aaj kya kiya (V1)'}</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className={inputClass} />
        </div>
        {!planned && <NextVisitInput value={nextVisit} onChange={setNextVisit} time={nextTime} onTime={setNextTime} />}
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 w-full rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? 'Save ho raha hai...' : planned ? 'Plan mein save karein' : 'Treatment save karein'}
      </button>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/* AIK TREATMENT KA CARD                                                */
/* ------------------------------------------------------------------ */
function TreatmentCard({
  t,
  canEdit,
  canBill,
  canCollect,
  canSeeMoney,
  isOwner,
  patientId,
  canLab,
}: {
  t: TItem
  canEdit: boolean
  canBill: boolean
  canCollect: boolean
  canSeeMoney: boolean
  isOwner: boolean
  patientId: string
  canLab: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'none' | 'visit' | 'pay' | 'cancel' | 'begin'>('none')
  const [nextTime, setNextTime] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [showPays, setShowPays] = useState(false)
  const [price, setPrice] = useState(String(t.price || ''))
  const [showAll, setShowAll] = useState(false)
  const keyRef = useRef(newKey())
  const [procedure, setProcedure] = useState('')
  const [notes, setNotes] = useState('')
  const [nextVisit, setNextVisit] = useState('')
  const [extra, setExtra] = useState('')
  const [extraLabel, setExtraLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const visits = [...t.visits].sort((a, b) => (b.visit_no ?? 0) - (a.visit_no ?? 0))
  const last = visits[0]
  const nextNo = (last?.visit_no ?? 0) + 1
  const active = t.status === 'active'
  const isPlan = t.status === 'planned'
  const photosOf = (visitId: string | null) => (t.photos ?? []).filter((ph) => ph.visit_id === visitId)
  const lastPhotos = last ? photosOf(last.id) : []

  function open(m: typeof mode) {
    keyRef.current = newKey()
    setMode(m)
    setError('')
    setAmount('')
    setExtra('')
    setExtraLabel('')
    setNotes('')
    setProcedure('')
    setNextVisit('')
    setNextTime('')
    setFiles([])
    setReason('')
    setPrice(String(t.price || ''))
  }

  async function run(fn: () => PromiseLike<{ data?: unknown; error: { message: string } | null }>, uploadToVisit = false) {
    if (busy) return
    setBusy(true)
    setError('')
    const { data, error: err } = await fn()
    if (err) {
      setBusy(false)
      return setError(err.message)
    }
    // Visit save ho gaya; ab is visit ki tasveerein / files
    if (uploadToVisit && files.length > 0) {
      const res = await uploadPatientFiles(createClient(), patientId, files, {
        category: /ortho|braces|aligner/i.test(t.name) ? 'progress' : 'photo',
        treatment_id: t.id,
        visit_id: typeof data === 'string' ? data : null,
      })
      if (res.error) {
        setBusy(false)
        setMode('none')
        router.refresh()
        return setError('Visit save ho gaya, magar file: ' + res.error)
      }
    }
    setBusy(false)
    setMode('none')
    router.refresh()
  }

  const supabase = createClient()
  const extraNum = Number(extra) || 0
  const amtNum = Number(amount) || 0
  const dueAfterExtra = t.balance + extraNum

  return (
    <div className={`rounded-2xl border bg-white p-4 ${active ? 'border-clinic-teal/25' : 'border-clinic-ink/10 opacity-90'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-semibold text-clinic-ink">
            {t.name}
            {t.teeth.length > 0 && <span className="ml-2 text-sm font-medium text-clinic-teal">{teethText(t.teeth)}</span>}
          </p>
          <p className="text-xs text-clinic-ink/50">
            {isPlan ? 'Plan' : 'Shuru'} {fmtDate(t.started_on)}
            {isPlan && t.price > 0 ? ` · andaza ${money(t.price)}` : ''}
            {t.doctor ? ` · ${t.doctor}` : ''}
            {t.status === 'completed' && t.completed_on ? ` · Mukammal ${fmtDate(t.completed_on)}` : ''}
            {` · ${visits.length} visit`}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            active ? 'bg-emerald-50 text-emerald-700' : isPlan ? 'bg-amber-50 text-amber-700' : t.status === 'completed' ? 'bg-clinic-mint text-clinic-teal' : 'bg-red-50 text-red-700'
          }`}
        >
          {active ? 'Chal rahi' : isPlan ? 'Plan' : t.status === 'completed' ? 'Mukammal' : 'Cancel'}
        </span>
      </div>

      {canSeeMoney && t.status !== 'cancelled' && (t.charged > 0 || t.paid > 0) && (
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-clinic-sand/60 px-3 py-2 text-center text-xs">
          <div>
            <p className="text-clinic-ink/50">Kul</p>
            <p className="font-semibold text-clinic-ink">{money(t.charged)}</p>
          </div>
          <div>
            <p className="text-clinic-ink/50">Mile</p>
            <p className="font-semibold text-emerald-700">{money(t.paid)}</p>
          </div>
          <div>
            <p className="text-clinic-ink/50">Baqaya</p>
            <p className={`font-semibold ${t.balance > 0 ? 'text-red-600' : 'text-clinic-ink/60'}`}>{money(t.balance)}</p>
          </div>
        </div>
      )}
      {t.status === 'cancelled' && t.cancel_reason && <p className="mt-2 text-xs text-red-700">Cancel: {t.cancel_reason}</p>}

      {/* Visits: aakhri dikhta hai, baqi click par */}
      {visits.length > 0 && (
        <div className="mt-3 border-l-2 border-clinic-teal/20 pl-3">
          {(showAll ? visits : visits.slice(0, 1)).map((v) => (
            <div key={v.id} className="mb-2 text-sm">
              <p>
                <span className="mr-2 rounded bg-clinic-teal/10 px-1.5 py-0.5 text-[11px] font-bold text-clinic-teal">V{v.visit_no ?? '?'}</span>
                <span className="text-xs text-clinic-ink/50">{fmtDate(v.visit_date)}</span>
                {v.procedure && v.procedure !== t.name && <span className="ml-2 font-medium text-clinic-ink">{v.procedure}</span>}
              </p>
              {v.notes && <p className="mt-0.5 text-clinic-ink/70">{v.notes}</p>}
              {v.next_visit && <p className="text-xs text-clinic-teal">Agla visit: {fmtDate(v.next_visit)}</p>}
              <MediaStrip items={photosOf(v.id)} size={48} />
            </div>
          ))}
          {visits.length > 1 && (
            <button onClick={() => setShowAll(!showAll)} className="text-xs font-semibold text-clinic-teal">
              {showAll ? 'kam dikhao' : `sab ${visits.length} visits dekhein`}
            </button>
          )}
        </div>
      )}

      {canSeeMoney && (t.payments ?? []).length > 0 && (
        <div className="mt-2">
          <button onClick={() => setShowPays(!showPays)} className="text-xs font-semibold text-clinic-teal">
            {showPays ? '▾' : '▸'} Payments ({(t.payments ?? []).length})
          </button>
          {showPays && (
            <div className="mt-1 divide-y divide-clinic-teal/10 rounded-lg border border-clinic-teal/10 text-xs">
              {(t.payments ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-1.5">
                  <span>
                    {fmtDate(p.paid_on)} · <span className="capitalize">{p.method ?? ''}</span>
                    {p.kind === 'refund' && <span className="ml-1 font-semibold text-red-600">refund</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={p.kind === 'refund' ? 'text-red-600' : 'text-emerald-700'}>{money(p.amount)}</span>
                    <a href={`/admin/payments/${p.id}/receipt`} target="_blank" className="font-semibold text-clinic-teal hover:underline">
                      Receipt
                    </a>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      {mode === 'none' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {isPlan && canEdit && (
            <button onClick={() => open('begin')} className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white">
              Aaj shuru karein (V1)
            </button>
          )}
          {active && canEdit && (
            <button onClick={() => open('visit')} className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white">
              + Agla visit (V{nextNo})
            </button>
          )}
          {canCollect && t.balance > 0 && t.status !== 'cancelled' && (
            <button onClick={() => open('pay')} className="rounded-full border border-emerald-600 px-4 py-1.5 text-xs font-semibold text-emerald-700">
              Payment lo
            </button>
          )}
          {active && canEdit && (
            <button
              onClick={() => run(() => supabase.rpc('set_treatment_status', { p_treatment_id: t.id, p_status: 'completed' }))}
              className="rounded-full border border-clinic-teal/30 px-4 py-1.5 text-xs font-semibold text-clinic-ink/70"
            >
              Mukammal
            </button>
          )}
          {t.status === 'completed' && canEdit && (
            <button
              onClick={() => run(() => supabase.rpc('set_treatment_status', { p_treatment_id: t.id, p_status: 'active' }))}
              className="rounded-full border border-clinic-teal/30 px-4 py-1.5 text-xs font-semibold text-clinic-ink/70"
            >
              Dobara kholein
            </button>
          )}
          {t.status !== 'cancelled' && canEdit && (t.charged === 0 || isOwner) && (
            <button onClick={() => open('cancel')} className="px-2 py-1.5 text-xs text-red-600 hover:underline">
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Agla visit */}
      {mode === 'visit' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (amtNum > dueAfterExtra) return setError(`Raqam baqaya (${money(dueAfterExtra)}) se zyada hai`)
            run(() =>
              supabase.rpc('continue_treatment', {
                p_treatment_id: t.id,
                p_notes: notes || null,
                p_procedure: procedure || null,
                p_next_visit: nextVisit || null,
                p_extra_charge: canBill ? extraNum : 0,
                p_extra_label: extraLabel || null,
                p_paid: canCollect ? amtNum : 0,
                p_method: method,
                p_key: keyRef.current,
                p_next_time: nextTime || null,
              }),
              true
            )
          }}
          className="mt-3 rounded-xl border border-clinic-teal/20 bg-clinic-mint/30 p-3"
        >
          <p className="text-sm font-semibold text-clinic-ink">Visit V{nextNo}</p>
          {last && (
            <div className="mt-1 rounded-lg bg-white px-3 py-2 text-xs text-clinic-ink/70">
              <span className="font-semibold">Pichla (V{last.visit_no}, {fmtDate(last.visit_date)}):</span> {last.procedure}
              {last.notes ? ` — ${last.notes}` : ''}
              {canSeeMoney && t.charged > 0 ? ` · Kul ${money(t.charged)}, mile ${money(t.paid)}, baqaya ${money(t.balance)}` : ''}
              {last.next_visit ? ` · appointment thi ${fmtDate(last.next_visit)}` : ''}
              <MediaStrip items={lastPhotos} size={44} />
            </div>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-clinic-ink/70">Aaj kya kiya</label>
              <input value={procedure} onChange={(e) => setProcedure(e.target.value)} placeholder={t.name} className={inputClass} />
            </div>
            <NextVisitInput value={nextVisit} onChange={setNextVisit} time={nextTime} onTime={setNextTime} />
          </div>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className={inputClass} />
          <label className="mt-2 block text-xs font-medium text-clinic-ink/70">
            Tasveer / X-ray (optional)
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="mt-1 block w-full text-xs"
            />
          </label>
          {canBill && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-clinic-ink/70">Extra charge (agar ho)</label>
                <input type="number" min={0} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="0" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-clinic-ink/70">Kis cheez ka</label>
                <input value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} placeholder="X-ray, medicine..." className={inputClass} />
              </div>
            </div>
          )}
          {canCollect && dueAfterExtra > 0 && (
            <div className="mt-2">
              <PayFields label={`Aaj mile (baqaya ${money(dueAfterExtra)})`} max={dueAfterExtra} amount={amount} setAmount={setAmount} method={method} setMethod={setMethod} />
            </div>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button disabled={busy} className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? 'Save...' : `V${nextNo} save karein`}
            </button>
            <button type="button" onClick={() => setMode('none')} className="text-sm text-clinic-ink/60">
              Wapas
            </button>
          </div>
        </form>
      )}

      {/* Plan se shuru */}
      {mode === 'begin' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const pr = Number(price) || 0
            if (amtNum > pr) return setError('Mili raqam qeemat se zyada nahi ho sakti')
            run(() =>
              supabase.rpc('begin_planned_treatment', {
                p_treatment_id: t.id,
                p_price: canBill ? pr : 0,
                p_paid: canCollect ? amtNum : 0,
                p_method: method,
                p_notes: notes || null,
                p_next_visit: nextVisit || null,
                p_next_time: nextTime || null,
                p_chart_condition: chartCondition(t.name),
                p_key: keyRef.current,
              })
            )
          }}
          className="mt-3 rounded-xl border border-clinic-teal/20 bg-clinic-mint/30 p-3"
        >
          <p className="text-sm font-semibold text-clinic-ink">Aaj shuru: V1</p>
          {canBill && (
            <div className="mt-2">
              <label className="text-xs font-medium text-clinic-ink/70">Qeemat (Rs.)</label>
              <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
            </div>
          )}
          {canCollect && Number(price) > 0 && (
            <div className="mt-2">
              <PayFields label="Aaj mile" max={Number(price)} amount={amount} setAmount={setAmount} method={method} setMethod={setMethod} />
            </div>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Aaj kya kiya" className={inputClass} />
            <NextVisitInput value={nextVisit} onChange={setNextVisit} time={nextTime} onTime={setNextTime} />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button disabled={busy} className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? 'Save...' : 'Shuru karein'}
            </button>
            <button type="button" onClick={() => setMode('none')} className="text-sm text-clinic-ink/60">
              Wapas
            </button>
          </div>
        </form>
      )}

      {/* Sirf payment */}
      {mode === 'pay' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (amtNum <= 0) return setError('Raqam likhein')
            if (amtNum > t.balance) return setError(`Raqam baqaya (${money(t.balance)}) se zyada hai`)
            run(() =>
              supabase.rpc('pay_treatment', { p_treatment_id: t.id, p_amount: amtNum, p_method: method, p_note: null, p_key: keyRef.current })
            )
          }}
          className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3"
        >
          <PayFields label={`Raqam (baqaya ${money(t.balance)})`} max={t.balance} amount={amount} setAmount={setAmount} method={method} setMethod={setMethod} />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button disabled={busy} className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? 'Save...' : 'Payment save'}
            </button>
            <button type="button" onClick={() => setAmount(String(t.balance))} className="text-xs text-emerald-700">
              poora baqaya
            </button>
            <button type="button" onClick={() => setMode('none')} className="text-sm text-clinic-ink/60">
              Wapas
            </button>
          </div>
        </form>
      )}

      {/* Cancel */}
      {mode === 'cancel' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!reason.trim()) return setError('Wajah likhein')
            run(() => supabase.rpc('set_treatment_status', { p_treatment_id: t.id, p_status: 'cancelled', p_reason: reason.trim() }))
          }}
          className="mt-3 rounded-xl border border-red-200 bg-red-50/40 p-3"
        >
          <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cancel ki wajah (zaroori)" className={inputClass} />
          {t.charged > 0 && (
            <p className="mt-1 text-xs text-red-700">
              Is ka bill cancel hoga{t.paid > 0 ? ` aur liye gaye ${money(t.paid)} wapas (refund) likhe jayenge` : ''}. Record mehfooz rehta hai.
            </p>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button disabled={busy} className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? '...' : 'Cancel kar do'}
            </button>
            <button type="button" onClick={() => setMode('none')} className="text-sm text-clinic-ink/60">
              Wapas
            </button>
          </div>
        </form>
      )}
      {mode === 'none' && error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
export default function TreatmentsPanel(props: Props) {
  const { treatments, startTeeth, onStartConsumed } = props
  const [formOpen, setFormOpen] = useState(false)
  const [formTeeth, setFormTeeth] = useState<string[]>([])
  const [formKey, setFormKey] = useState(0)
  const [showClosed, setShowClosed] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (startTeeth && startTeeth.length) {
      setFormTeeth(startTeeth)
      setFormKey((k) => k + 1)
      setFormOpen(true)
      onStartConsumed?.()
      setTimeout(() => boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }, [startTeeth, onStartConsumed])

  const activeList = treatments.filter((t) => t.status === 'active')
  const planList = treatments.filter((t) => t.status === 'planned')
  const closed = treatments.filter((t) => t.status === 'completed' || t.status === 'cancelled')

  return (
    <div ref={boxRef} className="scroll-mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">
          Treatments {activeList.length > 0 && <span className="text-sm font-normal text-clinic-ink/50">({activeList.length} chal rahi)</span>}
        </h2>
        {props.canEdit && !formOpen && (
          <button
            onClick={() => {
              setFormTeeth([])
              setFormKey((k) => k + 1)
              setFormOpen(true)
            }}
            className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white"
          >
            + Nayi treatment
          </button>
        )}
      </div>

      {formOpen && (
        <div className="mt-3">
          <NewTreatmentForm
            key={formKey}
            patientId={props.patientId}
            department={props.department}
            catalog={props.catalog}
            doctors={props.doctors}
            defaultDoctor={props.defaultDoctor}
            canBill={props.canBill}
            canCollect={props.canCollect}
            isOwner={props.isOwner}
            initialTeeth={formTeeth}
            materials={props.materials}
            onClose={() => setFormOpen(false)}
          />
        </div>
      )}

      <div className="mt-3 grid gap-3">
        {activeList.length === 0 && !formOpen && (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 bg-white p-5 text-center text-sm text-clinic-ink/50">
            Koi chalti treatment nahi. {props.canEdit ? '"+ Nayi treatment" dabayein ya chart par daant chunein.' : ''}
          </p>
        )}
        {activeList.map((t) => (
          <TreatmentCard key={t.id} t={t} canEdit={props.canEdit} canBill={props.canBill} canCollect={props.canCollect} canSeeMoney={props.canSeeMoney} isOwner={props.isOwner} patientId={props.patientId} canLab={props.canLab ?? false} />
        ))}
      </div>

      {planList.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-amber-800">Treatment Plan ({planList.length}) — abhi shuru nahi</p>
          <div className="mt-2 grid gap-3">
            {planList.map((t) => (
              <TreatmentCard key={t.id} t={t} canEdit={props.canEdit} canBill={props.canBill} canCollect={props.canCollect} canSeeMoney={props.canSeeMoney} isOwner={props.isOwner} patientId={props.patientId} canLab={false} />
            ))}
          </div>
        </div>
      )}

      {closed.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowClosed(!showClosed)} className="text-sm font-semibold text-clinic-teal">
            {showClosed ? '▾' : '▸'} Mukammal / cancel treatments ({closed.length})
          </button>
          {showClosed && (
            <div className="mt-2 grid gap-3">
              {closed.map((t) => (
                <TreatmentCard key={t.id} t={t} canEdit={props.canEdit} canBill={props.canBill} canCollect={props.canCollect} canSeeMoney={props.canSeeMoney} isOwner={props.isOwner} patientId={props.patientId} canLab={props.canLab ?? false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

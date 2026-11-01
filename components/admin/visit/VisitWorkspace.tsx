'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtDate, money, todayKarachi, addDays } from '@/lib/karachi'
import { toothLabel } from '@/lib/teeth'
import type { CatalogOpt, MaterialOpt, TItem } from './types'
import ToothChart, { type Mark } from './ToothChart'
import HistoryFields from './HistoryFields'
import { friendlyError } from '@/lib/errors'
import { COMPLAINTS, HOMEO_COMPLAINTS, DIAG_SUGGEST } from '@/lib/clinicOptions'
import { CLINIC } from '@/clinic.config'
import { toInternationalPKNumber } from '@/lib/whatsapp'

/* ------------------------------------------------------------------ */
export interface VisitRow {
  id: string
  status: 'draft' | 'finished'
  visit_date: string
  complaint: Complaint
  findings: Record<string, string>
  diagnoses: Diagnosis[]
  notes: string | null
  doctor: string | null
  next_date: string | null
  next_time: string | null
  next_treatment_id: string | null
  invoice_id: string | null
  appointment_id: string | null
}
interface Complaint {
  items?: string[]
  other?: string
  duration?: string
  severity?: string
  location?: string
}
interface Diagnosis {
  text: string
  teeth?: string[]
}
export interface MedOpt {
  id: string
  category: 'dental' | 'homeopathic'
  name: string
  strength: string | null
  potency: string | null
  dosage_form: string | null
  default_dose: string | null
  default_frequency: string | null
  default_duration: string | null
  instructions: string | null
  price: number
  available: boolean
  stock_qty: number | null
}
interface RxLine {
  key: string
  medicine_id: string | null
  name: string
  strength: string
  potency: string
  dose: string
  frequency: string
  duration: string
  instructions: string
  mode: 'rx' | 'dispense'
  qty: string
  price: number
  available: boolean
}
interface ChartRecord {
  tooth_number: string
  condition: string
  treatment_date: string
  created_at?: string | null
}
/** Naye treatment ki qatar */
interface TRow {
  key: string
  name: string
  catalog_id: string | null
  teeth: string[]
  price: string
  planned: boolean
  notes: string
  mats: Record<string, string>
  /** kaise lagti hai: har daant ki / poora muh / jabda / aik dafa */
  applies: Applies
  /** har daant ki qeemat (list se); price = unit x daanton ki ginti, jab tak doctor khud qeemat na badle */
  unit: number | null
  manual: boolean
  jaw: '' | 'Upar' | 'Neeche' | 'Upar aur Neeche'
}
type Applies = 'tooth' | 'mouth' | 'jaw' | 'once'
const APPLIES_LABEL: Record<Applies, string> = { tooth: 'Har daant ki', mouth: 'Poora muh', jaw: 'Jabda', once: 'Aik dafa' }
const autoPrice = (r: { applies: Applies; unit: number | null; manual: boolean; price: string }, teeth: string[]) =>
  r.applies === 'tooth' && r.unit != null && !r.manual ? String(r.unit * Math.max(1, teeth.length)) : r.price
/** Pehle se chalti / plan wali treatment: aaj ka visit */
interface OldRow {
  tick: boolean
  notes: string
  price: string
}

interface Props {
  patient: { id: string; full_name: string; phone: string; department: string; age: number | null }
  visit: VisitRow | null
  finishedToday: { id: string; hasInvoice: boolean; prescription_id: string | null } | null
  startedMarks: Mark[]
  history: { medical_history: Record<string, unknown>; dental_history: Record<string, unknown> }
  chartRecords: ChartRecord[]
  treatments: TItem[]
  catalog: CatalogOpt[]
  materials: Record<string, MaterialOpt[]>
  doctors: string[]
  defaultDoctor: string | null
  medicines: MedOpt[]
  balance: number
  /** pehli dafa ijazat (consent) kab li gayi; null = abhi nahi */
  consentAt?: string | null
  /** Settings se aayi hui chips ki list (khali ho to default) */
  opts?: { complaint: string[]; homeo_complaint: string[]; diagnosis: string[] }
  isFirstVisit?: boolean
  hasPlanned?: boolean
  xraySlot?: ReactNode
  plansSlot?: ReactNode
  pastRx?: { id: string; date: string; names: string }[]
  perms: { clinicalView: boolean; clinicalEdit: boolean; bill: boolean; collect: boolean; money: boolean; owner: boolean; rx: boolean }
}

const DURATIONS = ['Aaj se', '2-3 din', '1 hafta', '2 hafte', '1 mahina', '1 mahine se zyada']
const SEVERITY = ['Halka', 'Darmiyana', 'Shadeed']
const FINDINGS = [
  { k: 'extraoral', l: 'Extraoral (chehra, jabra)' },
  { k: 'intraoral', l: 'Intraoral aur soft tissue (munh ke andar)' },
  { k: 'periodontal', l: 'Periodontal (masoorhe)' },
]
const SLOTS = (() => {
  const out: string[] = []
  for (let h = 10; h <= 20; h++)
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) continue
      out.push(`${h > 12 ? h - 12 : h}:${m ? '30' : '00'} ${h >= 12 ? 'PM' : 'AM'}`)
    }
  return out
})()
const input = 'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()))

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={`s${n}`} className="scroll-mt-20 rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
      <h2 className="mb-3 font-display text-lg font-semibold text-clinic-ink">
        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-clinic-teal text-sm text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Chune hue daanton ki tick-chips (diagnosis / treatment ki qatar mein) */
function TeethChips({ all, picked, onChange }: { all: string[]; picked: string[]; onChange: (t: string[]) => void }) {
  if (all.length === 0) return <span className="text-xs text-clinic-ink/40">chart se daant chunein</span>
  return (
    <span className="flex flex-wrap gap-1">
      {[...all].sort().map((t) => {
        const on = picked.includes(t)
        return (
          <button key={t} type="button" onClick={() => onChange(on ? picked.filter((x) => x !== t) : [...picked, t])} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${on ? 'bg-sky-600 text-white' : 'border border-clinic-ink/20 text-clinic-ink/50'}`}>
            {on ? '✓ ' : ''}
            {toothLabel(t)}
          </button>
        )
      })}
    </span>
  )
}

/* ------------------------------------------------------------------ */
export default function VisitWorkspace(p: Props) {
  const router = useRouter()
  const v = p.visit
  const homeo = p.patient.department === 'homeopathic'
  const canEdit = p.perms.clinicalEdit
  const finishKey = useRef(newKey())
  const visitId = useRef<string | null>(v?.id ?? null)
  const [busy, setBusy] = useState<'' | 'save' | 'finish'>('')
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [showForm, setShowForm] = useState(!p.finishedToday || p.visit !== null)
  const [done, setDone] = useState<{ visit_id: string; prescription_id: string | null; hasInvoice: boolean } | null>(null)

  // doctor jis ke naam par aaj ka visit (income by doctor report isi se banti hai)
  const [doctor, setDoctor] = useState(v?.doctor ?? p.defaultDoctor ?? '')
  const [confirmDone, setConfirmDone] = useState<string | null>(null)

  // 2, 3 history
  const [medical, setMedical] = useState<Record<string, unknown>>(p.history.medical_history)
  const [dental, setDental] = useState<Record<string, unknown>>(p.history.dental_history)
  // 4, 5
  const [cItems, setCItems] = useState<string[]>(v?.complaint?.items ?? [])
  const [cOther, setCOther] = useState(v?.complaint?.other ?? '')
  const [cDur, setCDur] = useState(v?.complaint?.duration ?? '')
  const [cSev, setCSev] = useState(v?.complaint?.severity ?? '')
  const [cLoc, setCLoc] = useState(v?.complaint?.location ?? '')
  const [findings, setFindings] = useState<Record<string, string>>(v?.findings ?? {})
  // 6 chart
  const [sel, setSel] = useState<string[]>([])
  const [marks, setMarks] = useState<Mark[]>(p.startedMarks)
  // 8 diagnosis
  const [diags, setDiags] = useState<Diagnosis[]>(v?.diagnoses?.length ? v.diagnoses : [])
  // 9 treatment
  const [rows, setRows] = useState<TRow[]>([])
  const live = p.treatments.filter((t) => t.status === 'active' || t.status === 'planned')
  const [old, setOld] = useState<Record<string, OldRow>>({})
  // 10 prescription
  const [rxCat, setRxCat] = useState<'dental' | 'homeopathic'>(homeo ? 'homeopathic' : 'dental')
  const [rxQ, setRxQ] = useState('')
  const [lines, setLines] = useState<RxLine[]>([])
  const [rxNotes, setRxNotes] = useState('')
  // 11 bill
  const [extra, setExtra] = useState<{ label: string; amount: string }[]>([])
  const [discount, setDiscount] = useState('')
  const [paid, setPaid] = useState('')
  const [method, setMethod] = useState('cash')
  // 12 next
  const [nextDate, setNextDate] = useState(v?.next_date ?? '')
  const [nextTime, setNextTime] = useState(v?.next_time ?? '')
  const [nextT, setNextT] = useState(v?.next_treatment_id ?? '')
  // Recall (dobara bulana): 3 / 6 / 12 mahine
  const hasScaling = () => rows.some((r) => /scal|polish/i.test(r.name))
  const [recallM, setRecallM] = useState<string>('')
  const [recallTouched, setRecallTouched] = useState(false)
  const recallEff = recallTouched ? recallM : hasScaling() ? '6' : ''
  const [consent, setConsent] = useState(Boolean(p.consentAt))

  // Browser mein baqi form ki nakal (Save ke baad bhi treatment / dawa / bill ki qataren wapas aa jayen). Finish par saaf.
  const draftKey = `alshifa-visit:${p.patient.id}:${todayKarachi()}`
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    try {
      // Visit doosre device par khatam ho chuka ho to yahan ka purana draft wapas na aaye
      if (p.finishedToday && !p.visit) {
        localStorage.removeItem(draftKey)
        setRestored(true)
        return
      }
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const d = JSON.parse(raw)
        if (Array.isArray(d.rows)) setRows(d.rows)
        if (d.old && typeof d.old === 'object') setOld(d.old)
        if (Array.isArray(d.lines)) setLines(d.lines)
        if (typeof d.rxNotes === 'string') setRxNotes(d.rxNotes)
        if (Array.isArray(d.extra)) setExtra(d.extra)
        if (Array.isArray(d.sel)) setSel(d.sel)
        if (typeof d.paid === 'string') setPaid(d.paid)
      }
    } catch {}
    setRestored(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])
  useEffect(() => {
    if (!restored || done) return
    try {
      localStorage.setItem(draftKey, JSON.stringify({ rows, old, lines, rxNotes, extra, sel, paid }))
    } catch {}
  }, [restored, done, draftKey, rows, old, lines, rxNotes, extra, sel, paid])

  /** Daant aik baar chunne par diagnosis / treatment ki qataron mein khud aa jaate hain */
  function pickTeeth(next: string[]) {
    const added = next.filter((t) => !sel.includes(t))
    const fix = (teeth: string[] | undefined) => [...(teeth ?? []).filter((t) => next.includes(t)), ...added]
    setSel(next)
    setDiags((ds) => ds.map((d) => ({ ...d, teeth: fix(d.teeth) })))
    setRows((rs) => rs.map((r) => (r.applies !== 'tooth' ? r : { ...r, teeth: fix(r.teeth), price: autoPrice(r, fix(r.teeth)) })))
  }

  const data = () => ({
    complaint: { items: cItems, other: cOther, duration: cDur, severity: cSev, location: cLoc },
    findings,
    diagnoses: diags.filter((d) => d.text.trim()),
    next_date: nextDate || '',
    next_time: nextDate ? nextTime : '',
    next_treatment_id: nextDate ? nextT : '',
    ...(doctor ? { doctor } : {}), // khali bhejne se RPC ka khud ka (login doctor) wala naam mit jata
    history: { medical_history: medical, dental_history: dental },
    chart: homeo ? [] : marks,
  })

  const meds = useMemo(() => {
    const t = rxQ.trim().toLowerCase()
    return p.medicines.filter((m) => m.category === rxCat && (!t || m.name.toLowerCase().includes(t))).slice(0, 12)
  }, [p.medicines, rxCat, rxQ])

  function addMed(m: MedOpt | null) {
    setLines((ls) => [
      ...ls,
      {
        key: newKey(),
        medicine_id: m?.id ?? null,
        name: m ? m.name : rxQ.trim(),
        strength: m?.strength ?? '',
        potency: m?.potency ?? '',
        dose: m?.default_dose ?? '',
        frequency: m?.default_frequency ?? '',
        duration: m?.default_duration ?? '',
        instructions: m?.instructions ?? '',
        mode: 'rx',
        qty: '1',
        price: m?.price ?? 0,
        available: m?.available ?? false,
      },
    ])
    setRxQ('')
  }
  const upd = (key: string, patch: Partial<RxLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const updRow = (key: string, patch: Partial<TRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const updOld = (id: string, patch: Partial<OldRow>) => setOld((o) => ({ ...o, [id]: { ...{ tick: false, notes: '', price: '' }, ...o[id], ...patch } }))

  function pickCatalog(r: TRow, name: string) {
    const c = p.catalog.find((x) => x.name.toLowerCase() === name.trim().toLowerCase())
    const mats: Record<string, string> = {}
    if (c) for (const m of p.materials[c.id] ?? []) mats[m.inventory_id] = String(m.default_qty)
    if (!c) return updRow(r.key, { name, catalog_id: null, mats: {} })
    const applies: Applies = c.applies_to ?? 'tooth'
    const teeth = applies === 'tooth' ? (r.teeth.length ? r.teeth : [...sel]) : []
    const next = { applies, unit: applies === 'tooth' ? c.price : null, manual: false, price: String(c.price) }
    updRow(r.key, { name, catalog_id: c.id, mats, teeth, applies, unit: next.unit, manual: false, price: autoPrice(next, teeth) })
  }
  function setRowTeeth(r: TRow, t: string[]) {
    updRow(r.key, { teeth: t, price: autoPrice(r, t) })
  }
  function setRowApplies(r: TRow, a: Applies) {
    updRow(r.key, { applies: a, teeth: a === 'tooth' ? (r.teeth.length ? r.teeth : [...sel]) : [], jaw: a === 'jaw' ? r.jaw : '', unit: a === 'tooth' ? r.unit : null })
  }
  async function completeTreatment(id: string) {
    setMsg(null)
    const { error } = await createClient().rpc('set_treatment_status', { p_treatment_id: id, p_status: 'completed' })
    setConfirmDone(null)
    if (error) return setMsg({ ok: false, t: friendlyError(error.message) })
    setOld((o) => ({ ...o, [id]: { tick: false, notes: '', price: '' } }))
    setMsg({ ok: true, t: 'Treatment mukammal likh di gayi.' })
    router.refresh()
  }

  const consultCat = p.catalog.find((c) => /consult|check-?up/i.test(c.name) && (homeo ? c.department !== 'dental' : c.department !== 'homeopathic')) ?? null
  const medTotal = lines.filter((l) => l.mode === 'dispense').reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0)
  const extraTotal = extra.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const treatTotal =
    rows.filter((r) => !r.planned && r.name.trim()).reduce((s, r) => s + (Number(r.price) || 0), 0) +
    live.filter((t) => t.status === 'planned' && old[t.id]?.tick).reduce((s, t) => s + (Number(old[t.id]?.price) || 0), 0)
  const disc = Math.min(Number(discount) || 0, medTotal + extraTotal)
  const newCharges = treatTotal + medTotal + extraTotal - disc
  const dueNow = p.balance + newCharges
  const paidNum = Number(paid) || 0

  async function ensureVisit(): Promise<string | null> {
    if (visitId.current) return visitId.current
    const { data: id, error } = await createClient().rpc('open_clinical_visit', { p_patient_id: p.patient.id })
    if (error || !id) {
      setMsg({ ok: false, t: friendlyError(error?.message ?? 'Visit nahi khul saka') })
      return null
    }
    visitId.current = id as string
    return visitId.current
  }

  async function save() {
    if (busy) return
    setBusy('save')
    setMsg(null)
    const id = await ensureVisit()
    if (!id) return setBusy('')
    const { error } = await createClient().rpc('save_clinical_visit', { p_id: id, p_data: data() })
    setBusy('')
    setMsg(error ? { ok: false, t: friendlyError(error.message) } : { ok: true, t: 'Save ho gaya (history, takleef, muaina, chart, diagnosis, agli appointment). Treatment, dawa aur bill "Finish Visit" par.' })
  }

  async function finish() {
    if (busy) return
    if (paidNum > dueNow + 0.001) return setMsg({ ok: false, t: `Mili raqam kul baqaya (${money(dueNow)}) se zyada hai` })
    if (lines.some((l) => !l.name.trim())) return setMsg({ ok: false, t: 'Har dawa ka naam likhein' })
    if (rows.some((r) => !r.name.trim())) return setMsg({ ok: false, t: 'Har treatment ka naam likhein (ya qatar hata dein)' })
    setBusy('finish')
    setMsg(null)
    const id = await ensureVisit()
    if (!id) return setBusy('')
    let consentWarn = ''
    if (consent && !p.consentAt && canEdit) {
      const { error: cErr } = await createClient().rpc('give_consent', { p_patient: p.patient.id })
      if (cErr) consentWarn = 'Ijazat (consent) save nahi hui (naya SQL chalana baqi ho sakta hai). '
    }
    const rx = lines.length
      ? {
          category: rxCat,
          notes_en: rxNotes,
          items: lines.map((l) => ({
            medicine_id: l.medicine_id,
            name_en: l.name,
            name: l.name,
            potency: l.potency || l.strength,
            dosage: l.dose,
            frequency: l.frequency,
            duration: l.duration,
            instructions: l.instructions,
            mode: l.mode,
            qty: l.mode === 'dispense' ? Number(l.qty) || 0 : null,
            price: l.mode === 'dispense' && !l.medicine_id ? Number(l.price) || 0 : null,
          })),
        }
      : null
    const treatments = [
      ...rows.map((r) => ({
        name: r.name.trim(),
        catalog_id: r.catalog_id,
        teeth: r.applies === 'tooth' ? r.teeth : [],
        price: p.perms.bill ? Number(r.price) || 0 : 0,
        planned: r.planned,
        notes: [r.applies === 'jaw' && r.jaw ? `Jabda: ${r.jaw}` : '', r.notes].filter(Boolean).join(' — '),
        condition: null as string | null,
      })),
      ...live
        .filter((t) => old[t.id]?.tick)
        .map((t) => ({
          treatment_id: t.id,
          notes: old[t.id].notes,
          price: p.perms.bill ? Number(old[t.id].price) || 0 : 0,
          condition: null as string | null,
        })),
    ]
    const { data: res, error } = await createClient().rpc('finish_clinical_visit', {
      p_id: id,
      p_data: data(),
      p_rx: rx,
      p_extra: extra.filter((e) => Number(e.amount) > 0),
      p_treatments: treatments,
      p_discount: p.perms.owner ? disc : 0,
      p_paid: p.perms.collect ? paidNum : 0,
      p_method: method,
      p_key: finishKey.current,
    })
    if (error) {
      setBusy('')
      return setMsg({ ok: false, t: friendlyError(error.message) })
    }
    // Samaan stock se kaatein (visit mukammal ho chuka; stock kam ho to sirf warning)
    const usage = rows
      .filter((r) => !r.planned)
      .flatMap((r) => Object.entries(r.mats).map(([inventory_id, q]) => ({ inventory_id, qty: Number(q) || 0, treatment_id: r.catalog_id })))
      .filter((u) => u.qty > 0)
    let warn = consentWarn
    if (recallEff && canEdit) {
      const months = Number(recallEff)
      const type = hasScaling() ? 'Scaling & Polishing' : 'Routine Check-up'
      const sb = createClient()
      const nd = new Date(todayKarachi() + 'T00:00:00')
      nd.setMonth(nd.getMonth() + months)
      const nextDue = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`
      const { data: ex } = await sb.from('recalls').select('id').eq('patient_id', p.patient.id).eq('recall_type', type).eq('status', 'active').maybeSingle()
      const row = { interval_months: months, last_done: todayKarachi(), next_due: nextDue, reminders_sent: 0, last_reminded: null }
      const { error: rErr } = ex ? await sb.from('recalls').update(row).eq('id', ex.id) : await sb.from('recalls').insert({ patient_id: p.patient.id, recall_type: type, status: 'active', ...row })
      if (rErr) warn += 'Recall save nahi hua: ' + friendlyError(rErr.message) + ' '
    }
    if (usage.length > 0) {
      const { error: sErr } = await createClient().rpc('record_usage', { p_items: usage, p_patient_id: p.patient.id, p_invoice_id: null, p_note: 'Visit', p_key: finishKey.current + ':stk' })
      if (sErr) warn += 'Visit mukammal, magar samaan stock se nahi kata: ' + sErr.message
    }
    try {
      localStorage.removeItem(draftKey)
    } catch {}
    setBusy('')
    const r = res as { visit_id: string; prescription_id: string | null }
    setDone({ visit_id: r.visit_id, prescription_id: r.prescription_id, hasInvoice: newCharges > 0 || paidNum > 0 || Boolean((res as { invoice_id?: string }).invoice_id) })
    if (warn) setMsg({ ok: false, t: warn })
    router.refresh()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const complaintList = (homeo ? p.opts?.homeo_complaint : p.opts?.complaint)?.length ? (homeo ? p.opts!.homeo_complaint : p.opts!.complaint) : homeo ? HOMEO_COMPLAINTS : COMPLAINTS
  const diagList = p.opts?.diagnosis?.length ? p.opts.diagnosis : DIAG_SUGGEST
  // Section numbers jo asal mein dikhte hain unhi ke hisaab se (homeopathy mein 3 aur 6 nahi hote)
  let secNoCount = 1
  const secNo = () => ++secNoCount
  const fin = done ? { id: done.visit_id, prescription_id: done.prescription_id, hasInvoice: done.hasInvoice } : p.finishedToday

  /* ---------- sirf bill dekhne wale (reception) ---------- */
  if (!p.perms.clinicalView) {
    return (
      <div className="grid gap-4">
        {p.perms.money && <BillSummary patientId={p.patient.id} balance={p.balance} plansSlot={p.plansSlot} />}
      </div>
    )
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      {fin && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-800">✓ Aaj ka visit mukammal ho gaya</p>
          {msg && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{msg.t}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {fin.prescription_id && (
              <a href={`/admin/prescriptions/${fin.prescription_id}/print`} target="_blank" className="rounded-full bg-clinic-teal px-5 py-2.5 font-semibold text-white">
                Prescription PDF
              </a>
            )}
            {p.patient.phone && (
              <a
                href={`https://wa.me/${toInternationalPKNumber(p.patient.phone)}?text=${encodeURIComponent(`Assalam o Alaikum ${p.patient.full_name}, aaj aap ne ${CLINIC.name} mein visit ki. Shukriya! Koi bhi sawal ho to humein batayein.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-whatsapp px-5 py-2.5 font-semibold text-white"
              >
                WhatsApp
              </a>
            )}
            {fin.hasInvoice && p.perms.money && (
              <a href={`/admin/visits/${fin.id}/invoice`} target="_blank" className="rounded-full bg-clinic-teal px-5 py-2.5 font-semibold text-white">
                Invoice PDF
              </a>
            )}
          </div>
          {p.hasPlanned && p.perms.money && (
            <a href={`/admin/patients/${p.patient.id}/estimate`} target="_blank" className="mt-3 inline-block text-xs font-semibold text-clinic-teal underline">
              Treatment plan ka estimate (print)
            </a>
          )}
          {!showForm && !done && (
            <button type="button" onClick={() => setShowForm(true)} className="mt-3 text-xs font-semibold text-clinic-teal underline">
              Aaj dobara naya visit shuru karein
            </button>
          )}
          {done && (
            <button type="button" onClick={() => window.location.reload()} className="mt-3 text-xs font-semibold text-clinic-teal underline">
              Aaj dobara naya visit shuru karein
            </button>
          )}
        </div>
      )}

      {showForm && !done && (
        <>
          {(p.doctors.length > 0 || doctor) && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-clinic-teal/10 bg-white px-4 py-3 text-sm">
              <label htmlFor="visit-doctor" className="font-semibold text-clinic-ink/70">
                Doctor (aaj ka visit)
              </label>
              <select
                id="visit-doctor"
                value={doctor}
                disabled={!canEdit}
                onChange={(e) => setDoctor(e.target.value)}
                className="rounded-lg border border-clinic-teal/25 px-3 py-1.5 text-sm outline-none focus:border-clinic-teal"
              >
                <option value="">— chunein —</option>
                {[...new Set([...(doctor ? [doctor] : []), ...p.doctors])].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="text-xs text-clinic-ink/50">Isi ke naam par income report banti hai.</span>
            </div>
          )}
          {!p.consentAt && canEdit && (
            <label className="flex items-start gap-2 rounded-2xl border border-clinic-teal/15 bg-white px-4 py-3 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5" />
              <span>
                <span className="font-semibold text-clinic-ink">Ijazat (consent) li gayi</span>
                <span className="block text-xs text-clinic-ink/60">Patient ne treatment aur record rakhne ki ijazat de di hai. Ye sirf aik dafa likhni hoti hai.</span>
              </span>
            </label>
          )}
          {p.consentAt && <p className="px-1 text-xs text-clinic-ink/50">✓ Ijazat (consent) li ja chuki hai — {fmtDate(p.consentAt.slice(0, 10))}</p>}
          {/* 2. MEDICAL HISTORY */}
          <Section n={secNo()} title="Medical History">
            <HistoryFields column="medical_history" data={medical} onChange={setMedical} canEdit={canEdit} />
          </Section>

          {/* 3. DENTAL HISTORY */}
          {!homeo && (
            <Section n={secNo()} title="Dental History">
              <HistoryFields column="dental_history" data={dental} onChange={setDental} canEdit={canEdit} />
            </Section>
          )}

          {/* 4. CHIEF COMPLAINT */}
          <Section n={secNo()} title="Chief Complaint (takleef)">
            <fieldset disabled={!canEdit} className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {complaintList.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCItems((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${cItems.includes(c) ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 bg-white text-clinic-ink/75'}`}
                  >
                    {cItems.includes(c) ? '✓ ' : ''}
                    {c}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-clinic-ink/70">Kab se</label>
                  <select value={cDur} onChange={(e) => setCDur(e.target.value)} className={input}>
                    <option value="">—</option>
                    {DURATIONS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-clinic-ink/70">Kitna (shiddat)</label>
                  <div className="mt-1 flex gap-1.5">
                    {SEVERITY.map((s) => (
                      <button key={s} type="button" onClick={() => setCSev(cSev === s ? '' : s)} className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold ${cSev === s ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 text-clinic-ink/70'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-clinic-ink/70">{homeo ? 'Kahan' : 'Kahan (daant / jagah)'}</label>
                  <input value={cLoc} onChange={(e) => setCLoc(e.target.value)} placeholder={homeo ? '' : 'Neeche dayen ...'} className={input} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-clinic-ink/70">Apne alfaz mein (optional)</label>
                <input value={cOther} onChange={(e) => setCOther(e.target.value)} className={input} />
              </div>
            </fieldset>
          </Section>

          {/* 5. CLINICAL EXAMINATION */}
          <Section n={secNo()} title="Clinical Examination (muaina)">
            <fieldset disabled={!canEdit} className="grid gap-3 sm:grid-cols-3">
              {FINDINGS.map((f) => (
                <div key={f.k}>
                  <label className="text-xs font-medium text-clinic-ink/70">{f.l}</label>
                  <textarea rows={2} value={findings[f.k] ?? ''} onChange={(e) => setFindings({ ...findings, [f.k]: e.target.value })} className={input} />
                </div>
              ))}
            </fieldset>
          </Section>

          {/* 6. DENTAL CHART */}
          {!homeo && (
            <Section n={secNo()} title="Dental Chart">
              <ToothChart age={p.patient.age} selected={sel} onSelect={pickTeeth} marks={marks} onMarks={setMarks} old={p.chartRecords} canEdit={canEdit} />
            </Section>
          )}

          {/* 7. X-RAY */}
          <Section n={secNo()} title="X-ray / Investigation">
            <div className="mb-3">
              <label className="text-xs font-medium text-clinic-ink/70">X-ray / report mein kya nazar aaya</label>
              <textarea rows={2} disabled={!canEdit} value={findings.radiographic ?? ''} onChange={(e) => setFindings({ ...findings, radiographic: e.target.value })} placeholder="Caries, bone loss, periapical ..." className={input} />
            </div>
            {p.xraySlot}
          </Section>

          {/* 8. DIAGNOSIS */}
          <Section n={secNo()} title="Diagnosis">
            <datalist id="diag-list">
              {diagList.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <div className="grid gap-3">
              {diags.map((d, i) => (
                <div key={i} className="grid gap-1.5 rounded-xl border border-clinic-teal/10 p-2.5">
                  <div className="flex gap-2">
                    <input list={homeo ? undefined : 'diag-list'} value={d.text} disabled={!canEdit} onChange={(e) => setDiags(diags.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder="Diagnosis" className="w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal" />
                    <button type="button" onClick={() => setDiags(diags.filter((_, j) => j !== i))} className="shrink-0 text-sm text-red-600">
                      hatao
                    </button>
                  </div>
                  {!homeo && <TeethChips all={sel} picked={d.teeth ?? []} onChange={(t) => setDiags(diags.map((x, j) => (j === i ? { ...x, teeth: t } : x)))} />}
                </div>
              ))}
              {canEdit && (
                <button type="button" onClick={() => setDiags([...diags, { text: '', teeth: [...sel] }])} className="justify-self-start rounded-full border border-clinic-teal/30 px-4 py-1.5 text-sm font-semibold text-clinic-teal">
                  + Diagnosis
                </button>
              )}
            </div>
          </Section>

          {/* 9. TREATMENT */}
          <Section n={secNo()} title="Treatment">
            <datalist id="cat-list">
              {p.catalog
                .filter((c) => (homeo ? c.department !== 'dental' : c.department !== 'homeopathic'))
                .map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
            </datalist>
            <div className="grid gap-3">
              {live.length > 0 && (
                <div className="grid gap-2">
                  <p className="text-xs font-semibold text-clinic-ink/60">Pehle se chalti / plan wali treatments</p>
                  {live.map((t) => {
                    const o = old[t.id]
                    return (
                      <div key={t.id} className={`rounded-xl border p-3 ${o?.tick ? 'border-clinic-teal bg-clinic-mint/40' : 'border-clinic-teal/15'}`}>
                        <label className="flex flex-wrap items-center gap-2 text-sm">
                          <input type="checkbox" disabled={!canEdit} checked={Boolean(o?.tick)} onChange={(e) => updOld(t.id, { tick: e.target.checked, price: o?.price || (t.status === 'planned' ? String(t.list_price || t.price || '') : '') })} className="h-5 w-5" />
                          <span className="font-semibold text-clinic-ink">{t.name}</span>
                          {t.teeth.length > 0 && <span className="text-xs text-clinic-ink/60">({t.teeth.map(toothLabel).join(', ')})</span>}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${t.status === 'planned' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{t.status === 'planned' ? 'sirf plan' : `visit ${t.visits.length}`}</span>
                          {p.perms.money && t.status === 'active' && t.balance > 0 && <span className="text-xs text-red-600">baqaya {money(t.balance)}</span>}
                          <span className="text-xs text-clinic-ink/50">— {t.status === 'planned' ? 'aaj shuru karein' : 'aaj ka visit'}</span>
                        </label>
                        {canEdit && t.status === 'active' && (
                          <div className="mt-2 text-xs">
                            {confirmDone === t.id ? (
                              <span className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2 py-1.5 text-amber-900">
                                Kya ye treatment poori ho gayi?
                                <button type="button" onClick={() => completeTreatment(t.id)} className="rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white">
                                  Haan, mukammal
                                </button>
                                <button type="button" onClick={() => setConfirmDone(null)} className="text-clinic-ink/60 underline">
                                  Nahi
                                </button>
                              </span>
                            ) : (
                              <button type="button" onClick={() => setConfirmDone(t.id)} className="font-semibold text-emerald-700 underline">
                                Ye treatment mukammal ho gayi
                              </button>
                            )}
                          </div>
                        )}
                        {o?.tick && (
                          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_9rem]">
                            <input value={o.notes} onChange={(e) => updOld(t.id, { notes: e.target.value })} placeholder="Aaj kya kiya (note)" className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
                            {t.status === 'planned' && p.perms.bill && <input type="number" min={0} value={o.price} onChange={(e) => updOld(t.id, { price: e.target.value })} placeholder="Qeemat Rs." className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {rows.map((r) => (
                <div key={r.key} className="grid gap-2 rounded-xl border border-clinic-teal/20 p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
                    <input list="cat-list" value={r.name} onChange={(e) => pickCatalog(r, e.target.value)} placeholder="Treatment (list se chunein ya likhein)" className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
                    {p.perms.bill ? <input type="number" min={0} value={r.price} onChange={(e) => updRow(r.key, { price: e.target.value, manual: true })} placeholder="Qeemat Rs." className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" /> : <span />}
                    <button type="button" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} className="text-sm text-red-600">
                      hatao
                    </button>
                  </div>
                  {!homeo && (
                    <div className="grid gap-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-clinic-ink/60">Kaise lagti hai:</span>
                        {(Object.keys(APPLIES_LABEL) as Applies[]).map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setRowApplies(r, a)}
                            aria-pressed={r.applies === a}
                            className={`rounded-full px-2.5 py-1 font-semibold ${r.applies === a ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 text-clinic-ink/70'}`}
                          >
                            {APPLIES_LABEL[a]}
                          </button>
                        ))}
                      </div>
                      {r.applies === 'tooth' && (
                        <>
                          <TeethChips all={sel} picked={r.teeth} onChange={(t) => setRowTeeth(r, t)} />
                          {sel.length === 0 && <p className="text-[11px] text-amber-700">Upar chart se daant chunein, phir yahan khud aa jayenge.</p>}
                          {r.unit != null && !r.manual && r.teeth.length > 1 && (
                            <p className="text-[11px] text-clinic-ink/60">
                              Har daant {money(r.unit)} × {r.teeth.length} daant = {money(r.unit * r.teeth.length)}
                            </p>
                          )}
                        </>
                      )}
                      {r.applies === 'jaw' && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-clinic-ink/60">Kaun sa jabda:</span>
                          {(['Upar', 'Neeche', 'Upar aur Neeche'] as const).map((j) => (
                            <button key={j} type="button" onClick={() => updRow(r.key, { jaw: r.jaw === j ? '' : j })} aria-pressed={r.jaw === j} className={`rounded-full px-2.5 py-1 font-semibold ${r.jaw === j ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 text-clinic-ink/70'}`}>
                              {j}
                            </button>
                          ))}
                        </div>
                      )}
                      {(r.applies === 'mouth' || r.applies === 'once') && <p className="text-[11px] text-clinic-ink/55">{r.applies === 'mouth' ? 'Poore muh ka kaam, daant chunne ki zaroorat nahi.' : 'Aik dafa ka charge, daant chunne ki zaroorat nahi.'}</p>}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <button type="button" onClick={() => updRow(r.key, { planned: false })} className={`rounded-full px-3 py-1 text-xs font-semibold ${!r.planned ? 'bg-emerald-600 text-white' : 'border border-clinic-ink/20 text-clinic-ink/60'}`}>
                      Aaj ho gayi
                    </button>
                    <button type="button" onClick={() => updRow(r.key, { planned: true })} className={`rounded-full px-3 py-1 text-xs font-semibold ${r.planned ? 'bg-amber-500 text-white' : 'border border-clinic-ink/20 text-clinic-ink/60'}`}>
                      Sirf plan (baad mein)
                    </button>
                    <input value={r.notes} onChange={(e) => updRow(r.key, { notes: e.target.value })} placeholder="Note (optional)" className="min-w-0 flex-1 rounded-lg border border-clinic-teal/20 px-3 py-1.5 text-sm" />
                  </div>
                  {!r.planned && r.catalog_id && (p.materials[r.catalog_id] ?? []).length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-clinic-ink/70">
                      <span>Samaan:</span>
                      {(p.materials[r.catalog_id] ?? []).map((m) => (
                        <label key={m.inventory_id} className="flex items-center gap-1">
                          {m.name}
                          <input type="number" min={0} value={r.mats[m.inventory_id] ?? ''} onChange={(e) => updRow(r.key, { mats: { ...r.mats, [m.inventory_id]: e.target.value } })} className="w-14 rounded border border-clinic-teal/20 px-1.5 py-1" />
                          {m.unit}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setRows([...rows, { key: newKey(), name: '', catalog_id: null, teeth: [...sel], price: '', planned: false, notes: '', mats: {}, applies: 'tooth', unit: null, manual: false, jaw: '' }])} className="justify-self-start rounded-full border border-clinic-teal/30 px-4 py-1.5 text-sm font-semibold text-clinic-teal">
                  + Treatment
                </button>
                {consultCat && !rows.some((r) => r.catalog_id === consultCat.id) && (
                  <button
                    type="button"
                    onClick={() => setRows([...rows, { key: newKey(), name: consultCat.name, catalog_id: consultCat.id, teeth: [], price: String(consultCat.price), planned: false, notes: '', mats: {}, applies: 'once', unit: null, manual: false, jaw: '' }])}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold ${p.isFirstVisit ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/30 text-clinic-teal'}`}
                  >
                    + {consultCat.name} fee {p.isFirstVisit ? '(pehli visit)' : ''}
                  </button>
                )}
                </div>
              )}
              {live.length === 0 && rows.length === 0 && <p className="text-xs text-clinic-ink/50">Abhi koi treatment nahi. Zaroorat ho to &quot;+ Treatment&quot; dabayein.</p>}
            </div>
          </Section>

          {/* 10. PRESCRIPTION */}
          {p.perms.rx && (
            <Section n={secNo()} title="Prescription (optional)">
          <div className="flex flex-wrap items-center gap-2">
            {(['dental', 'homeopathic'] as const).map((c) => (
              <button key={c} type="button" onClick={() => setRxCat(c)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${rxCat === c ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 text-clinic-ink/70'}`}>
                {c === 'dental' ? 'Dental dawa' : 'Homeopathic dawa'}
              </button>
            ))}
          </div>
          <div className="relative mt-2">
            <input value={rxQ} onChange={(e) => setRxQ(e.target.value)} placeholder="Dawa talash karein (list se) ya naam likh kar 'list se bahar' dabayein" className={input} />
            {rxQ.trim() && (
              <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-clinic-teal/15 bg-white shadow-lg">
                {meds.map((m) => (
                  <button key={m.id} type="button" onClick={() => addMed(m)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-clinic-mint">
                    <span>
                      {m.name} <span className="text-clinic-teal">{m.strength ?? m.potency ?? ''}</span>
                      {m.dosage_form && <span className="text-xs text-clinic-ink/50"> · {m.dosage_form}</span>}
                    </span>
                    <span className="text-xs text-clinic-ink/50">{m.available ? `clinic mein · ${money(m.price)}` : 'bahar se'}</span>
                  </button>
                ))}
                <button type="button" onClick={() => addMed(null)} className="block w-full border-t border-clinic-teal/10 px-3 py-2 text-left text-sm font-semibold text-clinic-teal hover:bg-clinic-mint">
                  + &quot;{rxQ.trim()}&quot; list se bahar (haath se)
                </button>
              </div>
            )}
          </div>
          {lines.length > 0 && (
            <div className="mt-3 grid gap-2">
              {lines.map((l, i) => (
                <div key={l.key} className="rounded-xl border border-clinic-teal/15 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-clinic-ink">
                      {i + 1}. {l.medicine_id ? l.name : <input value={l.name} onChange={(e) => upd(l.key, { name: e.target.value })} className="rounded border border-clinic-teal/20 px-2 py-1 text-sm" />}{' '}
                      <span className="text-clinic-teal">{l.strength || l.potency}</span>
                    </p>
                    <button type="button" onClick={() => setLines(lines.filter((x) => x.key !== l.key))} className="text-xs text-red-600">
                      hatao
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <input value={l.dose} onChange={(e) => upd(l.key, { dose: e.target.value })} placeholder="Dose" className="rounded-lg border border-clinic-teal/20 px-2 py-1.5 text-sm" />
                    <input value={l.frequency} onChange={(e) => upd(l.key, { frequency: e.target.value })} placeholder="Kitni baar" className="rounded-lg border border-clinic-teal/20 px-2 py-1.5 text-sm" />
                    <input value={l.duration} onChange={(e) => upd(l.key, { duration: e.target.value })} placeholder="Kitne din" className="rounded-lg border border-clinic-teal/20 px-2 py-1.5 text-sm" />
                    <input value={l.instructions} onChange={(e) => upd(l.key, { instructions: e.target.value })} placeholder="Hidayat" className="rounded-lg border border-clinic-teal/20 px-2 py-1.5 text-sm" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <button type="button" onClick={() => upd(l.key, { mode: 'rx' })} className={`rounded-full px-3 py-1 text-xs font-semibold ${l.mode === 'rx' ? 'bg-clinic-ink/80 text-white' : 'border border-clinic-ink/20 text-clinic-ink/60'}`}>
                      Sirf likhni (bahar se)
                    </button>
                    {p.perms.bill && (
                      <button
                        type="button"
                        onClick={() => upd(l.key, { mode: 'dispense' })}
                        disabled={!!l.medicine_id && !l.available}
                        title={l.medicine_id && !l.available ? 'Ye dawa clinic mein nahi (Settings mein "Clinic mein milti hai" tick karein)' : ''}
                        className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-40 ${l.mode === 'dispense' ? 'bg-emerald-600 text-white' : 'border border-emerald-600/40 text-emerald-700'}`}
                      >
                        Clinic se di (bill mein)
                      </button>
                    )}
                    {l.mode === 'dispense' && (
                      <>
                        <span className="text-xs text-clinic-ink/60">Ginti</span>
                        <input type="number" min={1} value={l.qty} onChange={(e) => upd(l.key, { qty: e.target.value })} className="w-16 rounded border border-clinic-teal/20 px-2 py-1 text-sm" />
                        <span className="text-xs text-clinic-ink/60">×</span>
                        {l.medicine_id ? (
                          <span className="text-sm">{money(l.price)}</span>
                        ) : (
                          <input type="number" min={0} value={l.price || ''} onChange={(e) => upd(l.key, { price: Number(e.target.value) || 0 })} placeholder="Qeemat" className="w-20 rounded border border-clinic-teal/20 px-2 py-1 text-sm" />
                        )}
                        <span className="font-semibold text-emerald-700">= {money((Number(l.qty) || 0) * (Number(l.price) || 0))}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <input value={rxNotes} onChange={(e) => setRxNotes(e.target.value)} placeholder="Prescription par aam hidayat (optional)" className={input} />
            </div>
          )}
          <p className="mt-2 text-xs text-clinic-ink/50">Prescription &quot;Finish Visit&quot; par save hoti hai. Sirf &quot;Clinic se di&quot; wali dawa ka paisa bill mein judta hai.</p>
          {(p.pastRx ?? []).length > 0 && (
            <details className="mt-3 rounded-xl border border-clinic-teal/10 px-3 py-2 text-sm">
              <summary className="cursor-pointer text-xs font-semibold text-clinic-ink/60">Pichli prescriptions ({p.pastRx!.length})</summary>
              <ul className="mt-2 divide-y divide-clinic-teal/10">
                {p.pastRx!.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate"><span className="text-xs text-clinic-ink/50">{fmtDate(r.date)}</span> {r.names}</span>
                    <a href={`/admin/prescriptions/${r.id}/print`} target="_blank" className="shrink-0 text-xs font-semibold text-clinic-teal">Print</a>
                  </li>
                ))}
              </ul>
            </details>
          )}
            </Section>
          )}

          {/* 11. BILL */}
          {p.perms.money && (
            <Section n={secNo()} title="Bill / Paisa">
              <div className="grid gap-2 text-sm">
                {treatTotal > 0 && (
                  <p className="flex justify-between">
                    <span>Aaj ki treatments</span>
                    <span>{money(treatTotal)}</span>
                  </p>
                )}
                {medTotal > 0 && (
                  <p className="flex justify-between">
                    <span>Clinic se di gayi dawaiyan</span>
                    <span>{money(medTotal)}</span>
                  </p>
                )}
                {p.perms.bill &&
                  extra.map((e, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={e.label} onChange={(ev) => setExtra(extra.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))} placeholder="Extra charge (X-ray, ...)" className="flex-1 rounded-lg border border-clinic-teal/20 px-2 py-1.5" />
                      <input type="number" min={0} value={e.amount} onChange={(ev) => setExtra(extra.map((x, j) => (j === i ? { ...x, amount: ev.target.value } : x)))} placeholder="Rs." className="w-28 rounded-lg border border-clinic-teal/20 px-2 py-1.5" />
                      <button type="button" onClick={() => setExtra(extra.filter((_, j) => j !== i))} className="text-xs text-red-600">
                        hatao
                      </button>
                    </div>
                  ))}
                {p.perms.bill && (
                  <button type="button" onClick={() => setExtra([...extra, { label: '', amount: '' }])} className="justify-self-start text-sm font-semibold text-clinic-teal">
                    + Extra charge
                  </button>
                )}
                {p.perms.owner && medTotal + extraTotal > 0 && (
                  <p className="flex items-center justify-between gap-2">
                    <span>Riyayat (sirf dawa / extra par)</span>
                    <input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-28 rounded-lg border border-clinic-teal/20 px-2 py-1.5 text-right" />
                  </p>
                )}
                <div className="mt-1 grid gap-1 rounded-xl border border-clinic-teal/15 p-3">
                  <p className="flex justify-between">
                    <span>Purana baqaya</span>
                    <span>{money(p.balance)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Aaj ka naya</span>
                    <span>{money(newCharges)}</span>
                  </p>
                  <p className="flex justify-between font-semibold">
                    <span>Kul baqaya</span>
                    <span className={dueNow > 0 ? 'text-red-600' : ''}>{money(dueNow)}</span>
                  </p>
                  {p.perms.collect && dueNow > 0 && (
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">Aaj kitne mile</span>
                      <span className="flex items-center gap-2">
                        <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-lg border border-clinic-teal/20 px-2 py-1.5">
                          <option value="cash">Cash</option>
                          <option value="bank">Bank</option>
                          <option value="easypaisa">EasyPaisa</option>
                          <option value="jazzcash">JazzCash</option>
                        </select>
                        <input type="number" min={0} max={dueNow} value={paid} onChange={(e) => setPaid(e.target.value)} className="w-28 rounded-lg border border-clinic-teal/20 px-2 py-1.5 text-right" />
                        <button type="button" onClick={() => setPaid(String(dueNow))} className="text-xs text-clinic-teal">
                          poora
                        </button>
                      </span>
                    </div>
                  )}
                  {paidNum > 0 && (
                    <p className="flex justify-between text-sm">
                      <span>Is ke baad baqaya</span>
                      <span className="font-semibold">{money(Math.max(0, dueNow - paidNum))}</span>
                    </p>
                  )}
                </div>
                <a href={`/admin/patients/${p.patient.id}/invoice`} className="justify-self-start text-xs font-semibold text-clinic-teal hover:underline">
                  Poora hisaab / statement (print / PDF)
                </a>
                {p.plansSlot}
              </div>
            </Section>
          )}

          {/* 12. NEXT APPOINTMENT */}
          <Section n={secNo()} title="Agli Appointment">
            <fieldset disabled={!canEdit} className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-clinic-ink/70">Tareekh</label>
                <input type="date" min={todayKarachi()} value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={input} />
                <div className="mt-1 flex flex-wrap gap-1">
                  {[3, 7, 14, 30].map((d) => (
                    <button key={d} type="button" onClick={() => setNextDate(addDays(todayKarachi(), d))} className="rounded-full bg-clinic-mint px-2.5 py-0.5 text-[11px] font-semibold text-clinic-teal">
                      +{d < 30 ? `${d} din` : '1 mahina'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-clinic-ink/70">Waqt</label>
                <select value={nextTime} onChange={(e) => setNextTime(e.target.value)} disabled={!nextDate} className={input}>
                  <option value="">—</option>
                  {SLOTS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-clinic-ink/70">Kis treatment ke liye</label>
                <select value={nextT} onChange={(e) => setNextT(e.target.value)} disabled={!nextDate} className={input}>
                  <option value="">— checkup —</option>
                  {live
                    .filter((t) => t.status === 'active')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.teeth.length ? ` (${t.teeth.map(toothLabel).join(', ')})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </fieldset>
            {!homeo || true ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <label htmlFor="recall-sel" className="font-semibold text-clinic-ink/70">Dobara bulana (recall)</label>
                <select id="recall-sel" disabled={!canEdit} value={recallEff} onChange={(e) => { setRecallTouched(true); setRecallM(e.target.value) }} className="rounded-lg border border-clinic-teal/25 px-3 py-1.5 text-sm">
                  <option value="">— nahi —</option>
                  <option value="3">3 mahine baad</option>
                  <option value="6">6 mahine baad</option>
                  <option value="12">12 mahine baad</option>
                </select>
                <span className="text-xs text-clinic-ink/50">{hasScaling() && !recallTouched ? 'Scaling hai, is liye 6 mahine khud chun liya.' : 'Recall list mein khud ban jata hai.'}</span>
              </div>
            ) : null}
          </Section>

          {/* SAVE / FINISH */}
          {canEdit && (
            <div className="sticky bottom-0 z-10 -mx-4 border-t border-clinic-teal/15 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
              {msg && <p className={`mb-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.t}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-clinic-ink/50">Aaj {fmtDate(todayKarachi())}</p>
                <div className="flex gap-2">
                  <button onClick={save} disabled={!!busy} className="rounded-full border-2 border-clinic-teal px-5 py-2.5 text-sm font-semibold text-clinic-teal disabled:opacity-50">
                    {busy === 'save' ? 'Save...' : 'Save'}
                  </button>
                  <button onClick={finish} disabled={!!busy} className="rounded-full bg-clinic-teal px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {busy === 'finish' ? 'Mukammal ho raha hai...' : 'Finish Visit ✓'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Reception: sirf paisa dekhna */
function BillSummary({ patientId, balance, plansSlot }: { patientId: string; balance: number; plansSlot?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
      <p className="flex justify-between text-sm">
        <span>Kul baqaya</span>
        <span className={balance > 0 ? 'font-semibold text-red-600' : 'font-semibold'}>{money(balance)}</span>
      </p>
      <a href={`/admin/patients/${patientId}/invoice`} className="mt-2 inline-block text-xs font-semibold text-clinic-teal hover:underline">
        Poora hisaab / statement (print / PDF)
      </a>
      {plansSlot}
    </section>
  )
}

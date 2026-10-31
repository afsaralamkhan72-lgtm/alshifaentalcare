'use client'

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtDate, money, todayKarachi, addDays } from '@/lib/karachi'
import DentalChart from '../DentalChart'
import TreatmentsPanel, { type CatalogOpt, type MaterialOpt, type TItem } from '../TreatmentsPanel'

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
export interface TodayBill {
  id: string
  invoice_number: string
  total: number
  paid_amount: number
  items: string
}
interface ChartRecord {
  id: string
  tooth_number: string
  condition: string
  notes: string | null
  treatment_date: string
  created_at?: string | null
  surfaces?: string[] | null
  state?: string | null
}

interface Props {
  patient: { id: string; full_name: string; phone: string; department: string }
  visit: VisitRow | null
  finishedToday: { id: string; invoice_id: string | null; prescription_id: string | null } | null
  chartRecords: ChartRecord[]
  treatments: TItem[]
  catalog: CatalogOpt[]
  materials: Record<string, MaterialOpt[]>
  doctors: string[]
  defaultDoctor: string | null
  medicines: MedOpt[]
  todayBills: TodayBill[]
  balance: number
  xraySlot?: ReactNode
  apptSlot?: ReactNode
  plansSlot?: ReactNode
  pastRx?: { id: string; date: string; names: string }[]
  perms: { clinicalView: boolean; clinicalEdit: boolean; bill: boolean; collect: boolean; money: boolean; owner: boolean; rx: boolean; lab: boolean }
}

const COMPLAINTS = ['Toothache', 'Sensitivity', 'Swelling', 'Bleeding gums', 'Missing tooth', 'Broken tooth', 'Difficulty chewing', 'Cosmetic concern', 'Follow-up', 'Other']
const HOMEO_COMPLAINTS = ['Bukhar', 'Sar dard', 'Khansi / zukam', 'Pait ki takleef', 'Jild (skin)', 'Allergy', 'Jor ka dard', 'Neend', 'Follow-up', 'Other']
const DURATIONS = ['Aaj se', '2-3 din', '1 hafta', '2 hafte', '1 mahina', '1 mahine se zyada']
const SEVERITY = ['Halka', 'Darmiyana', 'Shadeed']
const FINDINGS = [
  { k: 'extraoral', l: 'Extraoral (chehra, jabra)' },
  { k: 'intraoral', l: 'Intraoral aur soft tissue (munh ke andar)' },
  { k: 'periodontal', l: 'Periodontal (masoorhe)' },
]
const DIAG_SUGGEST = [
  'Dental caries', 'Reversible pulpitis', 'Irreversible pulpitis', 'Pulp necrosis', 'Periapical abscess', 'Periapical periodontitis',
  'Gingivitis', 'Chronic periodontitis', 'Fractured tooth', 'Impacted tooth', 'Missing tooth', 'Dentine hypersensitivity',
  'Retained root', 'Malocclusion', 'Pericoronitis', 'Attrition / abrasion',
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

function Section({ n, title, children, right }: { n: number; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section id={`s${n}`} className="scroll-mt-20 rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">
          <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-clinic-teal text-sm text-white">{n}</span>
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function Locked({ n, title }: { n: number; title: string }) {
  return (
    <div id={`s${n}`} className="flex items-center gap-2 rounded-2xl border border-dashed border-clinic-teal/20 px-4 py-3 text-sm text-clinic-ink/40">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-clinic-teal/20 text-sm text-white">{n}</span>
      {title} <span className="text-xs">(visit shuru karne ke baad)</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
export default function VisitWorkspace(p: Props) {
  const router = useRouter()
  const v = p.visit
  const homeo = p.patient.department === 'homeopathic'
  const finishKey = useRef(newKey())
  const [busy, setBusy] = useState<'' | 'open' | 'draft' | 'finish'>('')
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)

  // clinical (draft mein save hota hai)
  const [cItems, setCItems] = useState<string[]>(v?.complaint?.items ?? [])
  const [cOther, setCOther] = useState(v?.complaint?.other ?? '')
  const [cDur, setCDur] = useState(v?.complaint?.duration ?? '')
  const [cSev, setCSev] = useState(v?.complaint?.severity ?? '')
  const [cLoc, setCLoc] = useState(v?.complaint?.location ?? '')
  const [findings, setFindings] = useState<Record<string, string>>(v?.findings ?? {})
    const [diags, setDiags] = useState<Diagnosis[]>(v?.diagnoses?.length ? v.diagnoses : [])
  const [nextDate, setNextDate] = useState(v?.next_date ?? '')
  const [nextTime, setNextTime] = useState(v?.next_time ?? '')
  const [nextT, setNextT] = useState(v?.next_treatment_id ?? '')

  // prescription + bill (Finish par save)
  const [rxCat, setRxCat] = useState<'dental' | 'homeopathic'>(homeo ? 'homeopathic' : 'dental')
  const [rxQ, setRxQ] = useState('')
  const [lines, setLines] = useState<RxLine[]>([])
  const [rxNotes, setRxNotes] = useState('')
  const [extra, setExtra] = useState<{ label: string; amount: string }[]>([])
  const [discount, setDiscount] = useState('')
  const [paid, setPaid] = useState('')
  const [method, setMethod] = useState('cash')

  const [startTeeth, setStartTeeth] = useState<string[] | null>(null)
  const consumed = useCallback(() => setStartTeeth(null), [])

  const complaintPayload = () => ({ items: cItems, other: cOther, duration: cDur, severity: cSev, location: cLoc })
  const dataPayload = () => ({
    complaint: complaintPayload(),
    findings,
    diagnoses: diags.filter((d) => d.text.trim()),
    next_date: nextDate || '',
    next_time: nextDate ? nextTime : '',
    next_treatment_id: nextDate ? nextT : '',
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

  const medTotal = lines.filter((l) => l.mode === 'dispense').reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0)
  const extraTotal = extra.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const disc = Math.min(Number(discount) || 0, medTotal + extraTotal)
  const newCharges = medTotal + extraTotal - disc
  const dueNow = p.balance + newCharges
  const paidNum = Number(paid) || 0

  async function openVisit() {
    setBusy('open')
    setMsg(null)
    const { error } = await createClient().rpc('open_clinical_visit', { p_patient_id: p.patient.id })
    setBusy('')
    if (error) return setMsg({ ok: false, t: error.message })
    router.refresh()
  }

  async function saveDraft() {
    if (!v) return
    setBusy('draft')
    setMsg(null)
    const { error } = await createClient().rpc('save_clinical_visit', { p_id: v.id, p_data: dataPayload() })
    setBusy('')
    setMsg(error ? { ok: false, t: error.message } : { ok: true, t: 'Draft save ho gaya. Baad mein yahin se jari rakhein.' })
    if (!error) router.refresh()
  }

  async function finish() {
    if (!v || busy) return
    if (paidNum > dueNow + 0.001) return setMsg({ ok: false, t: `Mili raqam kul baqaya (${money(dueNow)}) se zyada hai` })
    if (lines.some((l) => !l.name.trim())) return setMsg({ ok: false, t: 'Har dawa ka naam likhein' })
    setBusy('finish')
    setMsg(null)
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
    const { error } = await createClient().rpc('finish_clinical_visit', {
      p_id: v.id,
      p_data: dataPayload(),
      p_rx: rx,
      p_extra: extra.filter((e) => Number(e.amount) > 0),
      p_discount: p.perms.owner ? disc : 0,
      p_paid: p.perms.collect ? paidNum : 0,
      p_method: method,
      p_key: finishKey.current,
    })
    setBusy('')
    if (error) return setMsg({ ok: false, t: error.message })
    router.refresh()
  }

  const planned = p.treatments.filter((t) => t.status === 'planned').flatMap((t) => t.teeth)
  const activeTreatments = p.treatments.filter((t) => t.status === 'active' || t.status === 'planned')
  const complaintList = homeo ? HOMEO_COMPLAINTS : COMPLAINTS

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      {/* Aaj ka visit mukammal: print */}
      {p.finishedToday && !v && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-800">✓ Aaj ka visit mukammal ho gaya</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <a href={`/admin/visits/${p.finishedToday.id}/print`} target="_blank" className="rounded-full bg-white px-4 py-1.5 font-semibold text-clinic-teal">
              Visit record (PDF)
            </a>
            {p.finishedToday.prescription_id && (
              <a href={`/admin/prescriptions/${p.finishedToday.prescription_id}/print`} target="_blank" className="rounded-full bg-white px-4 py-1.5 font-semibold text-clinic-teal">
                Prescription (PDF)
              </a>
            )}
            {p.finishedToday.invoice_id && (
              <a href={`/admin/invoices/${p.finishedToday.invoice_id}`} target="_blank" className="rounded-full bg-white px-4 py-1.5 font-semibold text-clinic-teal">
                Bill (PDF)
              </a>
            )}
          </div>
        </div>
      )}

      {/* 3. CHIEF COMPLAINT */}
      <Section n={3} title="Chief Complaint (takleef)">
        {!v ? (
          p.perms.clinicalEdit ? (
            <div className="rounded-xl bg-clinic-mint/60 p-4 text-center">
              <p className="text-sm text-clinic-ink/70">Aaj patient aaya hai? Visit shuru karein: takleef, muaina, diagnosis, prescription, bill aur agli appointment aik hi jagah.</p>
              <button onClick={openVisit} disabled={busy === 'open'} className="mt-3 rounded-full bg-clinic-teal px-6 py-3 text-base font-semibold text-white disabled:opacity-60">
                {busy === 'open' ? 'Khul raha hai...' : '+ Aaj ka visit shuru karein'}
              </button>
              <p className="mt-2 text-xs text-clinic-ink/50">Sirf purani treatment ka agla visit ya payment ho to neeche Treatments mein seedha bhi kar sakte hain.</p>
            </div>
          ) : (
            <p className="text-sm text-clinic-ink/50">Aaj ka koi visit khula nahi.</p>
          )
        ) : (
          <div className="grid gap-3">
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
                <input value={cLoc} onChange={(e) => setCLoc(e.target.value)} placeholder={homeo ? '' : 'Neeche dayen, UR 6 ...'} className={input} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-clinic-ink/70">Apne alfaz mein (optional)</label>
              <input value={cOther} onChange={(e) => setCOther(e.target.value)} className={input} />
            </div>
          </div>
        )}
      </Section>

      {/* 4. CLINICAL EXAMINATION */}
      {v ? (
        <Section n={4} title="Clinical Examination (muaina)">
          <div className="grid gap-3 sm:grid-cols-3">
            {FINDINGS.map((f) => (
              <div key={f.k}>
                <label className="text-xs font-medium text-clinic-ink/70">{f.l}</label>
                <textarea rows={2} value={findings[f.k] ?? ''} onChange={(e) => setFindings({ ...findings, [f.k]: e.target.value })} className={input} />
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Locked n={4} title="Clinical Examination" />
      )}

      {/* 5. DENTAL CHART */}
      {p.perms.clinicalView && !homeo && (
        <div id="s5" className="relative scroll-mt-20">
          <span className="absolute -left-2 -top-2 z-[1] inline-flex h-7 w-7 items-center justify-center rounded-full bg-clinic-teal text-sm font-semibold text-white">5</span>
          <DentalChart
            patientId={p.patient.id}
            initialRecords={p.chartRecords}
            canEdit={p.perms.clinicalEdit}
            onStartTreatment={(tooth) => setStartTeeth([tooth])}
            plannedTeeth={planned}
          />
        </div>
      )}

      {/* 6. X-RAY / INVESTIGATION */}
      {p.perms.clinicalView && (
        <Section n={6} title="X-ray / Investigation">
          {v && (
            <div className="mb-3">
              <label className="text-xs font-medium text-clinic-ink/70">X-ray / report mein kya nazar aaya</label>
              <textarea rows={2} value={findings.radiographic ?? ''} onChange={(e) => setFindings({ ...findings, radiographic: e.target.value })} placeholder="Caries, bone loss, periapical ..." className={input} />
            </div>
          )}
          {p.xraySlot}
        </Section>
      )}

      {/* 6. DIAGNOSIS */}
      {v ? (
        <Section n={7} title="Diagnosis">
          <datalist id="diag-list">
            {DIAG_SUGGEST.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <div className="grid gap-2">
            {diags.map((d, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
                <input list={homeo ? undefined : 'diag-list'} value={d.text} onChange={(e) => setDiags(diags.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder="Diagnosis" className={input} />
                {!homeo && (
                  <input
                    value={(d.teeth ?? []).join(' ')}
                    onChange={(e) => setDiags(diags.map((x, j) => (j === i ? { ...x, teeth: e.target.value.split(/[\s,]+/).filter(Boolean) } : x)))}
                    placeholder="Daant (16 17)"
                    className={input}
                  />
                )}
                <button type="button" onClick={() => setDiags(diags.filter((_, j) => j !== i))} className="text-sm text-red-600">
                  hatao
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setDiags([...diags, { text: '', teeth: [] }])} className="justify-self-start rounded-full border border-clinic-teal/30 px-4 py-1.5 text-sm font-semibold text-clinic-teal">
              + Diagnosis
            </button>
          </div>
        </Section>
      ) : (
        <Locked n={7} title="Diagnosis" />
      )}

      {/* 7. TREATMENT PLAN / TREATMENTS */}
      {(p.perms.clinicalView || p.perms.money) && (
        <Section n={8} title="Treatment (plan aur visit)">
          <TreatmentsPanel
            patientId={p.patient.id}
            department={p.patient.department}
            treatments={p.treatments}
            catalog={p.catalog}
            materials={p.materials}
            doctors={p.doctors}
            defaultDoctor={p.defaultDoctor}
            canEdit={p.perms.clinicalEdit}
            canBill={p.perms.bill}
            canCollect={p.perms.collect}
            canSeeMoney={p.perms.money}
            isOwner={p.perms.owner}
            canLab={p.perms.lab && !homeo}
            startTeeth={startTeeth}
            onStartConsumed={consumed}
          />
        </Section>
      )}

      {/* 9. PRESCRIPTION */}
      {v && p.perms.rx && (
        <Section n={9} title="Prescription (optional)">
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
      {!v && p.perms.rx && <Locked n={9} title="Prescription" />}

      {/* 9. BILL */}
      {p.perms.money && (
        <Section n={10} title="Bill / Paisa">
          <div className="grid gap-2 text-sm">
            {p.todayBills.length > 0 && (
              <div className="rounded-xl bg-clinic-sand/60 p-3">
                <p className="text-xs font-semibold text-clinic-ink/60">Aaj ke bill</p>
                {p.todayBills.map((b) => (
                  <p key={b.id} className="flex justify-between">
                    <span>
                      <a href={`/admin/invoices/${b.id}`} className="text-clinic-teal hover:underline">{b.invoice_number}</a> · {b.items}
                    </span>
                    <span>
                      {money(b.total)} <span className="text-xs text-emerald-700">(mile {money(b.paid_amount)})</span>
                    </span>
                  </p>
                ))}
              </div>
            )}
            {v && (
              <>
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
              </>
            )}
            <div className="mt-1 grid gap-1 rounded-xl border border-clinic-teal/15 p-3">
              <p className="flex justify-between">
                <span>Pichla + aaj ka baqaya (ab tak)</span>
                <span>{money(p.balance)}</span>
              </p>
              {v && newCharges > 0 && (
                <p className="flex justify-between">
                  <span>Is visit ka naya (dawa + extra − riyayat)</span>
                  <span>{money(newCharges)}</span>
                </p>
              )}
              <p className="flex justify-between font-semibold">
                <span>Kul baqaya</span>
                <span className={dueNow > 0 ? 'text-red-600' : ''}>{money(dueNow)}</span>
              </p>
              {v && p.perms.collect && dueNow > 0 && (
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <span>Aaj mile</span>
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
              {v && paidNum > 0 && (
                <p className="flex justify-between text-sm">
                  <span>Is ke baad baqaya</span>
                  <span className="font-semibold">{money(Math.max(0, dueNow - paidNum))}</span>
                </p>
              )}
            </div>
            {!v && <p className="text-xs text-clinic-ink/50">Treatment ki payment step 8 mein treatment par &quot;Payment lo&quot; se.</p>}
            <a href={`/admin/patients/${p.patient.id}/invoice`} className="justify-self-start text-xs font-semibold text-clinic-teal hover:underline">Poora hisaab / statement (print / PDF)</a>
            {p.plansSlot}
          </div>
        </Section>
      )}

      {/* 10. NEXT APPOINTMENT */}
      {v ? (
        <Section n={11} title="Agli Appointment">
          <div className="grid gap-3 sm:grid-cols-3">
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
                {activeTreatments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.teeth.length ? ` (${t.teeth.join(', ')})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-2 text-xs text-clinic-ink/50">&quot;Finish Visit&quot; par appointment khud ban jayegi (Appointments aur Home par). Dobara Finish se dohri nahi banti.</p>
        </Section>
      ) : (
        <Locked n={11} title="Agli Appointment" />
      )}

      {/* SAVE DRAFT / FINISH VISIT */}
      {v && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-clinic-teal/15 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          {msg && <p className={`mb-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.t}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-clinic-ink/50">Visit {fmtDate(v.visit_date)} · draft</p>
            <div className="flex gap-2">
              <button onClick={saveDraft} disabled={!!busy} className="rounded-full border-2 border-clinic-teal px-5 py-2.5 text-sm font-semibold text-clinic-teal disabled:opacity-50">
                {busy === 'draft' ? 'Save...' : 'Save Draft'}
              </button>
              <button onClick={finish} disabled={!!busy} className="rounded-full bg-clinic-teal px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {busy === 'finish' ? 'Mukammal ho raha hai...' : 'Finish Visit ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
      {!v && msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.t}</p>}
    </div>
  )
}

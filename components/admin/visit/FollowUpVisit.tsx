'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtDate, money, numFmt } from '@/lib/karachi'
import { friendlyError } from '@/lib/errors'
import { toothLabel } from '@/lib/teeth'
import { messageLink } from '@/lib/messages'
import { saveVisitDone } from './VisitDoneBanner'
import { stagesFor, MONTHLY_RE, LAB_WORK_RE } from '@/lib/treatmentStages'

export interface FuVisit {
  id: string
  visit_no: number | null
  visit_date: string
  procedure: string | null
  notes: string | null
}
export interface FuStage {
  id: string
  label: string
  sort_order: number
  done_on: string | null
}
export interface FuMaterial {
  inventory_id: string
  name: string
  unit: string | null
  default_qty: number
}
export interface FuMedicine {
  id: string
  category: string
  name: string
  strength: string | null
  potency: string | null
  default_dose: string | null
  default_frequency: string | null
  default_duration: string | null
  instructions: string | null
}
interface RxLine {
  key: string
  medicine_id: string | null
  name: string
  potency: string
  dose: string
  frequency: string
  duration: string
  instructions: string
}

const box = 'rounded-2xl border border-clinic-teal/10 bg-white p-4'
const inp = 'rounded-lg border border-clinic-teal/25 px-3 py-2 text-sm outline-none focus:border-clinic-teal'
const h = 'font-display text-base font-semibold text-clinic-ink'

function plusMonth(d: string): string {
  const [y, m, dd] = d.split('-').map(Number)
  const n = new Date(y, m, 1)
  const last = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()
  const day = Math.min(dd, last)
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0')
}

export default function FollowUpVisit({
  patient,
  treatment,
  visitNo,
  visits,
  stages,
  linked,
  stock,
  medicines,
  money: mny,
  dues,
  canCollect,
  canRx,
  canLab,
  tpl,
  today,
}: {
  patient: { id: string; full_name: string; phone: string | null; gender: string | null; mr_number: string | null }
  treatment: { id: string; name: string; teeth: string[]; catalog_id: string | null }
  visitNo: number
  visits: FuVisit[]
  stages: FuStage[]
  linked: FuMaterial[]
  stock: FuMaterial[]
  medicines: FuMedicine[]
  money: { charged: number; paid: number; balance: number; patientBalance: number } | null
  dues: { id: string; due: number }[]
  canCollect: boolean
  canRx: boolean
  canLab: boolean
  tpl: Record<string, string>
  today: string
}) {
  const router = useRouter()
  const monthly = MONTHLY_RE.test(treatment.name)
  const template = stagesFor(treatment.name)
  const [tick, setTick] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [mat, setMat] = useState<Record<string, { on: boolean; qty: string }>>({})
  const [extras, setExtras] = useState<{ key: string; inventory_id: string; qty: string }[]>([])
  const [paid, setPaid] = useState('')
  const [method, setMethod] = useState('cash')
  const [complete, setComplete] = useState(false)
  const [nextDate, setNextDate] = useState(monthly ? plusMonth(today) : '')
  const [nextTime, setNextTime] = useState('')
  const [rxOpen, setRxOpen] = useState(false)
  const [rxQ, setRxQ] = useState('')
  const [lines, setLines] = useState<RxLine[]>([])
  const [newStage, setNewStage] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const finishKey = useRef('')
  const keyN = useRef(0)
  const newKey = () => 'k' + ++keyN.current

  const paidNum = Number(paid) || 0
  const bal = mny ? Math.round(dues.reduce((x, d) => x + d.due, 0) * 100) / 100 : 0
  const teethTxt = treatment.teeth.length ? treatment.teeth.map(toothLabel).join(', ') : ''
  const last = visits[0]
  const tickedLabels = stages.filter((s) => !s.done_on && tick[s.id]).map((s) => s.label)
  const allDone = stages.length > 0 && stages.every((s) => Boolean(s.done_on) || Boolean(tick[s.id]))

  async function stageRun(key: string, fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(key)
    setErr('')
    const { error } = await fn()
    setBusy('')
    if (error) return setErr(friendlyError(error.message))
    router.refresh()
  }

  function addMed(m: FuMedicine | null) {
    const name = m ? m.name : rxQ.trim()
    if (!name) return
    setLines((ls) => [
      ...ls,
      { key: newKey(), medicine_id: m?.id ?? null, name, potency: m?.potency || m?.strength || '', dose: m?.default_dose ?? '', frequency: m?.default_frequency ?? '', duration: m?.default_duration ?? '', instructions: m?.instructions ?? '' },
    ])
    setRxQ('')
  }
  const updLine = (key: string, patch: Partial<RxLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const medHits = rxQ.trim() ? medicines.filter((m) => m.name.toLowerCase().includes(rxQ.trim().toLowerCase())).slice(0, 8) : []

  async function finish() {
    if (busy) return
    setErr('')
    if (!tickedLabels.length && !note.trim()) return setErr('Aaj kya hua? Kam az kam ek qadam par tick lagayein ya note likhein.')
    if (paidNum < 0) return setErr('Raqam ghalat hai')
    if (paidNum > bal + 0.001) return setErr('Mili raqam is ilaaj ke baqaya (' + money(bal) + ') se zyada hai')
    if (lines.some((l) => !l.name.trim())) return setErr('Har dawa ka naam likhein')
    for (const e of extras) if (e.inventory_id && !(Number(e.qty) > 0)) return setErr('Samaan ki miqdar likhein')
    setBusy('finish')
    if (!finishKey.current) finishKey.current = 'fu-' + (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + String(Math.random()).slice(2))
    const sb = createClient()
    const { data: vid, error: oErr } = await sb.rpc('open_clinical_visit', { p_patient_id: patient.id })
    if (oErr || !vid) {
      setBusy('')
      return setErr(friendlyError(oErr?.message ?? 'Visit nahi khul saka'))
    }
    const procedure = tickedLabels.join(', ')
    const rx = lines.length
      ? {
          category: medicines.find((m) => m.id === lines[0].medicine_id)?.category === 'homeopathic' ? 'homeopathic' : 'dental',
          notes_en: '',
          items: lines.map((l) => ({ medicine_id: l.medicine_id, name_en: l.name, name: l.name, potency: l.potency, dosage: l.dose, frequency: l.frequency, duration: l.duration, instructions: l.instructions, mode: 'rx', qty: null, price: null })),
        }
      : null
    const { data: res, error } = await sb.rpc('finish_clinical_visit', {
      p_id: vid,
      p_data: { next_date: complete ? '' : nextDate || '', next_time: !complete && nextDate ? nextTime : '', next_treatment_id: !complete && nextDate ? treatment.id : '', notes: note.trim() },
      p_rx: rx,
      p_extra: [],
      p_treatments: [{ treatment_id: treatment.id, notes: note.trim(), procedure, condition: null }],
      p_discount: 0,
      p_paid: 0,
      p_method: method,
      p_key: finishKey.current,
    })
    if (error) {
      setBusy('')
      return setErr(friendlyError(error.message))
    }
    let w = ''
    const ids = stages.filter((s) => !s.done_on && tick[s.id]).map((s) => s.id)
    if (ids.length) {
      const { error: sErr } = await sb.from('treatment_stages').update({ done_on: today }).in('id', ids)
      if (sErr) w += 'Qadam par tick save nahi hua: ' + friendlyError(sErr.message) + ' '
    }
    let payFail = false
    let paidOk = 0
    if (canCollect && paidNum > 0) {
      let left = paidNum
      let n = 0
      for (const d of dues) {
        if (left <= 0) break
        const part = Math.min(left, d.due)
        const { error: pErr } = await sb.rpc('collect_payment', { p_invoice_id: d.id, p_amount: part, p_method: method, p_key: finishKey.current + ':pay' + n++ })
        if (pErr) {
          payFail = true
          w += 'Visit mukammal, lekin ' + money(left) + ' ki payment save nahi hui: ' + friendlyError(pErr.message) + ' '
          break
        }
        left = Math.round((left - part) * 100) / 100
      }
      paidOk = Math.round((paidNum - left) * 100) / 100
      if (payFail) setPaid(String(paidNum - left))
    }
    const usage = new Map<string, number>()
    for (const m of linked) {
      const st = mat[m.inventory_id]
      const q = st?.on ? Number(st.qty) || 0 : 0
      if (q > 0) usage.set(m.inventory_id, (usage.get(m.inventory_id) ?? 0) + q)
    }
    for (const e of extras) {
      const q = Number(e.qty) || 0
      if (e.inventory_id && q > 0) usage.set(e.inventory_id, (usage.get(e.inventory_id) ?? 0) + q)
    }
    let i = 0
    const failed: string[] = []
    for (const [inventory_id, qty] of usage) {
      const { error: uErr } = await sb.rpc('record_usage', { p_items: [{ inventory_id, qty, treatment_id: treatment.catalog_id }], p_patient_id: patient.id, p_invoice_id: null, p_note: 'Visit ' + visitNo + ': ' + treatment.name, p_key: finishKey.current + ':stk' + i++ })
      if (uErr) failed.push(friendlyError(uErr.message))
    }
    if (failed.length) w += failed.length + ' samaan stock se nahi kata: ' + failed.join(' ') + ' '
    if (complete) {
      const { error: cErr } = await sb.rpc('set_treatment_status', { p_treatment_id: treatment.id, p_status: 'completed' })
      if (cErr) w += 'Ilaaj mukammal nahi likha ja saka: ' + friendlyError(cErr.message) + ' '
    }
    const r = res as { prescription_id?: string | null }
    saveVisitDone(treatment.id, {
      title: 'Visit ' + visitNo + ' mukammal ho gayi' + (complete ? ' · ilaaj mukammal' : ''),
      warn: w.trim() || undefined,
      visit_id: vid as string,
      prescription_id: r.prescription_id ?? null,
      hasInvoice: Boolean(mny) && paidOk > 0,
      sum: {
        work: treatment.name + (teethTxt ? ' (' + teethTxt + ')' : '') + (procedure ? ': ' + procedure : ''),
        next_date: !complete && nextDate ? fmtDate(nextDate) : '',
        next_time: !complete && nextDate ? nextTime : '',
        next_work: !complete && nextDate ? treatment.name : '',
        today_paid: mny && paidOk > 0 ? numFmt(paidOk) : '',
        balance: mny ? numFmt(Math.max(0, mny.patientBalance - paidOk)) : '',
      },
      at: Date.now(),
    })
    router.push('/admin/patients/' + patient.id + '/treatment/' + treatment.id)
    router.refresh()
  }

  const header = (
    <div className={box + ' mt-2'} data-testid="fu-header">
      <p className="text-sm text-clinic-ink/60">
        {patient.full_name}
        {patient.mr_number ? ' · ' + patient.mr_number : ''}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
        {treatment.name}
        {teethTxt ? <span className="ml-1 text-sm font-normal text-clinic-ink/60">({teethTxt})</span> : null}
        <span className="ml-2 rounded-full bg-clinic-mint px-2.5 py-0.5 text-xs font-semibold text-clinic-teal" data-testid="fu-visit-no">
          Visit {visitNo}
        </span>
      </p>
      {mny && (
        <p className="mt-1 text-sm">
          Is ilaaj ka bill {money(mny.charged)} · mila {money(mny.paid)} · <span className={bal > 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-700'}>baqaya {money(bal)}</span>
        </p>
      )}
    </div>
  )

  return (
    <div className="grid gap-3 pb-24" data-testid="fu-page">
      {header}

      {last && (
        <div className={box} data-testid="fu-last">
          <p className={h}>Pichli visit</p>
          <ul className="mt-1 grid gap-1 text-sm text-clinic-ink/80">
            {visits.map((v) => (
              <li key={v.id}>
                Visit {v.visit_no ?? ''} · {fmtDate(v.visit_date)}
                {v.procedure || v.notes ? ': ' + [v.procedure, v.notes].filter(Boolean).join(' — ') : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={box} data-testid="fu-work">
        <p className={h}>Aaj kya hua</p>
        {stages.length > 0 ? (
          <ul className="mt-2 grid gap-2">
            {stages.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm" data-testid="fu-stage">
                <label className="flex min-h-[40px] flex-1 items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" disabled={Boolean(s.done_on)} checked={Boolean(s.done_on) || Boolean(tick[s.id])} onChange={(e) => setTick({ ...tick, [s.id]: e.target.checked })} />
                  <span className={s.done_on ? 'text-clinic-ink/50 line-through' : ''}>{s.label}</span>
                  {s.done_on && <span className="text-xs text-emerald-700">{fmtDate(s.done_on)}</span>}
                </label>
                {!s.done_on && (
                  <button type="button" disabled={busy === s.id} onClick={() => stageRun(s.id, () => createClient().from('treatment_stages').delete().eq('id', s.id))} className="text-xs text-red-600 underline">
                    Hatayein
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-clinic-ink/60">Is ilaaj ke qadam abhi nahi bane.</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {stages.length === 0 && template.length > 0 && (
            <button
              type="button"
              data-testid="fu-stages-make"
              disabled={busy === 'tpl'}
              onClick={() => stageRun('tpl', () => createClient().from('treatment_stages').insert(template.map((label, i) => ({ treatment_id: treatment.id, patient_id: patient.id, label, sort_order: i }))))}
              className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal"
            >
              Aam qadam daalein ({template.length})
            </button>
          )}
          <input value={newStage} onChange={(e) => setNewStage(e.target.value)} placeholder="Naya qadam likhein" aria-label="Naya qadam likhein" className={inp + ' min-w-0 flex-1'} />
          <button
            type="button"
            data-testid="fu-stage-add"
            disabled={!newStage.trim() || busy === 'ns'}
            onClick={() =>
              stageRun('ns', async () => {
                const r = await createClient().from('treatment_stages').insert({ treatment_id: treatment.id, patient_id: patient.id, label: newStage.trim(), sort_order: stages.length ? Math.max(...stages.map((s) => s.sort_order)) + 1 : 0 })
                if (!r.error) setNewStage('')
                return r
              })
            }
            className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Jorein
          </button>
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Aaj kya kiya (note)" aria-label="Aaj kya kiya (note)" data-testid="fu-note" className={inp + ' mt-3 w-full'} />
      </div>

      <div className={box} data-testid="fu-materials">
        <p className={h}>Material kaunsa laga</p>
        {linked.length > 0 ? (
          <ul className="mt-2 grid gap-2">
            {linked.map((m) => {
              const st = mat[m.inventory_id] ?? { on: false, qty: String(m.default_qty || 1) }
              return (
                <li key={m.inventory_id} className="flex flex-wrap items-center gap-2 text-sm" data-testid="fu-mat">
                  <label className="flex min-h-[40px] flex-1 items-center gap-2">
                    <input type="checkbox" className="h-5 w-5" checked={st.on} onChange={(e) => setMat({ ...mat, [m.inventory_id]: { ...st, on: e.target.checked } })} />
                    <span>{m.name}</span>
                  </label>
                  {st.on && (
                    <span className="flex items-center gap-1">
                      <input type="number" min={0} step="any" value={st.qty} aria-label={'Miqdar ' + m.name} onChange={(e) => setMat({ ...mat, [m.inventory_id]: { ...st, qty: e.target.value } })} className={inp + ' w-20'} />
                      <span className="text-xs text-clinic-ink/60">{m.unit ?? ''}</span>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-clinic-ink/60">Is ilaaj ke sath koi material jura hua nahi. Neeche list se chunein.</p>
        )}
        {extras.map((e) => (
          <div key={e.key} className="mt-2 flex flex-wrap items-center gap-2" data-testid="fu-extra">
            <select value={e.inventory_id} aria-label="Samaan chunein" onChange={(ev) => setExtras(extras.map((x) => (x.key === e.key ? { ...x, inventory_id: ev.target.value } : x)))} className={inp + ' min-w-0 flex-1'}>
              <option value="">Samaan chunein</option>
              {stock.map((s) => (
                <option key={s.inventory_id} value={s.inventory_id}>
                  {s.name}
                  {s.unit ? ' (' + s.unit + ')' : ''}
                </option>
              ))}
            </select>
            <input type="number" min={0} step="any" value={e.qty} aria-label="Miqdar" onChange={(ev) => setExtras(extras.map((x) => (x.key === e.key ? { ...x, qty: ev.target.value } : x)))} className={inp + ' w-20'} />
            <button type="button" onClick={() => setExtras(extras.filter((x) => x.key !== e.key))} className="text-xs text-red-600 underline">
              Hatayein
            </button>
          </div>
        ))}
        {stock.length > 0 && (
          <button type="button" data-testid="fu-extra-add" onClick={() => setExtras([...extras, { key: newKey(), inventory_id: '', qty: '1' }])} className="mt-2 rounded-full border border-clinic-teal/40 px-4 py-2 text-sm font-semibold text-clinic-teal">
            + Aur samaan chunein
          </button>
        )}
      </div>

      {mny && canCollect && (
        <div className={box} data-testid="fu-pay">
          <p className={h}>Paise</p>
          {bal > 0 ? (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Aaj kitne mile</span>
                <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Tareeqa" className={inp}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                </select>
                <input type="number" min={0} max={bal} value={paid} onChange={(e) => { setPaid(e.target.value); setErr('') }} aria-label="Aaj kitne mile" data-testid="fu-paid" className={inp + ' w-28'} />
              </div>
              <p className="mt-1 text-sm text-clinic-ink/70" data-testid="fu-after">
                Is ke baad is ilaaj ka baqaya: {money(Math.max(0, bal - paidNum))}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-emerald-700">Is ilaaj ka koi baqaya nahi.</p>
          )}
        </div>
      )}

      <div className={box} data-testid="fu-next">
        <p className={h}>Aage kya</p>
        {allDone && !complete && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" data-testid="fu-all-done">
            <span>Sab qadam ho gaye. Kya ye ilaaj mukammal kar dun?</span>
            <button type="button" data-testid="fu-all-done-yes" onClick={() => setComplete(true)} className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white">
              Haan, mukammal
            </button>
          </div>
        )}
        <label className="mt-2 flex min-h-[40px] items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={complete} data-testid="fu-complete" onChange={(e) => setComplete(e.target.checked)} />
          <span>Ye ilaaj mukammal ho gaya (agli visit nahi)</span>
        </label>
        {!complete && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm">Agli tareekh</span>
            <input type="date" min={today} value={nextDate} onChange={(e) => setNextDate(e.target.value)} aria-label="Agli tareekh" data-testid="fu-next-date" className={inp} />
            <input type="time" value={nextTime} onChange={(e) => setNextTime(e.target.value)} aria-label="Waqt" className={inp} />
            {nextDate && (
              <button type="button" onClick={() => setNextDate('')} className="text-xs text-clinic-ink/60 underline">
                Tareekh hatayein
              </button>
            )}
          </div>
        )}
        {!complete && monthly && <p className="mt-1 text-xs text-clinic-ink/60">Mahana ilaaj hai, is liye ek mahine baad ki tareekh khud bhar di. Aap badal sakte hain.</p>}
      </div>

      {canRx && (
        <div className={box} data-testid="fu-rx">
          {!rxOpen ? (
            <button type="button" data-testid="fu-rx-open" onClick={() => setRxOpen(true)} className="rounded-full border border-clinic-teal/40 px-4 py-2 text-sm font-semibold text-clinic-teal">
              Dawa likhni hai
            </button>
          ) : (
            <>
              <p className={h}>Dawa</p>
              <div className="mt-2 flex gap-2">
                <input value={rxQ} onChange={(e) => setRxQ(e.target.value)} placeholder="Dawa ka naam likhein" aria-label="Dawa ka naam likhein" className={inp + ' min-w-0 flex-1'} />
                <button type="button" disabled={!rxQ.trim()} onClick={() => addMed(null)} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                  Jorein
                </button>
              </div>
              {medHits.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {medHits.map((m) => (
                    <button key={m.id} type="button" onClick={() => addMed(m)} className="rounded-full border border-clinic-teal/30 px-3 py-1 text-xs text-clinic-teal">
                      + {m.name}
                      {m.strength ? ' ' + m.strength : ''}
                      {m.potency ? ' ' + m.potency : ''}
                    </button>
                  ))}
                </div>
              )}
              {lines.map((l) => (
                <div key={l.key} className="mt-2 grid gap-2 rounded-lg border border-clinic-teal/15 p-2 sm:grid-cols-4" data-testid="fu-rx-line">
                  <input value={l.name} onChange={(e) => updLine(l.key, { name: e.target.value })} aria-label="Dawa" className={inp + ' sm:col-span-2'} />
                  <input value={l.dose} onChange={(e) => updLine(l.key, { dose: e.target.value })} placeholder="Khuraak" aria-label="Khuraak" className={inp} />
                  <input value={l.frequency} onChange={(e) => updLine(l.key, { frequency: e.target.value })} placeholder="Din mein kitni baar" aria-label="Din mein kitni baar" className={inp} />
                  <input value={l.duration} onChange={(e) => updLine(l.key, { duration: e.target.value })} placeholder="Kitne din" aria-label="Kitne din" className={inp} />
                  <input value={l.instructions} onChange={(e) => updLine(l.key, { instructions: e.target.value })} placeholder="Hidayat" aria-label="Hidayat" className={inp + ' sm:col-span-2'} />
                  <button type="button" onClick={() => setLines(lines.filter((x) => x.key !== l.key))} className="text-left text-xs text-red-600 underline">
                    Hatayein
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {canLab && LAB_WORK_RE.test(treatment.name) && (
        <a href={'/admin/lab?patient=' + patient.id + '&treatment=' + treatment.id} target="_blank" data-testid="fu-lab" className="text-sm font-semibold text-clinic-teal underline">
          Is ilaaj ka lab ka kaam (bhejna / halat dekhna) →
        </a>
      )}

      {err && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="fu-err">
          {err}
        </p>
      )}
      <button type="button" onClick={finish} disabled={busy === 'finish'} data-testid="fu-finish" className="min-h-[52px] rounded-full bg-clinic-teal px-6 py-3 text-base font-semibold text-white disabled:opacity-50">
        {busy === 'finish' ? 'Save ho raha hai…' : 'Visit khatam karein'}
      </button>
    </div>
  )
}

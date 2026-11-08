'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { toothTitle as toothLabel } from '@/lib/teeth'
import { fmtDate, money } from '@/lib/karachi'
import type { TItem } from './visit/types'
import PaymentPlan, { type Plan } from './PaymentPlan'

export interface Stage {
  id: string
  treatment_id: string
  label: string
  sort_order: number
  done_on: string | null
}
export interface LabLite {
  id: string
  treatment_id: string | null
  work_type: string | null
  status: string
  due_date: string | null
}

const LONG = /braces|aligner|implant|bone graft|denture/i
const TEMPLATES: { re: RegExp; stages: string[] }[] = [
  { re: /braces|aligner/i, stages: ['Records / X-ray / impression', 'Braces lagaye', 'Mahana adjustment (jaari)', 'Braces utare', 'Retainer lagaya'] },
  { re: /implant/i, stages: ['Planning / CBCT', 'Implant surgery', 'Healing (3-6 mahine)', 'Abutment / impression', 'Crown fit'] },
  { re: /denture/i, stages: ['Impression', 'Bite / try-in', 'Denture fit', 'Review / adjustment'] },
]

const STATUS: Record<string, string> = { planned: 'sirf plan', active: 'chal rahi', completed: 'mukammal', cancelled: 'cancel' }
const LAB: Record<string, string> = { pending: 'lab ko bhejna hai', sent: 'lab ko bheja', in_progress: 'lab mein ban raha', received: 'lab se aa gaya', fitted: 'fit ho gaya' }

/** Har treatment ka aik card: kitni visits, kharcha / mila / baqaya, tasveerein, lab ki halat, aur lambi treatment ke marhale */
export default function TreatmentCards({
  patientId,
  treatments,
  labs,
  stages,
  canMoney,
  canEdit,
  plans = [],
  canBill = false,
  patientName = '',
  phone = null,
}: {
  patientId: string
  treatments: TItem[]
  labs: LabLite[]
  stages: Stage[]
  canMoney: boolean
  canEdit: boolean
  plans?: Plan[]
  canBill?: boolean
  patientName?: string
  phone?: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [custom, setCustom] = useState<Record<string, string>>({})
  const list = treatments.filter((t) => t.status !== 'planned' || t.visits.length > 0)
  if (list.length === 0) return null

  async function run(key: string, fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(key)
    setErr('')
    const { error } = await fn()
    setBusy('')
    if (error) return setErr(friendlyError(error.message))
    router.refresh()
  }
  const sb = () => createClient()

  return (
    <section className="mt-4 rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold text-clinic-ink">Treatments ka hisaab</h2>
      <p className="mb-3 text-xs text-clinic-ink/55">Har treatment: kitni visits hui, kharcha, mila, baqaya, tasveerein aur lab ki halat.</p>
      {err && <p className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      <div className="grid gap-3">
        {list.map((t) => {
          const st = stages.filter((s) => s.treatment_id === t.id).sort((a, b) => a.sort_order - b.sort_order)
          const tl = labs.filter((l) => l.treatment_id === t.id)
          const tpl = TEMPLATES.find((x) => x.re.test(t.name))
          const long = LONG.test(t.name)
          return (
            <div key={t.id} className="rounded-xl border border-clinic-teal/15 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-clinic-ink">{t.name}</span>
                {t.teeth.length > 0 && <span className="text-xs text-clinic-ink/60">({t.teeth.map(toothLabel).join(', ')})</span>}
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${t.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : t.status === 'cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-800'}`}>{STATUS[t.status] ?? t.status}</span>
              </div>
              <p className="mt-1 text-xs text-clinic-ink/60">
                {t.visits.length} visit{t.visits.length === 1 ? '' : 's'} · shuru {fmtDate(t.started_on)}
                {t.completed_on ? ` · mukammal ${fmtDate(t.completed_on)}` : ''}
                {(t.photos ?? []).length > 0 ? ` · ${(t.photos ?? []).length} tasveerein` : ''}
              </p>
              {canMoney && (
                <p className="mt-1 text-sm text-clinic-ink/80">
                  Kharcha {money(t.charged)} · Mila {money(t.paid)}
                  {t.balance > 0 ? <span className="font-semibold text-red-600"> · Baqaya {money(t.balance)}</span> : <span className="text-emerald-700"> · hisaab saaf</span>}
                </p>
              )}
              {canEdit && t.status === 'active' && t.visits.length > 0 && (
                <Link
                  href={`/admin/patients/${patientId}?continue=${t.id}`}
                  data-testid="next-visit"
                  className="mt-2 inline-flex min-h-[44px] items-center rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white"
                >
                  Visit {t.visits.length + 1} shuru karein →
                </Link>
              )}
              {canEdit && canMoney && t.status === 'active' && t.visits.length > 0 && t.balance <= 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  <span>Paisa poora mil gaya. Kaam khatam hai to treatment mukammal karein.</span>
                  <button
                    type="button"
                    disabled={busy === 'done-' + t.id}
                    onClick={() => run('done-' + t.id, () => sb().rpc('set_treatment_status', { p_treatment_id: t.id, p_status: 'completed' }))}
                    className="rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Mukammal karein
                  </button>
                </div>
              )}
              {canMoney && t.status !== 'cancelled' && (
                <PaymentPlan treatmentId={t.id} paid={t.paid} balance={t.balance} plan={plans.find((p) => p.patient_treatment_id === t.id) ?? null} canEdit={canBill} patientName={patientName} phone={phone} />
              )}
              {tl.length > 0 && (
                <p className="mt-1 flex flex-wrap gap-2 text-xs">
                  {tl.map((l) => (
                    <Link key={l.id} href={`/admin/lab/${l.id}`} className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-800 hover:underline">
                      Lab: {l.work_type ?? 'kaam'} — {LAB[l.status] ?? l.status}
                      {l.due_date && !['received', 'fitted'].includes(l.status) ? ` (due ${fmtDate(l.due_date)})` : ''}
                    </Link>
                  ))}
                </p>
              )}

              {(long || st.length > 0) && (
                <div className="mt-2 rounded-lg bg-clinic-mint/40 p-2">
                  <p className="text-xs font-semibold text-clinic-ink/70">Marhale (stages)</p>
                  {st.length > 0 && (
                    <ul className="mt-1 grid gap-1">
                      {st.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            disabled={!canEdit || busy === s.id}
                            checked={Boolean(s.done_on)}
                            onChange={(e) => run(s.id, () => sb().from('treatment_stages').update({ done_on: e.target.checked ? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }) : null }).eq('id', s.id))}
                            className="h-4 w-4"
                          />
                          <span className={s.done_on ? 'text-clinic-ink/50 line-through' : ''}>{s.label}</span>
                          {s.done_on && <span className="text-[11px] text-emerald-700">{fmtDate(s.done_on)}</span>}
                          {canEdit && (
                            <button type="button" onClick={() => run(s.id + 'd', () => sb().from('treatment_stages').delete().eq('id', s.id))} className="ml-auto text-[11px] text-red-600">
                              hatao
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {canEdit && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {st.length === 0 && tpl && (
                        <button
                          type="button"
                          disabled={busy === t.id}
                          onClick={() => run(t.id, () => sb().from('treatment_stages').insert(tpl.stages.map((label, i) => ({ treatment_id: t.id, patient_id: patientId, label, sort_order: i }))))}
                          className="rounded-full border border-clinic-teal px-3 py-1 text-xs font-semibold text-clinic-teal"
                        >
                          Aam marhale daalein
                        </button>
                      )}
                      <input
                        value={custom[t.id] ?? ''}
                        onChange={(e) => setCustom({ ...custom, [t.id]: e.target.value })}
                        placeholder="Naya marhala"
                        className="rounded-lg border border-clinic-teal/25 px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        disabled={!(custom[t.id] ?? '').trim() || busy === t.id + 'n'}
                        onClick={() => run(t.id + 'n', async () => {
                          const r = await sb().from('treatment_stages').insert({ treatment_id: t.id, patient_id: patientId, label: (custom[t.id] ?? '').trim(), sort_order: st.length })
                          if (!r.error) setCustom({ ...custom, [t.id]: '' })
                          return r
                        })}
                        className="rounded-full bg-clinic-teal px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Jorein
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

import Link from 'next/link'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { TItem, TVisit } from '@/components/admin/visit/types'
import type { Plan as PayPlan, PlanItem } from '@/components/admin/PaymentPlan'
import TreatmentCards, { type Stage, type LabLite } from '@/components/admin/TreatmentCards'
import { money, fmtDate } from '@/lib/karachi'

type Sb = Awaited<ReturnType<typeof createClient>>
const num = (v: unknown) => Number(v ?? 0)

export async function loadTreatments(supabase: Sb, patientId: string): Promise<TItem[]> {
  const [tRes, vRes, bRes, payRes, invRes, phRes] = await Promise.all([
    supabase
      .from('patient_treatments')
      .select('id, name, teeth, status, price, list_price, doctor, started_on, completed_on, cancel_reason')
      .eq('patient_id', patientId)
      .order('started_on', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('visit_notes')
      .select('id, treatment_id, visit_no, visit_date, procedure, notes, next_visit')
      .eq('patient_id', patientId)
      .not('treatment_id', 'is', null)
      .is('voided_at', null),
    supabase.from('treatment_balances').select('treatment_id, charged, paid, balance').eq('patient_id', patientId),
    supabase.from('payments').select('id, invoice_id, paid_on, amount, method, kind, created_at').eq('patient_id', patientId).order('created_at'),
    supabase.from('invoices').select('id, patient_treatment_id').eq('patient_id', patientId).not('patient_treatment_id', 'is', null),
    supabase
      .from('patient_photos')
      .select('id, storage_path, caption, category, treatment_id, visit_id')
      .eq('patient_id', patientId)
      .not('treatment_id', 'is', null),
  ])
  const visits = new Map<string, TVisit[]>()
  for (const v of vRes.data ?? []) {
    const list = visits.get(v.treatment_id as string) ?? []
    list.push(v as TVisit)
    visits.set(v.treatment_id as string, list)
  }
  const bal = new Map((bRes.data ?? []).map((b) => [b.treatment_id as string, b]))
  const invT = new Map((invRes.data ?? []).map((i) => [i.id as string, i.patient_treatment_id as string]))
  const pays = new Map<string, NonNullable<TItem['payments']>>()
  for (const p of payRes.data ?? []) {
    const tid = invT.get(p.invoice_id as string)
    if (!tid) continue
    ;(pays.get(tid) ?? pays.set(tid, []).get(tid)!).push({ id: p.id, paid_on: p.paid_on, amount: num(p.amount), method: p.method, kind: p.kind })
  }
  const photos = new Map<string, NonNullable<TItem['photos']>>()
  for (const ph of phRes.data ?? []) {
    ;(photos.get(ph.treatment_id as string) ?? photos.set(ph.treatment_id as string, []).get(ph.treatment_id as string)!).push(ph as NonNullable<TItem['photos']>[number])
  }
  return (tRes.data ?? []).map((t) => {
    const b = bal.get(t.id)
    return {
      ...t,
      teeth: (t.teeth ?? []) as string[],
      price: num(t.price),
      list_price: num(t.list_price),
      charged: num(b?.charged),
      paid: num(b?.paid),
      balance: num(b?.balance),
      visits: visits.get(t.id) ?? [],
      payments: pays.get(t.id) ?? [],
      photos: photos.get(t.id) ?? [],
    } as TItem
  })
}

export const getTreatments = cache(async (patientId: string) => loadTreatments(await createClient(), patientId))

export type PatientRow = {
  age?: number | null
  date_of_birth?: string | null
  id: string
  full_name: string
  phone: string
  department: string
  mr_number: string | null
  primary_doctor?: string | null
  portal_code?: string | null
}

export async function TreatmentCardsSlot({ patientId, patientName, phone, canMoney, canBill, canEdit, canLab, only }: { only?: string; patientId: string; patientName: string; phone: string | null; canMoney: boolean; canBill: boolean; canEdit: boolean; canLab: boolean }) {
  const supabase = await createClient()
  const all = await getTreatments(patientId)
  const treatments = only ? all.filter((t) => t.id === only) : all
  const [labRes, stRes, planRes] = await Promise.all([
    canLab ? supabase.from('lab_cases').select('id, treatment_id, work_type, status, due_date').eq('patient_id', patientId).is('deleted_at', null) : Promise.resolve({ data: [] }),
    supabase.from('treatment_stages').select('id, treatment_id, label, sort_order, done_on').eq('patient_id', patientId),
    canMoney
      ? supabase.from('payment_plans').select('id, patient_treatment_id, base_paid, planned_amount, payment_plan_items(id, no, due_date, amount)').eq('patient_id', patientId).eq('status', 'active')
      : Promise.resolve({ data: [], error: null }),
  ])
  // SQL abhi nahi chali ho to plans khali (page na toote)
  const plans: PayPlan[] = planRes.error
    ? []
    : ((planRes.data ?? []) as unknown as (Omit<PayPlan, 'items'> & { payment_plan_items: PlanItem[] })[]).map((p) => ({
        id: p.id,
        patient_treatment_id: p.patient_treatment_id,
        base_paid: Number(p.base_paid),
        planned_amount: Number(p.planned_amount),
        items: (p.payment_plan_items ?? []).map((i) => ({ ...i, amount: Number(i.amount) })),
      }))
  return (
    <TreatmentCards
      patientId={patientId}
      treatments={treatments}
      single={Boolean(only)}
      labs={(labRes.data ?? []) as LabLite[]}
      stages={('error' in stRes && stRes.error ? [] : stRes.data ?? []) as Stage[]}
      canMoney={canMoney}
      canEdit={canEdit}
      plans={plans}
      canBill={canBill}
      patientName={patientName}
      phone={phone}
      canLab={canLab}
    />
  )
}

export async function HistorySection({ patient, history, canClinical, canMoney, canRx, open }: { open?: boolean; patient: PatientRow; history: Record<string, unknown> | null; canClinical: boolean; canMoney: boolean; canRx: boolean }) {
  const supabase = await createClient()
  const { data } = canClinical
    ? await supabase
        .from('clinical_visits')
        .select('id, visit_date, complaint, diagnoses, doctor')
        .eq('patient_id', patient.id)
        .eq('status', 'finished')
        .order('visit_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30)
    : { data: [] }
  type CV = { id: string; visit_date: string; complaint: { items?: string[]; other?: string; duration?: string }; diagnoses: { text: string; teeth?: string[] }[]; doctor: string | null }
  const visits = (data ?? []) as CV[]
  if (visits.length === 0 && !history) return null

  // Har visit ki poori tasveer: kya kaam hua, bill/mila/baqaya, prescription, tasveerein
  const ids = visits.map((v) => v.id)
  const [vnRes, invRes, rxRes, phRes] = ids.length
    ? await Promise.all([
        supabase.from('visit_notes').select('clinical_visit_id, procedure, treatment_id, patient_treatments(name, teeth)').in('clinical_visit_id', ids).is('voided_at', null),
        canMoney ? supabase.from('invoices').select('clinical_visit_id, total, paid_amount, status').in('clinical_visit_id', ids).neq('status', 'void') : Promise.resolve({ data: [] }),
        canRx ? supabase.from('prescriptions').select('id, clinical_visit_id').in('clinical_visit_id', ids) : Promise.resolve({ data: [] }),
        supabase.from('patient_photos').select('clinical_visit_id').in('clinical_visit_id', ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]
  const done = new Map<string, { label: string; tid: string | null }[]>()
  for (const n of (vnRes.data ?? []) as unknown as { clinical_visit_id: string; procedure: string | null; treatment_id: string | null; patient_treatments: { name: string; teeth: string[] | null } | null }[]) {
    const t = n.patient_treatments
    const label = t ? `${t.name}${t.teeth?.length ? ` (${t.teeth.join(', ')})` : ''}` : n.procedure
    if (label) done.set(n.clinical_visit_id, [...(done.get(n.clinical_visit_id) ?? []), { label, tid: t ? n.treatment_id : null }])
  }
  const invMoney = new Map<string, { total: number; paid: number }>()
  for (const i of (invRes.data ?? []) as { clinical_visit_id: string; total: number; paid_amount: number }[]) {
    const m = invMoney.get(i.clinical_visit_id) ?? { total: 0, paid: 0 }
    invMoney.set(i.clinical_visit_id, { total: m.total + Number(i.total), paid: m.paid + Number(i.paid_amount) })
  }
  const rxBy = new Map(((rxRes.data ?? []) as { id: string; clinical_visit_id: string }[]).map((r) => [r.clinical_visit_id, r.id]))
  const photoN = new Map<string, number>()
  for (const f of (phRes.data ?? []) as { clinical_visit_id: string }[]) photoN.set(f.clinical_visit_id, (photoN.get(f.clinical_visit_id) ?? 0) + 1)

  return (
    <div className="grid gap-3">
      {canClinical && history && (
        <Link href={`/admin/patients/${patient.id}/history?view=summary`} className="justify-self-start text-xs font-semibold text-clinic-teal hover:underline">
          Poori purani history (print / PDF)
        </Link>
      )}
      {visits.length > 0 && (
        <details className="rounded-xl border border-clinic-teal/10 bg-white" open={open || visits.length <= 3}>
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-clinic-ink">
            Muaine aur visits <span className="ml-1 rounded-full bg-clinic-mint px-2 py-0.5 text-xs text-clinic-teal">{visits.length}</span>
          </summary>
          <ul className="divide-y divide-clinic-teal/10 border-t border-clinic-teal/10 px-4 text-sm">
            {visits.map((v) => (
              <li key={v.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-xs text-clinic-ink/50">
                    {fmtDate(v.visit_date)}
                    {v.doctor ? ` · ${v.doctor}` : ''}
                  </p>
                  <p className="text-clinic-ink">
                    {[...(v.complaint?.items ?? []).filter((x) => x !== 'Other'), v.complaint?.other].filter(Boolean).join(', ') || '—'}
                    {v.complaint?.duration ? <span className="text-clinic-ink/50"> ({v.complaint.duration})</span> : null}
                  </p>
                  {(v.diagnoses ?? []).length > 0 && <p className="text-xs text-clinic-teal">Dx: {(v.diagnoses ?? []).map((d) => d.text + (d.teeth?.length ? ` (${d.teeth.join(', ')})` : '')).join(' · ')}</p>}
                  {(done.get(v.id) ?? []).length > 0 && (
                    <p className="text-xs text-clinic-ink/80">
                      Kaam:{' '}
                      {(done.get(v.id) ?? []).map((d, i) => (
                        <span key={i}>
                          {i > 0 ? ' · ' : ''}
                          {d.tid ? (
                            <Link href={'/admin/patients/' + patient.id + '/treatment/' + d.tid} className="font-semibold text-clinic-teal underline">
                              {d.label}
                            </Link>
                          ) : (
                            d.label
                          )}
                        </span>
                      ))}
                    </p>
                  )}
                  {invMoney.get(v.id) && (
                    <p className="text-xs text-clinic-ink/70">
                      Bill {money(invMoney.get(v.id)!.total)} · Mila {money(invMoney.get(v.id)!.paid)}
                      {invMoney.get(v.id)!.total - invMoney.get(v.id)!.paid > 0 && <span className="text-red-600"> · Baqaya {money(invMoney.get(v.id)!.total - invMoney.get(v.id)!.paid)}</span>}
                    </p>
                  )}
                  {(photoN.get(v.id) ?? 0) > 0 && <p className="text-xs text-clinic-ink/60">Tasveerein: {photoN.get(v.id)}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Link href={`/admin/visits/${v.id}/print`} target="_blank" className="text-xs font-semibold text-clinic-teal hover:underline">
                    Record / PDF
                  </Link>
                  {rxBy.get(v.id) && (
                    <Link href={`/admin/prescriptions/${rxBy.get(v.id)}/print`} target="_blank" className="text-xs font-semibold text-clinic-teal hover:underline">
                      Prescription
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}


/** Profile par: har ilaaj ka chhota card (click se us ilaaj ka apna page) + muaine ka card */
export async function TreatmentMiniCards({ patientId, canMoney, canClinical }: { patientId: string; canMoney: boolean; canClinical: boolean }) {
  const supabase = await createClient()
  const [treatments, cvRes] = await Promise.all([
    getTreatments(patientId),
    canClinical ? supabase.from('clinical_visits').select('id', { count: 'exact', head: true }).eq('patient_id', patientId).eq('status', 'finished') : Promise.resolve({ count: 0 }),
  ])
  const list = treatments.filter((t) => t.status !== 'planned' || t.visits.length > 0)
  const planned = treatments.filter((t) => t.status === 'planned' && t.visits.length === 0)
  const visitCount = cvRes.count ?? 0
  if (list.length === 0 && planned.length === 0 && visitCount === 0) return null
  const chip: Record<string, string> = { planned: 'sirf plan', active: 'chal rahi', completed: 'mukammal', cancelled: 'cancel' }
  const tone: Record<string, string> = { planned: 'bg-amber-100 text-amber-800', active: 'bg-sky-100 text-sky-800', completed: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-gray-100 text-gray-600' }
  return (
    <section className="rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5" data-testid="mini-cards">
      <h2 className="font-display text-lg font-semibold text-clinic-ink">Ilaaj</h2>
      <p className="mb-3 text-xs text-clinic-ink/55">Kisi ilaaj par dabayein: us ki visits, qadam, paise, invoice, prescription aur lab ek jagah.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {[...list, ...planned].map((t) => (
          <Link key={t.id} href={'/admin/patients/' + patientId + '/treatment/' + t.id} data-testid="mini-card" className="flex min-h-[64px] flex-col justify-center rounded-xl border border-clinic-teal/15 px-3 py-2 hover:border-clinic-teal hover:bg-clinic-mint/30">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-clinic-ink">{t.name}</span>
              {t.teeth.length > 0 && <span className="text-xs text-clinic-ink/60">({t.teeth.join(', ')})</span>}
              <span className={'rounded-full px-2 py-0.5 text-[11px] ' + (tone[t.status] ?? '')}>{chip[t.status] ?? t.status}</span>
            </span>
            <span className="mt-0.5 text-xs text-clinic-ink/60">
              {t.visits.length} visit{t.visits.length === 1 ? '' : 's'}
              {canMoney ? (t.balance > 0 ? <span className="font-semibold text-red-600"> · baqaya {money(t.balance)}</span> : t.charged > 0 ? <span className="text-emerald-700"> · hisaab saaf</span> : null) : null}
              <span className="ml-1 text-clinic-teal"> · kholein →</span>
            </span>
          </Link>
        ))}
        {canClinical && visitCount > 0 && (
          <Link href={'/admin/patients/' + patientId + '/checkups'} data-testid="checkup-card" className="flex min-h-[64px] flex-col justify-center rounded-xl border border-clinic-teal/15 bg-clinic-mint/20 px-3 py-2 hover:border-clinic-teal">
            <span className="font-semibold text-clinic-ink">Checkup aur muaina</span>
            <span className="mt-0.5 text-xs text-clinic-ink/60">
              {visitCount} visit{visitCount === 1 ? '' : 's'}: takleef, tashkhees, dawa
              <span className="ml-1 text-clinic-teal"> · kholein →</span>
            </span>
          </Link>
        )}
      </div>
    </section>
  )
}

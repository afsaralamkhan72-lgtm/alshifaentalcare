import Link from 'next/link'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { TItem, TVisit } from '@/components/admin/visit/types'
import type { Plan as PayPlan, PlanItem } from '@/components/admin/PaymentPlan'
import TreatmentCards, { type Stage, type LabLite } from '@/components/admin/TreatmentCards'
import { money, fmtDate, numFmt, todayKarachi } from '@/lib/karachi'
import { messageLink } from '@/lib/messages'
import { mapTemplates, type Tpl } from '@/lib/messageTemplates'
import VisitGroupCard, { type VisitGroup } from '@/components/admin/VisitGroupCard'

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


/** Akhri (14 din ke andar) visit wale din ke sab kaam ek jagah: bill, mila, baqaya, khulasa, WhatsApp */
async function loadVisitGroups(
  supabase: Sb,
  patient: { id: string; full_name: string; phone: string | null; gender?: string | null },
  treatments: TItem[],
  docs: Map<string, TreatmentDocs>,
  tpl: Tpl,
  canMoney: boolean,
  canRx: boolean
): Promise<VisitGroup[]> {
  const live = treatments.filter((t) => t.visits.length > 0 && t.status !== 'planned')
  if (!live.length) return []
  const { data: vn } = await supabase
    .from('visit_notes')
    .select('treatment_id, clinical_visit_id, visit_no, visit_date')
    .eq('patient_id', patient.id)
    .is('voided_at', null)
    .not('treatment_id', 'is', null)
  const notes = (vn ?? []) as { treatment_id: string; clinical_visit_id: string | null; visit_no: number | null; visit_date: string }[]
  const opening = new Map<string, string | null>()
  for (const t of live) {
    const mine = notes
      .filter((n) => n.treatment_id === t.id)
      .sort((x, y) => (x.visit_no ?? 0) - (y.visit_no ?? 0) || x.visit_date.localeCompare(y.visit_date))
    opening.set(t.id, mine.find((n) => n.clinical_visit_id)?.clinical_visit_id ?? null)
  }
  const cvIds = [...new Set([...opening.values()].filter(Boolean))] as string[]
  const [cvRes, rxRes] = await Promise.all([
    cvIds.length ? supabase.from('clinical_visits').select('id, visit_date, notes, next_date, next_time, next_treatment_id').in('id', cvIds) : Promise.resolve({ data: [] }),
    canRx && cvIds.length ? supabase.from('prescriptions').select('id, clinical_visit_id, items, created_at').in('clinical_visit_id', cvIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
  ])
  const cvs = new Map(((cvRes.data ?? []) as { id: string; visit_date: string; notes: string | null; next_date: string | null; next_time: string | null; next_treatment_id: string | null }[]).map((c) => [c.id, c]))
  const rxBy = new Map<string, string>()
  for (const r of (rxRes.data ?? []) as { id: string; clinical_visit_id: string; items: unknown[] | null }[]) {
    if (!rxBy.has(r.clinical_visit_id) && (r.items ?? []).length) rxBy.set(r.clinical_visit_id, r.id)
  }
  const today = todayKarachi()
  const label = (t: TItem) => t.name + (t.teeth.length ? ' (' + t.teeth.join(', ') + ')' : '')
  const buckets = new Map<string, TItem[]>()
  for (const t of live) {
    const k = opening.get(t.id) ?? 'old'
    ;(buckets.get(k) ?? buckets.set(k, []).get(k)!).push(t)
  }
  const pinfo = { full_name: patient.full_name, phone: patient.phone ?? '', gender: patient.gender ?? null }
  const groups: VisitGroup[] = []
  for (const [k, ts] of buckets) {
    const cv = k === 'old' ? null : cvs.get(k) ?? null
    const date = cv?.visit_date ?? [...ts].map((t) => t.started_on).sort()[0]
    const total = ts.reduce((a, t) => a + t.charged, 0)
    const paid = ts.reduce((a, t) => a + t.paid, 0)
    const balance = ts.reduce((a, t) => a + Math.max(0, t.balance), 0)
    const open = ts.filter((t) => t.status === 'active')
    const waHref =
      canMoney && patient.phone
        ? messageLink(
            'day_summary',
            pinfo,
            {
              summary: (cv?.notes ?? '').trim(),
              work_lines: ts.map((t) => '• ' + label(t) + ' — Rs. ' + numFmt(t.charged)).join('\n'),
              day_total: numFmt(total),
              today_paid: numFmt(paid),
              balance: numFmt(balance),
              due_block: ts.some((t) => t.balance > 0) ? 'ہر کام کا بقایا:\n' + ts.filter((t) => t.balance > 0).map((t) => '• ' + label(t) + ' — Rs. ' + numFmt(t.balance)).join('\n') : '',
              next_date: cv?.next_date ? fmtDate(cv.next_date) : '',
              next_time: cv?.next_date ? cv.next_time ?? '' : '',
              next_work: '',
            },
            tpl
          )
        : null
    const allRx = ts.flatMap((t) => (docs.get(t.id)?.rx ?? []).map((r) => ({ ...r, tid: t.id }))).sort((x, y) => y.date.localeCompare(x.date))
    const rxId = allRx[0]?.id ?? (cv ? rxBy.get(cv.id) ?? null : null)
    groups.push({
      key: k,
      visitId: cv?.id ?? null,
      title: k === 'old' ? 'Purana record' : date === today ? 'Aaj ki visit' : 'Visit ' + fmtDate(date),
      dateLabel: fmtDate(date),
      sortDate: date,
      summary: (cv?.notes ?? '').trim(),
      works: ts.map((t) => ({
        id: t.id,
        label: label(t),
        status: t.status,
        charged: t.charged,
        paid: t.paid,
        balance: t.balance,
        visits: [...t.visits]
          .sort((x, y) => (x.visit_no ?? 0) - (y.visit_no ?? 0) || x.visit_date.localeCompare(y.visit_date))
          .map((v, i) => ({ no: v.visit_no ?? i + 1, date: v.visit_date, procedure: v.procedure, notes: v.notes })),
        rxId: null,
        waHref:
          patient.phone && canMoney
            ? messageLink(
                'treatment_summary',
                pinfo,
                {
                  work: label(t),
                  done: (docs.get(t.id)?.doneStages ?? []).join('، '),
                  visits: String(t.visits.length),
                  charged: t.charged > 0 ? numFmt(t.charged) : '',
                  paid: t.charged > 0 ? numFmt(t.paid) : '',
                  balance: t.charged > 0 ? numFmt(Math.max(0, t.balance)) : '',
                  next_date: docs.get(t.id)?.next ? fmtDate(docs.get(t.id)!.next!.date) : '',
                  next_time: docs.get(t.id)?.next?.time ?? '',
                },
                tpl
              )
            : null,
      })),
      total,
      paid,
      balance,
      allDone: open.length === 0,
      open: false,
      invoiceHref: cv ? '/admin/visits/' + cv.id + '/invoice' : null,
      rxHref: rxId ? '/admin/prescriptions/' + rxId + '/print' + (allRx[0] ? '?t=' + allRx[0].tid : '') : null,
      bothHref: rxId ? '/admin/prescriptions/' + rxId + '/print?w=both' + (allRx[0] ? '&t=' + allRx[0].tid : '') : null,
      waHref,
      nextDate: cv?.next_date ?? null,
    })
  }
  groups.sort((a, b) => Number(a.allDone) - Number(b.allDone) || b.sortDate.localeCompare(a.sortDate))
  const firstOpen = groups.findIndex((g) => !g.allDone)
  if (firstOpen >= 0) groups[firstOpen].open = true
  else if (groups.length) groups[0].open = false
  return groups
}

/** Profile par: har ilaaj ka chhota card (click se us ilaaj ka apna page) + muaine ka card */
export async function TreatmentMiniCards({ patient, canMoney, canClinical, canRx }: { patient: { id: string; full_name: string; phone: string | null; gender?: string | null }; canMoney: boolean; canClinical: boolean; canRx: boolean }) {
  const patientId = patient.id
  const supabase = await createClient()
  const [treatments, docs, tplRes, cvRes] = await Promise.all([
    getTreatments(patientId),
    loadTreatmentDocs(patientId, canRx),
    supabase.from('message_templates').select('key, body'),
    canClinical ? supabase.from('clinical_visits').select('id', { count: 'exact', head: true }).eq('patient_id', patientId).eq('status', 'finished') : Promise.resolve({ count: 0 }),
  ])
  const visitCount = cvRes.count ?? 0
  const tpl = mapTemplates(tplRes.data as { key: string; body: string }[] | null)
  const groups = await loadVisitGroups(supabase, patient, treatments, docs, tpl, canMoney, canRx)
  const inGroup = new Set(groups.flatMap((g) => g.works.map((w) => w.id)))
  const planned = treatments.filter((t) => !inGroup.has(t.id) && t.status !== 'cancelled')
  if (groups.length === 0 && planned.length === 0 && visitCount === 0) return null
  return (
    <section className="rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5" data-testid="mini-cards">
      <h2 className="font-display text-lg font-semibold text-clinic-ink">Ilaaj</h2>
      <p className="mb-3 text-xs text-clinic-ink/55">Har visit ka ek card. Kholein: us ke kaam, paise, agli visit, invoice aur WhatsApp.</p>
      {groups.map((g) => (
        <VisitGroupCard key={g.key} g={g} patientId={patientId} canMoney={canMoney} canClinical={canClinical} />
      ))}
      {planned.length > 0 && (
        <div className="mb-3" data-testid="plan-list">
          <h3 className="mb-1 text-sm font-semibold text-clinic-ink">Aage ka plan</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {planned.map((t) => (
              <Link key={t.id} href={'/admin/patients/' + patientId + '/treatment/' + t.id} data-testid="mini-card" className="flex min-h-[48px] flex-col justify-center rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 hover:bg-amber-50">
                <span className="font-semibold text-clinic-ink">
                  {t.name}
                  {t.teeth.length > 0 && <span className="ml-1 text-xs font-normal text-clinic-ink/60">({t.teeth.join(', ')})</span>}
                </span>
                <span className="text-xs text-clinic-ink/60">
                  {t.status === 'active' ? 'chal rahi' : 'sirf plan'}
                  {canMoney && t.price > 0 ? ' · Rs. ' + numFmt(t.price) : ''}
                  <span className="ml-1 text-clinic-teal"> · kholein →</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {canClinical && visitCount > 0 && (
        <Link href={'/admin/patients/' + patientId + '/checkups'} data-testid="checkup-card" className="flex min-h-[64px] flex-col justify-center rounded-xl border border-clinic-teal/15 bg-clinic-mint/20 px-3 py-2 hover:border-clinic-teal/40">
          <span className="font-semibold text-clinic-ink">Checkup aur muaina</span>
          <span className="mt-0.5 text-xs text-clinic-ink/60">
            {visitCount} visit{visitCount === 1 ? '' : 's'}: takleef, tashkhees, dawa
            <span className="ml-1 text-clinic-teal"> · kholein →</span>
          </span>
        </Link>
      )}
    </section>
  )
}

export interface TreatmentDocs {
  rx: { id: string; date: string }[]
  next: { date: string; time: string | null } | null
  doneStages: string[]
}

/** Har ilaaj ke kaghzat: us ki prescriptions (nayi pehle), agli appointment, ho chuke qadam */
export async function loadTreatmentDocs(patientId: string, canRx: boolean): Promise<Map<string, TreatmentDocs>> {
  const supabase = await createClient()
  const today = todayKarachi()
  const [vn, rxRes, apRes, stRes] = await Promise.all([
    supabase.from('visit_notes').select('treatment_id, clinical_visit_id').eq('patient_id', patientId).is('voided_at', null).not('clinical_visit_id', 'is', null),
    canRx ? supabase.from('prescriptions').select('id, clinical_visit_id, prescribed_date, created_at').eq('patient_id', patientId).not('clinical_visit_id', 'is', null).order('prescribed_date', { ascending: false }).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from('appointments').select('treatment_id, preferred_date, preferred_time, status').eq('patient_id', patientId).in('status', ['pending', 'confirmed']).gte('preferred_date', today).not('treatment_id', 'is', null).order('preferred_date'),
    supabase.from('treatment_stages').select('treatment_id, label, done_on, sort_order').eq('patient_id', patientId).not('done_on', 'is', null).order('sort_order'),
  ])
  const out = new Map<string, TreatmentDocs>()
  const get = (tid: string) => {
    let d = out.get(tid)
    if (!d) {
      d = { rx: [], next: null, doneStages: [] }
      out.set(tid, d)
    }
    return d
  }
  const byVisit = new Map<string, string[]>()
  for (const n of (vn.data ?? []) as { treatment_id: string | null; clinical_visit_id: string }[]) {
    if (n.treatment_id) byVisit.set(n.clinical_visit_id, [...(byVisit.get(n.clinical_visit_id) ?? []), n.treatment_id])
  }
  for (const r of (rxRes.data ?? []) as { id: string; clinical_visit_id: string; prescribed_date: string }[]) {
    for (const tid of byVisit.get(r.clinical_visit_id) ?? []) get(tid).rx.push({ id: r.id, date: r.prescribed_date })
  }
  for (const a of (apRes.data ?? []) as { treatment_id: string; preferred_date: string; preferred_time: string | null }[]) {
    const d = get(a.treatment_id)
    if (!d.next) d.next = { date: a.preferred_date, time: a.preferred_time }
  }
  if (!('error' in stRes && stRes.error)) {
    for (const s of (stRes.data ?? []) as { treatment_id: string; label: string }[]) get(s.treatment_id).doneStages.push(s.label)
  }
  return out
}

/** Ilaaj ke card par (click kiye baghair) aur ilaaj ke page ke upar: Invoice | Prescription | WhatsApp */
export function TreatmentDocButtons({
  patient,
  t,
  docs,
  canMoney,
  tpl,
}: {
  patient: { id: string; full_name: string; phone: string | null; gender?: string | null }
  t: TItem
  docs: TreatmentDocs | undefined
  canMoney: boolean
  tpl: Record<string, string>
}) {
  const rx = docs?.rx ?? []
  const btn = 'inline-flex min-h-[40px] items-center rounded-full px-4 py-1.5 text-xs font-semibold'
  const wa = patient.phone
    ? messageLink(
        'treatment_summary',
        { full_name: patient.full_name, phone: patient.phone, gender: patient.gender ?? null },
        {
          work: t.name + (t.teeth.length ? ' (' + t.teeth.join(', ') + ')' : ''),
          done: (docs?.doneStages ?? []).join('، '),
          visits: t.visits.length ? String(t.visits.length) : '',
          charged: canMoney && t.charged > 0 ? numFmt(t.charged) : '',
          paid: canMoney && t.charged > 0 ? numFmt(t.paid) : '',
          balance: canMoney && t.charged > 0 ? numFmt(Math.max(0, t.balance)) : '',
          next_date: docs?.next ? fmtDate(docs.next.date) : '',
          next_time: docs?.next?.time ?? '',
        },
        tpl,
      )
    : null
  if (!canMoney && rx.length === 0 && !wa) return null
  return (
    <div className="flex flex-wrap gap-2" data-testid="doc-buttons">
      {canMoney && (
        <Link href={'/admin/patients/' + patient.id + '/treatment/' + t.id + '/invoice'} data-testid="card-invoice" className={btn + ' bg-clinic-teal text-white'}>
          Invoice
        </Link>
      )}
      {rx.length > 0 && (
        <Link href={'/admin/prescriptions/' + rx[0].id + '/print?t=' + t.id} data-testid="card-rx" className={btn + ' bg-clinic-teal text-white'}>
          Prescription{rx.length > 1 ? ' (' + rx.length + ')' : ''}
        </Link>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" data-testid="card-wa" className={btn + ' bg-whatsapp text-white'}>
          WhatsApp
        </a>
      )}
    </div>
  )
}

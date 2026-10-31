import Link from 'next/link'
import { Suspense, cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffProfile, isOwnerRole, getPermissions } from '@/lib/auth'
import PatientEditModal from '@/components/admin/PatientEditModal'
import PatientProfilePhoto from '@/components/admin/PatientProfilePhoto'
import PortalLinkButton from '@/components/admin/PortalLinkButton'
import DeletePatientButton from '@/components/admin/DeletePatientButton'
import VisitWorkspace, { type VisitRow, type MedOpt, type TodayBill } from '@/components/admin/visit/VisitWorkspace'
import type { CatalogOpt, MaterialOpt, TItem, TVisit } from '@/components/admin/TreatmentsPanel'
import VisitNotes, { type VisitNote } from '@/components/admin/VisitNotes'
import LabCaseForm, { type LabOption } from '@/components/admin/LabCaseForm'
import PatientAppointments, { type PAppt } from '@/components/admin/PatientAppointments'
import PatientRecalls, { type PatientRecall } from '@/components/admin/PatientRecalls'
import PatientPhotoGallery, { type PatientPhoto } from '@/components/admin/PatientPhotoGallery'
import TreatmentList, { type TreatmentRow } from '@/components/admin/TreatmentList'
import MediaStrip, { type MediaItem } from '@/components/admin/MediaStrip'
import TreatmentPlanCard, { type Installment, type Plan } from '@/components/admin/TreatmentPlanCard'
import LedgerTimeline from '@/components/admin/LedgerTimeline'
import { HISTORY_STEPS } from '@/lib/history-steps'
import { todayKarachi, money, fmtDate } from '@/lib/karachi'
import { toBalance, type LedgerRow, type PatientBalance } from '@/lib/ledger'
import { toothLabel } from '@/lib/teeth'
import WhatsAppMenu from '@/components/admin/WhatsAppMenu'
import { apptReminderLink, generalLink, paymentReminderLink } from '@/lib/messages'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; treatment?: string }>
}

type Sb = Awaited<ReturnType<typeof createClient>>

const num = (v: unknown) => Number(v ?? 0)

/** Medical history se khatre wali baatein (allergy, blood thinner, sugar ...) header par dikhane ke liye */
function medicalAlerts(mh: Record<string, unknown> | null | undefined): string[] {
  if (!mh) return []
  const out: string[] = []
  const conds = Array.isArray(mh.conditions) ? (mh.conditions as string[]).filter((c) => c && c !== 'None') : []
  out.push(...conds)
  if (typeof mh.allergies === 'string' && mh.allergies.trim()) out.push(`Allergy: ${mh.allergies.trim()}`)
  if (mh.blood_thinners === 'Yes') out.push('Blood thinner')
  if (mh.pregnant === 'Yes') out.push('Pregnant / feeding')
  return out
}

async function loadTreatments(supabase: Sb, patientId: string): Promise<TItem[]> {
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

const getTreatments = cache(async (patientId: string) => loadTreatments(await createClient(), patientId))

/** Chhota khana (collapsible) Previous History ke andar */
function Fold({ id, title, count, children, open }: { id?: string; title: string; count?: number | string; children: React.ReactNode; open?: boolean }) {
  return (
    <details id={id} open={open} className="scroll-mt-20 group rounded-xl border border-clinic-teal/10 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-clinic-ink">
        <span>
          {title}
          {count !== undefined && <span className="ml-2 rounded-full bg-clinic-mint px-2 py-0.5 text-xs text-clinic-teal">{count}</span>}
        </span>
        <span className="text-clinic-ink/40 transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-clinic-teal/10 p-3 sm:p-4">{children}</div>
    </details>
  )
}

function SectionHead({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="mb-3 font-display text-lg font-semibold text-clinic-ink">
      <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-clinic-teal text-sm text-white">{n}</span>
      {title}
    </h2>
  )
}

const Loading = ({ h = 'h-24' }: { h?: string }) => <div className={`${h} animate-pulse rounded-2xl bg-white/70`} />

export default async function PatientDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const [staff, perms, patientRes] = await Promise.all([getStaffProfile(), getPermissions(), supabase.from('patients').select('*').eq('id', id).maybeSingle()])
  const patient = patientRes.data
  if (!patient || patient.deleted_at) notFound()
  const isOwner = isOwnerRole(staff.role)
  const can = (p: string) => perms.includes(p)
  const canClinical = can('clinical.view')
  const canMoney = isOwner || can('billing.view')

  const today = todayKarachi()
  const digits = String(patient.phone ?? '').replace(/[^0-9]/g, '')

  const [balRes, apptRes, histRes] = await Promise.all([
    canMoney ? supabase.from('patient_balances').select('*').eq('patient_id', id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    can('appointments.view')
      ? supabase
          .from('appointments')
          .select('id, preferred_date, preferred_time, treatment_name, status, notes, patient_id, phone, doctor')
          .is('deleted_at', null)
          .or(digits.length >= 7 ? `patient_id.eq.${id},phone.ilike.*${digits.slice(-7)}*` : `patient_id.eq.${id}`)
          .order('preferred_date', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
    canClinical ? supabase.from('patient_history').select('*').eq('patient_id', id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])
  const balance: PatientBalance | null = balRes.data ? toBalance(balRes.data as Record<string, string | number | null>) : null
  // Appointment purane data mein phone se judi hoti thi; dusre patient ki na aaye is liye phone wali sirf tab jab patient_id khali ho
  const appts = ((apptRes.data ?? []) as (PAppt & { patient_id: string | null; phone: string })[]).filter(
    (a) => a.patient_id === id || (!a.patient_id && String(a.phone).replace(/[^0-9]/g, '') === digits)
  )
  const nextAppt = [...appts]
    .filter((a) => (a.preferred_date ?? '') >= today && a.status !== 'cancelled' && a.status !== 'completed')
    .sort((a, b) => (a.preferred_date ?? '').localeCompare(b.preferred_date ?? ''))[0]
  const history = histRes.data as Record<string, unknown> | null
  const alerts = medicalAlerts(history?.medical_history as Record<string, unknown> | undefined)

  const dob = patient.date_of_birth ? fmtDate(patient.date_of_birth) : null
  const wa = digits ? `https://wa.me/92${digits.replace(/^0/, '').replace(/^92/, '')}` : null
  const isDental = patient.department === 'dental'

  return (
    <div className="grid min-w-0 gap-4">
      <Link href="/admin/patients" className="text-sm text-clinic-ink/50 transition-colors hover:text-clinic-teal">
        ← Patients
      </Link>

      {/* ================= 1. PATIENT DETAILS ================= */}
      <section id="s1" className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <PatientProfilePhoto patientId={patient.id} hasPhoto={Boolean(patient.profile_photo_path)} />
            <div>
              <h1 className="font-display text-xl font-semibold capitalize text-clinic-ink">{patient.full_name}</h1>
              <p className="text-sm text-clinic-ink/60">
                <span className="font-semibold text-clinic-teal">{patient.mr_number}</span>
                <span className="ml-2 rounded-full bg-clinic-mint px-2 py-0.5 text-[11px] capitalize text-clinic-teal">{patient.department}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {can('patients.edit') && (
              <PatientEditModal
                patient={{
                  id: patient.id,
                  full_name: patient.full_name,
                  phone: patient.phone,
                  department: patient.department,
                  age: patient.age,
                  gender: patient.gender,
                  date_of_birth: patient.date_of_birth ?? null,
                  address: patient.address,
                  notes: patient.notes,
                }}
              />
            )}
            <a href={`tel:${patient.phone.replace(/[^0-9+]/g, '')}`} className="rounded-full border border-clinic-teal/30 px-4 py-2 text-sm font-semibold text-clinic-ink/80">
              Call
            </a>
            {wa && (
              <WhatsAppMenu
                size="md"
                items={[
                  { label: 'Seedha chat kholein', href: wa },
                  ...(nextAppt ? [{ label: 'Appointment reminder', href: apptReminderLink({ ...nextAppt, patient_name: patient.full_name, phone: patient.phone }) }] : []),
                  ...(canMoney && balance && balance.balance > 0
                    ? [{ label: 'Payment reminder (baqaya)', href: paymentReminderLink({ full_name: patient.full_name, phone: patient.phone, balance: balance.balance }) }]
                    : []),
                  { label: 'Aam message', href: generalLink({ full_name: patient.full_name, phone: patient.phone }) },
                ]}
              />
            )}
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
          {[
            ['Umar', patient.age ? `${patient.age} saal` : dob ? '' : '—'],
            ['Paidaish', dob ?? '—'],
            ['Jins', patient.gender ?? '—'],
            ['Phone', patient.phone],
            ['Register', patient.created_at ? fmtDate(String(patient.created_at).slice(0, 10)) : '—'],
            ['Agli appointment', nextAppt ? `${fmtDate(nextAppt.preferred_date)}${nextAppt.preferred_time ? ' ' + nextAppt.preferred_time : ''}` : '—'],
            ...(canMoney && balance ? [['Baqaya', money(balance.balance)]] : []),
            ['Pata', patient.address || '—'],
          ]
            .filter(([, v]) => v !== '')
            .map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[11px] text-clinic-ink/50">{k}</dt>
                <dd className={`truncate font-medium ${k === 'Baqaya' && balance && balance.balance > 0 ? 'text-red-600' : 'text-clinic-ink'}`}>{v}</dd>
              </div>
            ))}
        </dl>

        {(alerts.length > 0 || patient.notes) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {alerts.map((a) => (
              <span key={a} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                ⚠ {a}
              </span>
            ))}
            {patient.notes && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-900">{patient.notes}</span>}
          </div>
        )}
      </section>

      {!canClinical && !canMoney && !can('appointments.view') && (
        <p className="text-sm text-clinic-ink/60">Aap ko is patient ka record dekhne ki permission nahi.</p>
      )}

      {/* ================= 2. PREVIOUS HISTORY ================= */}
      {(canClinical || canMoney || can('appointments.view')) && (
        <section id="s2" className="rounded-2xl border border-clinic-teal/10 bg-clinic-sand/40 p-4 sm:p-5">
          <SectionHead n={2} title="Previous History (pichla record)" />
          <Suspense fallback={<Loading />}>
            <PreviousHistory
              patient={patient}
              history={history}
              perms={perms}
              isOwner={isOwner}
              appts={appts}
              balance={balance}
              openLab={sp.treatment}
            />
          </Suspense>
        </section>
      )}

      {/* ================= 3 - 10. AAJ KA VISIT ================= */}
      {(canClinical || canMoney) && (
        <Suspense fallback={<Loading h="h-64" />}>
          <WorkspaceSection patient={patient} perms={perms} isOwner={isOwner} balance={balance?.balance ?? 0} isDental={isDental} />
        </Suspense>
      )}

      {/* ================= 11. DOCUMENTS ================= */}
      {canClinical && (
        <section id="s11" className="rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
          <SectionHead n={11} title="Documents / X-rays / Photos" />
          <Suspense fallback={<Loading />}>
            <DocsTab supabase={supabase} patientId={id} canDelete={isOwner} />
          </Suspense>
        </section>
      )}

      {/* Kam istemal hone wali cheezein: neeche */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-clinic-teal/10 pt-4">
        <PortalLinkButton patientId={patient.id} patientName={patient.full_name} patientPhone={patient.phone} portalCode={patient.portal_code ?? null} />
        {isOwner && <DeletePatientButton patientId={patient.id} patientName={patient.full_name} mrNumber={patient.mr_number} />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ */
async function PreviousHistory({
  patient,
  history,
  perms,
  isOwner,
  appts,
  balance,
  openLab,
}: {
  patient: PatientRow
  history: Record<string, unknown> | null
  perms: string[]
  isOwner: boolean
  appts: PAppt[]
  balance: PatientBalance | null
  openLab?: string
}) {
  const supabase = await createClient()
  const can = (p: string) => perms.includes(p)
  const canClinical = can('clinical.view')
  const canMoney = isOwner || can('billing.view')
  const isDental = patient.department === 'dental'
  const today = todayKarachi()

  const [cvRes, vnRes, rxRes, labRes, treatments] = await Promise.all([
    canClinical
      ? supabase
          .from('clinical_visits')
          .select('id, visit_date, complaint, diagnoses, findings, doctor')
          .eq('patient_id', patient.id)
          .eq('status', 'finished')
          .order('visit_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
    canClinical ? supabase.from('visit_notes').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id).is('voided_at', null) : Promise.resolve({ count: 0 }),
    can('prescriptions.view') ? supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id) : Promise.resolve({ count: 0 }),
    can('lab.view') && isDental ? supabase.from('lab_cases').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id).is('deleted_at', null) : Promise.resolve({ count: 0 }),
    canClinical || canMoney ? getTreatments(patient.id) : Promise.resolve([] as TItem[]),
  ])
  type CV = { id: string; visit_date: string; complaint: { items?: string[]; other?: string; duration?: string }; diagnoses: { text: string; teeth?: string[] }[]; doctor: string | null }
  const visits = ((cvRes.data ?? []) as CV[])
  const nNotes = ('count' in vnRes ? vnRes.count : 0) ?? 0
  const nRx = ('count' in rxRes ? rxRes.count : 0) ?? 0
  const nLab = ('count' in labRes ? labRes.count : 0) ?? 0
  const done = treatments.filter((t) => t.status === 'completed')
  const isNew = !history && visits.length === 0 && nNotes === 0 && nRx === 0 && nLab === 0 && treatments.length === 0 && (!balance || balance.total_charges === 0)

  return (
    <div className="grid gap-2">
      {isNew && <p className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-clinic-ink/60">No Previous History — naya patient.</p>}

      {canClinical && (
        <Fold title="Medical / Dental history" count={history ? (history.is_finalized ? 'mukammal' : 'adhoori') : 'nahi bhari'} open={!history}>
          <HistoryTab patientId={patient.id} history={history} />
        </Fold>
      )}

      {canClinical && visits.length > 0 && (
        <Fold title="Pichle visits (takleef aur diagnosis)" count={visits.length} open>
          <ul className="divide-y divide-clinic-teal/10 text-sm">
            {visits.slice(0, 15).map((v) => (
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
                  {(v.diagnoses ?? []).length > 0 && (
                    <p className="text-xs text-clinic-teal">
                      Dx: {(v.diagnoses ?? []).map((d) => d.text + (d.teeth?.length ? ` (${d.teeth.join(', ')})` : '')).join(' · ')}
                    </p>
                  )}
                </div>
                <Link href={`/admin/visits/${v.id}/print`} target="_blank" className="text-xs font-semibold text-clinic-teal hover:underline">
                  Record / PDF
                </Link>
              </li>
            ))}
          </ul>
        </Fold>
      )}

      {done.length > 0 && (
        <Fold title="Mukammal treatments" count={done.length}>
          <ul className="text-sm">
            {done.map((t) => (
              <li key={t.id} className="flex justify-between py-1">
                <span>
                  {t.name} {t.teeth.length > 0 && <span className="text-xs text-clinic-teal">{t.teeth.map(toothLabel).join(', ')}</span>}
                </span>
                <span className="text-xs text-clinic-ink/50">{fmtDate(t.completed_on ?? t.started_on)}</span>
              </li>
            ))}
          </ul>
        </Fold>
      )}

      {canClinical && nNotes > 0 && (
        <Fold title="Treatment visits ka record" count={nNotes}>
          <VisitsTab supabase={supabase} patientId={patient.id} canEdit={can('clinical.edit')} />
        </Fold>
      )}

      {can('prescriptions.view') && nRx > 0 && (
        <Fold title="Purani prescriptions" count={nRx}>
          <RxTab supabase={supabase} patient={patient} />
        </Fold>
      )}

      {can('lab.view') && isDental && (
        <Fold id="lab" title="Lab cases" count={nLab} open={Boolean(openLab)}>
          <LabTab supabase={supabase} patient={patient} canManage={can('lab.manage')} openFor={openLab} />
        </Fold>
      )}

      {can('appointments.view') && (
        <Fold title="Appointments" count={appts.length}>
          <AppointmentsTab supabase={supabase} patient={patient} appts={appts} canManage={can('appointments.manage')} canClinical={canClinical} />
        </Fold>
      )}

      {canMoney && balance && (balance.total_charges > 0 || balance.total_paid > 0) && (
        <Fold title="Bills aur payments (poora hisaab)" count={balance.balance > 0 ? `baqaya ${money(balance.balance)}` : 'saaf'}>
          <BillingTab supabase={supabase} patient={patient} balance={balance} isOwner={isOwner} />
        </Fold>
      )}
    </div>
  )
}
/* ============================================================ */
type PatientRow = {
  id: string
  full_name: string
  phone: string
  department: string
  mr_number: string | null
  primary_doctor?: string | null
  portal_code?: string | null
}

async function WorkspaceSection({
  patient,
  perms,
  isOwner,
  balance,
  isDental,
}: {
  patient: PatientRow
  perms: string[]
  isOwner: boolean
  balance: number
  isDental: boolean
}) {
  const supabase = await createClient()
  const can = (p: string) => perms.includes(p)
  const today = todayKarachi()
  const canMoney = isOwner || can('billing.view')
  const [treatments, chartRes, catRes, docRes, matRes, cvRes, medRes, billRes] = await Promise.all([
    getTreatments(patient.id),
    isDental && can('clinical.view')
      ? supabase
          .from('dental_chart')
          .select('id, tooth_number, condition, notes, treatment_date, created_at, surfaces, state')
          .eq('patient_id', patient.id)
          .order('treatment_date', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('treatment_catalog').select('id, name, price, category, department').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('treating_doctors').select('name').eq('is_active', true).order('name'),
    can('clinical.edit') ? supabase.from('treatment_materials').select('treatment_id, inventory_id, default_qty, inventory(item_name, unit)') : Promise.resolve({ data: [] }),
    can('clinical.view')
      ? supabase
          .from('clinical_visits')
          .select('id, status, visit_date, complaint, findings, diagnoses, notes, doctor, next_date, next_time, next_treatment_id, invoice_id, appointment_id, prescriptions(id)')
          .eq('patient_id', patient.id)
          .eq('visit_date', today)
          .order('created_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
    can('prescriptions.write')
      ? supabase
          .from('medicines')
          .select('id, category, name, strength, potency, dosage_form, default_dose, default_frequency, default_duration, instructions, price, available, stock_qty')
          .eq('is_active', true)
          .order('name')
      : Promise.resolve({ data: [] }),
    canMoney
      ? supabase
          .from('invoices')
          .select('id, invoice_number, total, paid_amount, invoice_items(name)')
          .eq('patient_id', patient.id)
          .eq('invoice_date', today)
          .neq('status', 'void')
          .order('created_at')
      : Promise.resolve({ data: [] }),
  ])
  const materials: Record<string, MaterialOpt[]> = {}
  for (const m of (matRes.data ?? []) as unknown as { treatment_id: string; inventory_id: string; default_qty: number; inventory: { item_name: string; unit: string | null } | null }[]) {
    ;(materials[m.treatment_id] ??= []).push({ inventory_id: m.inventory_id, name: m.inventory?.item_name ?? '', unit: m.inventory?.unit ?? null, default_qty: num(m.default_qty) })
  }
  const catalog: CatalogOpt[] = (catRes.data ?? []).map((c) => ({ ...c, price: num(c.price) })) as CatalogOpt[]
  const visitsToday = (cvRes.data ?? []) as VisitRow[]
  const draft = visitsToday.find((v) => v.status === 'draft') ?? null
  const fin = visitsToday.find((v) => v.status === 'finished') ?? null
  const finRx = fin ? ((fin as unknown as { prescriptions?: { id: string }[] }).prescriptions ?? [])[0] : undefined
  const finishedToday = fin ? { id: fin.id, invoice_id: fin.invoice_id, prescription_id: finRx?.id ?? null } : null
  const todayBills: TodayBill[] = ((billRes.data ?? []) as unknown as { id: string; invoice_number: string; total: number; paid_amount: number; invoice_items: { name: string }[] | null }[]).map((b) => ({
    id: b.id,
    invoice_number: b.invoice_number,
    total: num(b.total),
    paid_amount: num(b.paid_amount),
    items: (b.invoice_items ?? []).map((i) => i.name).join(', '),
  }))

  return (
    <VisitWorkspace
      key={draft?.id ?? 'none'}
      patient={{ id: patient.id, full_name: patient.full_name, phone: patient.phone, department: patient.department }}
      visit={draft}
      finishedToday={finishedToday}
      chartRecords={(chartRes.data ?? []) as never[]}
      treatments={treatments}
      catalog={catalog}
      materials={materials}
      doctors={(docRes.data ?? []).map((d) => d.name as string)}
      defaultDoctor={patient.primary_doctor ?? null}
      medicines={((medRes.data ?? []) as MedOpt[]).map((m) => ({ ...m, price: num(m.price), stock_qty: m.stock_qty == null ? null : num(m.stock_qty) }))}
      todayBills={todayBills}
      balance={balance}
      perms={{
        clinicalView: can('clinical.view'),
        clinicalEdit: can('clinical.edit'),
        bill: isOwner || can('billing.create'),
        collect: isOwner || can('billing.collect'),
        money: canMoney,
        owner: isOwner,
        rx: can('prescriptions.write'),
        lab: can('lab.manage'),
      }}
    />
  )
}

async function VisitsTab({ supabase, patientId, canEdit }: { supabase: Sb; patientId: string; canEdit: boolean }) {
  const [{ data: visits }, { data: trs }] = await Promise.all([
    supabase
      .from('visit_notes')
      .select('id, visit_date, procedure, notes, next_visit, voided_at, void_reason, visit_no, treatment_id')
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('patient_treatments').select('id, name').eq('patient_id', patientId),
  ])
  const names = new Map((trs ?? []).map((t) => [t.id as string, t.name as string]))
  const rows: VisitNote[] = (visits ?? []).map((v) => ({ ...v, treatment_name: v.treatment_id ? names.get(v.treatment_id) ?? null : null }))
  return <VisitNotes patientId={patientId} notes={rows} canCancel={canEdit} />
}

function HistoryTab({ patientId, history }: { patientId: string; history: Record<string, unknown> | null }) {
  const show = (v: unknown) => (Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : v == null ? '' : String(v))
  return (
    <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Clinical History</h2>
        <Link href={`/admin/patients/${patientId}/history`} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
          {history ? (history.is_finalized ? 'History kholein / print' : 'History mukammal karein') : 'History shuru karein'}
        </Link>
      </div>
      {!history ? (
        <p className="mt-3 text-sm text-clinic-ink/50">Abhi history nahi bhari gayi.</p>
      ) : (
        <div className="mt-3 grid gap-4">
          {HISTORY_STEPS.map((step) => {
            const data = (history[step.column] ?? {}) as Record<string, unknown>
            const filled = step.fields.filter((f) => show(data[f.key]).trim() !== '')
            if (filled.length === 0) return null
            return (
              <div key={step.column}>
                <p className="text-xs font-semibold uppercase tracking-wide text-clinic-teal">{step.title}</p>
                <dl className="mt-1 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                  {filled.map((f) => (
                    <div key={f.key} className="flex gap-2">
                      <dt className="shrink-0 text-clinic-ink/50">{f.label}:</dt>
                      <dd className="text-clinic-ink">{show(data[f.key])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

async function RxTab({ supabase, patient }: { supabase: Sb; patient: PatientRow }) {
  const [{ data: rx }, { data: trs }] = await Promise.all([
    supabase.from('prescriptions').select('id, department, items, notes_en, prescribed_date, treatment_id').eq('patient_id', patient.id).order('prescribed_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('patient_treatments').select('id, name').eq('patient_id', patient.id),
  ])
  const names = new Map((trs ?? []).map((t) => [t.id as string, t.name as string]))
  return (
    <div className="grid gap-6">
      <div>
        <div className="divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
          {(rx ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-clinic-ink/50">Koi prescription nahi.</p>
          ) : (
            (rx ?? []).map((r) => {
              const items = (r.items ?? []) as { name_en?: string; name_ur?: string }[]
              return (
                <div key={r.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="text-xs text-clinic-ink/50">
                      {fmtDate(r.prescribed_date)}
                      {r.treatment_id && names.get(r.treatment_id) ? ` · ${names.get(r.treatment_id)}` : ''}
                    </p>
                    <p className="mt-0.5 text-sm text-clinic-ink">{items.map((it) => it.name_en || it.name_ur).filter(Boolean).join(' · ')}</p>
                    {r.notes_en && <p className="text-xs text-clinic-ink/50">{r.notes_en}</p>}
                  </div>
                  <Link href={`/admin/prescriptions/${r.id}/print`} className="text-xs font-semibold text-clinic-teal hover:underline">
                    Print
                  </Link>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

async function LabTab({ supabase, patient, canManage, openFor }: { supabase: Sb; patient: PatientRow; canManage: boolean; openFor?: string }) {
  const [{ data: cases }, { data: labs }, { data: trs }, { data: labFiles }] = await Promise.all([
    supabase
      .from('lab_cases')
      .select('id, case_number, lab_name, work_type, tooth_numbers, status, due_date, delivered_date, created_at')
      .eq('patient_id', patient.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('labs').select('id, name, whatsapp').order('name'),
    supabase.from('patient_treatments').select('id, name, teeth').eq('patient_id', patient.id).eq('status', 'active'),
    supabase.from('patient_photos').select('id, storage_path, caption, category, lab_case_id').eq('patient_id', patient.id).not('lab_case_id', 'is', null),
  ])
  const filesOf = (caseId: string) => (labFiles ?? []).filter((f) => f.lab_case_id === caseId) as MediaItem[]
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Lab cases</h2>
        {canManage && (
          <LabCaseForm
            labs={(labs ?? []) as LabOption[]}
            patients={[]}
            fixedPatient={{ id: patient.id, full_name: patient.full_name, mr_number: patient.mr_number }}
            treatments={(trs ?? []).map((t) => ({ id: t.id as string, name: t.name as string, teeth: (t.teeth ?? []) as string[] }))}
            defaultTreatmentId={openFor}
          />
        )}
      </div>
      <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
        {(cases ?? []).length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-clinic-ink/50">Koi lab case nahi.</p>
        ) : (
          (cases ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
              <div>
              <Link href={`/admin/lab/${c.id}`} className="block hover:text-clinic-teal">
                <p className="text-sm font-medium text-clinic-ink">
                  {c.work_type ?? 'Lab work'} {((c.tooth_numbers ?? []) as string[]).length > 0 && <span className="text-clinic-teal">{((c.tooth_numbers ?? []) as string[]).map(toothLabel).join(', ')}</span>}
                </p>
                <p className="text-xs text-clinic-ink/50">
                  {c.case_number} · {c.lab_name} · {c.due_date ? `wapsi ${fmtDate(c.due_date)}` : 'tareekh nahi'}
                </p>
              </Link>
              <MediaStrip items={filesOf(c.id)} size={48} />
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${filesOf(c.id).length ? 'bg-emerald-50 text-emerald-700' : 'bg-clinic-mint text-clinic-ink/60'}`}>
                {filesOf(c.id).length ? 'Report aa gayi' : 'Report abhi nahi'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

async function AppointmentsTab({
  supabase,
  patient,
  appts,
  canManage,
  canClinical,
}: {
  supabase: Sb
  patient: PatientRow
  appts: PAppt[]
  canManage: boolean
  canClinical: boolean
}) {
  const [{ data: trs }, recallRes] = await Promise.all([
    canClinical ? supabase.from('patient_treatments').select('id, name').eq('patient_id', patient.id).eq('status', 'active') : Promise.resolve({ data: [] }),
    canClinical
      ? supabase.from('recalls').select('id, recall_type, interval_months, last_done, next_due, status').eq('patient_id', patient.id).order('next_due', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])
  return (
    <div className="grid gap-8">
      <PatientAppointments
        patient={{ id: patient.id, full_name: patient.full_name, phone: patient.phone, department: patient.department }}
        appointments={appts}
        treatments={(trs ?? []) as { id: string; name: string }[]}
        canManage={canManage}
      />
      {canClinical && <PatientRecalls patientId={patient.id} recalls={(recallRes.data ?? []) as PatientRecall[]} />}
    </div>
  )
}

async function BillingTab({ supabase, patient, balance, isOwner }: { supabase: Sb; patient: PatientRow; balance: PatientBalance | null; isOwner: boolean }) {
  const [treatments, invRes, plansRes, ledRes] = await Promise.all([
    getTreatments(patient.id),
    supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, total, paid_amount, balance, status, patient_treatment_id')
      .eq('patient_id', patient.id)
      .order('invoice_date', { ascending: false })
      .order('invoice_number', { ascending: false }),
    supabase
      .from('treatment_plans')
      .select('id, title, total_cost, advance_paid, duration_months, monthly_amount, start_date, status, doctor_id')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false }),
    supabase.from('patient_ledger').select('entry_date, sort_at, source, kind, label, charge, payment').eq('patient_id', patient.id),
  ])
  const invoices = (invRes.data ?? []).map((i) => ({ ...i, total: num(i.total), paid_amount: num(i.paid_amount), balance: num(i.balance) }))
  const oldInvoices = invoices.filter((i) => !i.patient_treatment_id)
  const items: Record<string, { name: string; tooth: string | null }[]> = {}
  if (oldInvoices.length) {
    const { data } = await supabase.from('invoice_items').select('invoice_id, name, tooth').in('invoice_id', oldInvoices.map((i) => i.id))
    for (const it of data ?? []) (items[it.invoice_id as string] ??= []).push({ name: it.name as string, tooth: it.tooth as string | null })
  }
  const plans = (plansRes.data ?? []) as Plan[]
  let installments: (Installment & { plan_id: string })[] = []
  if (plans.length) {
    const { data } = await supabase
      .from('installments')
      .select('id, plan_id, installment_no, due_date, amount, paid_amount, paid_date, payment_method')
      .in('plan_id', plans.map((p) => p.id))
      .order('installment_no')
    installments = (data ?? []) as (Installment & { plan_id: string })[]
  }
  const billed = treatments.filter((t) => t.charged > 0 || t.paid > 0)
  const invByTreatment = new Map<string, typeof invoices>()
  for (const i of invoices) if (i.patient_treatment_id) (invByTreatment.get(i.patient_treatment_id) ?? invByTreatment.set(i.patient_treatment_id, []).get(i.patient_treatment_id)!).push(i)

  return (
    <div className="grid gap-8">
      {/* Har treatment ka hisaab */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Treatment ke hisaab se</h2>
          <Link href={`/admin/patients/${patient.id}/invoice`} className="rounded-full border border-clinic-teal px-4 py-1.5 text-xs font-semibold text-clinic-teal">
            Poora statement (print / PDF)
          </Link>
        </div>
        <p className="text-sm text-clinic-ink/60">Payment lene ke liye upar Treatments (7) mein treatment par &quot;Payment lo&quot; dabayein.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-clinic-mint text-left text-xs text-clinic-ink/60">
              <tr>
                <th className="px-4 py-2">Treatment</th>
                <th className="px-4 py-2">Bill</th>
                <th className="px-4 py-2 text-right">Kul</th>
                <th className="px-4 py-2 text-right">Mile</th>
                <th className="px-4 py-2 text-right">Baqaya</th>
              </tr>
            </thead>
            <tbody>
              {billed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-5 text-center text-clinic-ink/50">
                    Nayi treatments ka koi bill nahi.
                  </td>
                </tr>
              ) : (
                billed.map((t) => (
                  <tr key={t.id} className={`border-t border-clinic-teal/10 ${t.status === 'cancelled' ? 'text-clinic-ink/40 line-through' : ''}`}>
                    <td className="px-4 py-2">
                      {t.name} {t.teeth.length > 0 && <span className="text-xs text-clinic-teal">{t.teeth.map(toothLabel).join(', ')}</span>}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {(invByTreatment.get(t.id) ?? []).map((i) => (
                        <Link key={i.id} href={`/admin/invoices/${i.id}`} className={`mr-2 hover:underline ${i.status === 'void' ? 'text-red-500' : 'text-clinic-teal'}`}>
                          {i.invoice_number}
                          {i.status === 'void' ? ' (cancel)' : ''}
                        </Link>
                      ))}
                    </td>
                    <td className="px-4 py-2 text-right">{money(t.charged)}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{money(t.paid)}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${t.balance > 0 ? 'text-red-600' : ''}`}>{money(t.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-clinic-ink/50">Refund ya bill cancel: bill number par click karein (sirf doctor/admin).</p>
      </div>

      {/* Purane bills (naye treatment system se pehle ke) */}
      {oldInvoices.length > 0 && (
        <TreatmentList title="Purane bills (naye treatment system se pehle ke)" rows={oldInvoices.map((i): TreatmentRow => ({ ...i, items: items[i.id] ?? [] }))} />
      )}

      {/* Purane installment plans: sirf dekhna aur qist lena (naye plan ab treatment se banate hain) */}
      {plans.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Purane installment plans</h2>
          <div className="mt-3 grid gap-4">
            {plans.map((plan) => (
              <TreatmentPlanCard
                key={plan.id}
                plan={plan}
                installments={installments.filter((i) => i.plan_id === plan.id)}
                patientId={patient.id}
                patientName={patient.full_name}
                patientPhone={patient.phone}
                portalCode={patient.portal_code ?? null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Poora ledger: har charge aur har payment tareekh ke hisaab se (purana + naya) */}
      {balance && !ledRes.error && (
        <div>
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Poora hisaab (ledger)</h2>
          <div className="mt-3">
            <LedgerTimeline rows={(ledRes.data ?? []) as LedgerRow[]} balance={balance} />
          </div>
        </div>
      )}
      {!isOwner && <p className="text-xs text-clinic-ink/50">Refund, bill cancel aur riyayat sirf doctor/admin kar sakta hai.</p>}
    </div>
  )
}

async function DocsTab({ supabase, patientId, canDelete }: { supabase: Sb; patientId: string; canDelete: boolean }) {
  const { data, error } = await supabase
    .from('patient_photos')
    .select('id, storage_path, caption, taken_on, category')
    .eq('patient_id', patientId)
    .order('taken_on', { ascending: false })
  return <PatientPhotoGallery patientId={patientId} photos={(error ? [] : data ?? []) as PatientPhoto[]} canDelete={canDelete} />
}

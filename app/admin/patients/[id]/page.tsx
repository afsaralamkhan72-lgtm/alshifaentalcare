import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffProfile, isOwnerRole, getPermissions } from '@/lib/auth'
import PatientEditModal from '@/components/admin/PatientEditModal'
import PatientProfilePhoto from '@/components/admin/PatientProfilePhoto'
import PortalLinkButton from '@/components/admin/PortalLinkButton'
import DeletePatientButton from '@/components/admin/DeletePatientButton'
import PatientWorkspace from '@/components/admin/PatientWorkspace'
import type { CatalogOpt, MaterialOpt, TItem, TVisit } from '@/components/admin/TreatmentsPanel'
import VisitNotes, { type VisitNote } from '@/components/admin/VisitNotes'
import PrescriptionForm from '@/components/admin/PrescriptionForm'
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

export default async function PatientDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const staff = await getStaffProfile()
  const isOwner = isOwnerRole(staff.role)
  const perms = await getPermissions()
  const can = (p: string) => perms.includes(p)
  const canClinical = can('clinical.view')
  const canMoney = isOwner || can('billing.view')

  const { data: patient } = await supabase.from('patients').select('*').eq('id', id).maybeSingle()
  if (!patient || patient.deleted_at) notFound()

  const today = todayKarachi()
  const digits = String(patient.phone ?? '').replace(/[^0-9]/g, '')

  // ---- Header: hamesha (halka) ----
  const [balRes, apptRes, histRes, activeRes] = await Promise.all([
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
    canClinical || canMoney
      ? supabase.from('patient_treatments').select('id', { count: 'exact', head: true }).eq('patient_id', id).eq('status', 'active')
      : Promise.resolve({ count: 0 }),
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
  const activeCount = 'count' in activeRes ? (activeRes.count ?? 0) : 0

  // ---- Tabs (sirf jin ki permission ho) ----
  const tabs = [
    { key: 'overview', label: patient.department === 'dental' ? 'Chart aur Treatments' : 'Treatments', show: canClinical || canMoney },
    { key: 'visits', label: 'Visits', show: canClinical },
    { key: 'history', label: 'Clinical History', show: canClinical },
    { key: 'rx', label: 'Prescriptions', show: can('prescriptions.view') },
    { key: 'lab', label: 'Lab', show: can('lab.view') && patient.department === 'dental' },
    { key: 'appointments', label: 'Appointments', show: can('appointments.view') },
    { key: 'billing', label: 'Bills aur Payments', show: canMoney },
    { key: 'docs', label: 'Documents / X-rays', show: canClinical },
  ].filter((t) => t.show)
  const tab = tabs.find((t) => t.key === sp.tab)?.key ?? tabs[0]?.key ?? 'none'

  const subLine = [patient.age ? `${patient.age} saal` : null, patient.gender, patient.phone, patient.created_at ? `register ${fmtDate(String(patient.created_at).slice(0, 10))}` : null]
    .filter(Boolean)
    .join(' · ')
  const wa = digits ? `https://wa.me/92${digits.replace(/^0/, '').replace(/^92/, '')}` : null

  return (
    <div>
      <Link href="/admin/patients" className="text-sm text-clinic-ink/50 transition-colors hover:text-clinic-teal">
        ← Patients
      </Link>

      {/* ================= HEADER ================= */}
      <div className="mt-3 rounded-2xl border border-clinic-teal/10 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <PatientProfilePhoto patientId={patient.id} hasPhoto={Boolean(patient.profile_photo_path)} />
            <div>
              <h1 className="font-display text-xl font-semibold capitalize text-clinic-ink">{patient.full_name}</h1>
              <p className="text-sm text-clinic-ink/60">
                <span className="font-semibold text-clinic-teal">{patient.mr_number}</span> · {subLine}
                <span className="ml-1 rounded-full bg-clinic-mint px-2 py-0.5 text-[11px] capitalize text-clinic-teal">{patient.department}</span>
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
                  ...(nextAppt
                    ? [{ label: 'Appointment reminder', href: apptReminderLink({ ...nextAppt, patient_name: patient.full_name, phone: patient.phone }) }]
                    : []),
                  ...(canMoney && balance && balance.balance > 0
                    ? [{ label: 'Payment reminder (baqaya)', href: paymentReminderLink({ full_name: patient.full_name, phone: patient.phone, balance: balance.balance }) }]
                    : []),
                  { label: 'Aam message', href: generalLink({ full_name: patient.full_name, phone: patient.phone }) },
                ]}
              />
            )}
          </div>
        </div>

        {/* Hisaab + agli appointment + chalti treatments */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
          {canMoney && balance && (
            <>
              <div className="rounded-xl bg-clinic-sand/70 px-2 py-2">
                <p className="text-[11px] text-clinic-ink/50">Kul charges</p>
                <p className="text-sm font-semibold text-clinic-ink">{money(balance.total_charges)}</p>
              </div>
              <div className="rounded-xl bg-clinic-sand/70 px-2 py-2">
                <p className="text-[11px] text-clinic-ink/50">Mile</p>
                <p className="text-sm font-semibold text-emerald-700">{money(balance.total_paid)}</p>
              </div>
              <div className={`rounded-xl px-2 py-2 ${balance.balance > 0 ? 'bg-red-50' : 'bg-clinic-sand/70'}`}>
                <p className="text-[11px] text-clinic-ink/50">Baqaya</p>
                <p className={`text-sm font-semibold ${balance.balance > 0 ? 'text-red-600' : 'text-clinic-ink/60'}`}>{money(balance.balance)}</p>
              </div>
            </>
          )}
          <div className="rounded-xl bg-clinic-mint/60 px-2 py-2">
            <p className="text-[11px] text-clinic-ink/50">Agli appointment</p>
            <p className="text-sm font-semibold text-clinic-teal">
              {nextAppt ? `${fmtDate(nextAppt.preferred_date)}${nextAppt.preferred_time ? ' ' + nextAppt.preferred_time : ''}` : '—'}
            </p>
          </div>
          {(canClinical || canMoney) && (
            <div className="rounded-xl bg-clinic-mint/60 px-2 py-2">
              <p className="text-[11px] text-clinic-ink/50">Chalti treatments</p>
              <p className="text-sm font-semibold text-clinic-teal">{activeCount}</p>
            </div>
          )}
        </div>

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
      </div>

      {/* ================= TABS ================= */}
      <nav className="sticky top-0 z-10 -mx-4 mt-4 overflow-x-auto bg-clinic-sand/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex w-max gap-1.5">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/admin/patients/${id}?tab=${t.key}`}
              scroll={false}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === t.key ? 'bg-clinic-teal text-white' : 'bg-white text-clinic-ink/70 hover:text-clinic-teal'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="mt-4">
        {tab === 'overview' && <OverviewTab supabase={supabase} patient={patient} perms={perms} isOwner={isOwner} />}
        {tab === 'visits' && <VisitsTab supabase={supabase} patientId={id} canEdit={can('clinical.edit')} />}
        {tab === 'history' && <HistoryTab patientId={id} history={history} />}
        {tab === 'rx' && <RxTab supabase={supabase} patient={patient} canWrite={can('prescriptions.write')} />}
        {tab === 'lab' && <LabTab supabase={supabase} patient={patient} canManage={can('lab.manage')} openFor={sp.treatment} />}
        {tab === 'appointments' && (
          <AppointmentsTab supabase={supabase} patient={patient} appts={appts} canManage={can('appointments.manage')} canClinical={canClinical} />
        )}
        {tab === 'billing' && <BillingTab supabase={supabase} patient={patient} balance={balance} isOwner={isOwner} />}
        {tab === 'docs' && <DocsTab supabase={supabase} patientId={id} canDelete={isOwner} />}
        {tab === 'none' && <p className="text-sm text-clinic-ink/60">Aap ko is patient ka record dekhne ki permission nahi.</p>}
      </div>

      {/* Kam istemal hone wali cheezein: neeche */}
      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-clinic-teal/10 pt-4">
        <PortalLinkButton patientId={patient.id} patientName={patient.full_name} patientPhone={patient.phone} portalCode={patient.portal_code ?? null} />
        {isOwner && <DeletePatientButton patientId={patient.id} patientName={patient.full_name} mrNumber={patient.mr_number} />}
      </div>
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

async function OverviewTab({ supabase, patient, perms, isOwner }: { supabase: Sb; patient: PatientRow; perms: string[]; isOwner: boolean }) {
  const can = (p: string) => perms.includes(p)
  const isDental = patient.department === 'dental'
  const [treatments, chartRes, catRes, docRes, matRes] = await Promise.all([
    loadTreatments(supabase, patient.id),
    isDental && can('clinical.view')
      ? supabase.from('dental_chart').select('id, tooth_number, condition, notes, treatment_date, created_at').eq('patient_id', patient.id).order('treatment_date', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('treatment_catalog').select('id, name, price, category, department').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('treating_doctors').select('name').eq('is_active', true).order('name'),
    can('clinical.edit')
      ? supabase.from('treatment_materials').select('treatment_id, inventory_id, default_qty, inventory(item_name, unit)')
      : Promise.resolve({ data: [] }),
  ])
  const materials: Record<string, MaterialOpt[]> = {}
  for (const m of (matRes.data ?? []) as unknown as { treatment_id: string; inventory_id: string; default_qty: number; inventory: { item_name: string; unit: string | null } | null }[]) {
    ;(materials[m.treatment_id] ??= []).push({ inventory_id: m.inventory_id, name: m.inventory?.item_name ?? '', unit: m.inventory?.unit ?? null, default_qty: num(m.default_qty) })
  }
  const catalog: CatalogOpt[] = (catRes.data ?? []).map((c) => ({ ...c, price: num(c.price) })) as CatalogOpt[]
  return (
    <PatientWorkspace
      patientId={patient.id}
      department={patient.department}
      showChart={isDental && can('clinical.view')}
      chartRecords={(chartRes.data ?? []) as { id: string; tooth_number: string; condition: string; notes: string | null; treatment_date: string; created_at: string | null }[]}
      treatments={treatments}
      catalog={catalog}
      materials={materials}
      doctors={(docRes.data ?? []).map((d) => d.name as string)}
      defaultDoctor={patient.primary_doctor ?? null}
      canEdit={can('clinical.edit')}
      canBill={isOwner || can('billing.create')}
      canCollect={isOwner || can('billing.collect')}
      canSeeMoney={isOwner || can('billing.view')}
      isOwner={isOwner}
      canLab={can('lab.manage') && isDental}
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

async function RxTab({ supabase, patient, canWrite }: { supabase: Sb; patient: PatientRow; canWrite: boolean }) {
  const [{ data: rx }, { data: trs }, { data: lastVisits }] = await Promise.all([
    supabase.from('prescriptions').select('id, department, items, notes_en, prescribed_date, treatment_id').eq('patient_id', patient.id).order('prescribed_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('patient_treatments').select('id, name').eq('patient_id', patient.id).eq('status', 'active'),
    supabase.from('visit_notes').select('id, treatment_id, visit_no').eq('patient_id', patient.id).not('treatment_id', 'is', null).is('voided_at', null).order('visit_no', { ascending: false }),
  ])
  const last = new Map<string, string>()
  for (const v of lastVisits ?? []) if (!last.has(v.treatment_id as string)) last.set(v.treatment_id as string, v.id as string)
  const names = new Map((trs ?? []).map((t) => [t.id as string, t.name as string]))
  return (
    <div className="grid gap-6">
      {canWrite && (
        <PrescriptionForm
          patients={[]}
          fixedPatient={{
            id: patient.id,
            full_name: patient.full_name,
            phone: patient.phone,
            department: patient.department as 'dental' | 'homeopathic',
            mr_number: patient.mr_number ?? '',
          }}
          treatments={(trs ?? []).map((t) => ({ id: t.id as string, name: t.name as string, lastVisitId: last.get(t.id as string) ?? null }))}
        />
      )}
      <div>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Purani prescriptions</h2>
        <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
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
    loadTreatments(supabase, patient.id),
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
        <p className="text-sm text-clinic-ink/60">Payment lene ke liye &quot;Chart aur Treatments&quot; tab mein treatment par &quot;Payment lo&quot; dabayein.</p>
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

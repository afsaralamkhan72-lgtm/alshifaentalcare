import Link from 'next/link'
import { toInternationalPKNumber } from '@/lib/phone'
import { Suspense, cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffProfile, isOwnerRole, getPermissions } from '@/lib/auth'
import RewardBanner from '@/components/admin/RewardBanner'
import { getReadyRewards } from '@/lib/rewards'
import PatientEditModal from '@/components/admin/PatientEditModal'
import PatientProfilePhoto from '@/components/admin/PatientProfilePhoto'
import PortalLinkButton from '@/components/admin/PortalLinkButton'
import DeletePatientButton from '@/components/admin/DeletePatientButton'
import VisitWorkspace, { type VisitRow, type MedOpt } from '@/components/admin/visit/VisitWorkspace'
import type { CatalogOpt, MaterialOpt, TItem, TVisit } from '@/components/admin/visit/types'
import PatientPhotoGallery, { type PatientPhoto } from '@/components/admin/PatientPhotoGallery'
import type { Plan as PayPlan, PlanItem } from '@/components/admin/PaymentPlan'
import ArchiveCardView, { type ArchiveCard } from '@/components/admin/ArchiveCardView'
import TreatmentCards, { type Stage, type LabLite } from '@/components/admin/TreatmentCards'
import TreatmentPlanCard, { type Installment, type Plan } from '@/components/admin/TreatmentPlanCard'
import { todayKarachi, money, fmtDate, addDays } from '@/lib/karachi'
import { toBalance, type PatientBalance } from '@/lib/ledger'
import WhatsAppMenu from '@/components/admin/WhatsAppMenu'
import { effectiveApplies } from '@/lib/applies'
import AppointmentBoard from '@/components/admin/AppointmentBoard'
import { apptReminderLink, generalLink, paymentReminderLink, messageLink } from '@/lib/messages'
import { mapTemplates } from '@/lib/messageTemplates'
import PaymentDialog from '@/components/admin/PaymentDialog'
import { topUsed } from '@/lib/similar'
import { getTreatments, TreatmentMiniCards, type PatientRow } from './_sections'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; treatment?: string }>
}

type Sb = Awaited<ReturnType<typeof createClient>>

type ApptRow = { id: string; preferred_date: string | null; preferred_time: string | null; treatment_name: string | null; status: string; notes: string | null }

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

  const [balRes, apptRes, histRes, labRes] = await Promise.all([
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
    can('lab.view')
      ? supabase.from('lab_cases').select('id, work_type, status, due_date').eq('patient_id', id).is('deleted_at', null).in('status', ['pending', 'sent', 'in_progress', 'received'])
      : Promise.resolve({ data: [], error: null }),
  ])
  const tplRes = await supabase.from('message_templates').select('key, body')
  const archRes = canClinical ? await supabase.from('patient_archive_cards').select('*').eq('patient_id', id).maybeSingle() : { data: null }
  const archiveCard = (archRes.data as ArchiveCard | null) ?? null
  const tpl = mapTemplates(tplRes.data as { key: string; body: string }[] | null)
  const pf = { full_name: patient.full_name, phone: patient.phone, gender: patient.gender as string | null }
  // Aaj ki halat (intezar -> doctor -> bill -> ho gaya) aur family
  const [stApptRes, stCvRes, famRes] = await Promise.all([
    can('appointments.view') ? supabase.from('appointments').select('id').eq('patient_id', id).eq('preferred_date', today).eq('status', 'arrived').is('deleted_at', null).limit(1) : Promise.resolve({ data: [] }),
    canClinical ? supabase.from('clinical_visits').select('status, invoice_id').eq('patient_id', id).eq('visit_date', today) : Promise.resolve({ data: [] }),
    supabase.from('patients').select('id, full_name, mr_number').is('deleted_at', null).neq('id', id).or(`family_of.eq.${id}${patient.family_of ? `,id.eq.${patient.family_of},family_of.eq.${patient.family_of}` : ''}`).limit(8),
  ])
  const cvToday = (stCvRes.data ?? []) as { status: string; invoice_id: string | null }[]
  const loy = await supabase.rpc('_loyalty_card', { p_patient: id })
  const loyCard = loy.error ? null : (loy.data as { stamps: number; total: number; cycle_size: number | null; next_title: string | null; remaining: number | null; ready: unknown[] } | null)
  const todayStatus = cvToday.some((c) => c.status === 'finished')
    ? { t: 'Aaj ka visit ho gaya', c: 'bg-emerald-100 text-emerald-800' }
    : cvToday.some((c) => c.status === 'draft')
      ? { t: 'Aaj doctor ke paas (visit chal rahi hai)', c: 'bg-sky-100 text-sky-800' }
      : (stApptRes.data ?? []).length > 0
        ? { t: 'Aaj intezar mein (aa gaya hai)', c: 'bg-amber-100 text-amber-800' }
        : null
  const family = (famRes.data ?? []) as { id: string; full_name: string; mr_number: string | null }[]
  const openLabs = (labRes.data ?? []) as { id: string; work_type: string | null; status: string; due_date: string | null }[]
  const balance: PatientBalance | null = balRes.data ? toBalance(balRes.data as Record<string, string | number | null>) : null
  // Appointment purane data mein phone se judi hoti thi; dusre patient ki na aaye is liye phone wali sirf tab jab patient_id khali ho
  const appts = ((apptRes.data ?? []) as (ApptRow & { patient_id: string | null; phone: string })[]).filter(
    (a) => a.patient_id === id || (!a.patient_id && String(a.phone).replace(/[^0-9]/g, '') === digits)
  )
  const nextAppt = [...appts]
    .filter((a) => (a.preferred_date ?? '') >= today && a.status !== 'cancelled' && a.status !== 'completed')
    .sort((a, b) => (a.preferred_date ?? '').localeCompare(b.preferred_date ?? ''))[0]
  const history = histRes.data as Record<string, unknown> | null
  const alerts = medicalAlerts(history?.medical_history as Record<string, unknown> | undefined)

  const dob = patient.date_of_birth ? fmtDate(patient.date_of_birth) : null
  const wa = digits ? `https://wa.me/${toInternationalPKNumber(patient.phone ?? '')}` : null
  const isDental = patient.department === 'dental'

  const readyRewards = await getReadyRewards(supabase, patient.id)

  return (
    <div className="grid min-w-0 gap-4">
      <Link href="/admin/patients" className="text-sm text-clinic-ink/50 transition-colors hover:text-clinic-teal">
        ← Patients
      </Link>
      <RewardBanner rewards={readyRewards} />

      {/* ================= 1. PATIENT DETAILS ================= */}
      <section id="s1" className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <PatientProfilePhoto patientId={patient.id} hasPhoto={Boolean(patient.profile_photo_path)} />
            <div>
              <h1 className="font-display text-xl font-semibold capitalize text-clinic-ink"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-clinic-teal text-sm font-normal text-white">1</span>{patient.full_name}</h1>
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
                  phone2: patient.phone2 ?? null,
                  guardian_name: patient.guardian_name ?? null,
                  guardian_relation: patient.guardian_relation ?? null,
                  emergency_name: patient.emergency_name ?? null,
                  emergency_phone: patient.emergency_phone ?? null,
                  referral_source: patient.referral_source ?? null,
                }}
              />
            )}
            <a href={`tel:${patient.phone.replace(/[^0-9+]/g, '')}`} className="rounded-full border border-clinic-teal/30 px-4 py-2 text-sm font-semibold text-clinic-ink/80">
              Call
            </a>
            {can('appointments.manage') && (
              <AppointmentBoard
                appointments={[]}
                listOnly
                showButton
                emptyText=""
                buttonLabel="+ Appointment"
                preset={{ id: patient.id, full_name: patient.full_name, phone: patient.phone, department: patient.department, mr_number: patient.mr_number }}
              />
            )}
            {canMoney && (isOwner || can('billing.collect')) && (
              <PaymentDialog patient={{ id: patient.id, full_name: patient.full_name, phone: patient.phone, mr_number: patient.mr_number, portal_code: patient.portal_code }} balance={balance?.balance ?? 0} />
            )}
            {wa && (
              <WhatsAppMenu
                size="md"
                items={[
                  { label: 'Seedha chat kholein', href: wa },
                  ...(nextAppt ? [{ label: 'Appointment reminder', href: apptReminderLink({ ...nextAppt, patient_name: patient.full_name, phone: patient.phone, gender: patient.gender }, tpl) }] : []),
                  ...(canMoney && balance && balance.balance > 0
                    ? [{ label: 'Payment reminder (baqaya)', href: paymentReminderLink({ ...pf, balance: balance.balance }, tpl) }]
                    : []),
                  { label: 'Visit ke baad shukriya', href: messageLink('visit_thanks', pf, {}, tpl) },
                  { label: 'Follow-up ka message', href: messageLink('followup', pf, {}, tpl) },
                  { label: 'Recall (Scaling / Check-up)', href: messageLink('recall', pf, { treatment: 'Scaling / Check-up' }, tpl) },
                  { label: 'Appointment par nahi aaye', href: messageLink('missed', pf, {}, tpl) },
                  { label: 'Lab ka kaam tayyar', href: messageLink('lab_ready', pf, { treatment: openLabs.find((l) => l.status === 'received')?.work_type ?? 'kaam' }, tpl) },
                  ...(canMoney && patient.portal_code
                    ? [{ label: `Payment Statement (${patient.full_name} · ${patient.phone})`, endpoint: `/api/messages/statement?patient=${patient.id}` }]
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
            ...(patient.phone2 ? [['Dusra phone', patient.phone2]] : []),
            ...(patient.guardian_name ? [['Guardian', `${patient.guardian_name}${patient.guardian_relation ? ' (' + patient.guardian_relation + ')' : ''}`]] : []),
            ...(patient.emergency_phone || patient.emergency_name ? [['Emergency', [patient.emergency_name, patient.emergency_phone].filter(Boolean).join(' · ')]] : []),
            ...(patient.referral_source ? [['Kaise pata chala', patient.referral_source]] : []),
          ]
            .filter(([, v]) => v !== '')
            .map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[11px] text-clinic-ink/50">{k}</dt>
                <dd className={`truncate font-medium ${k === 'Baqaya' && balance && balance.balance > 0 ? 'text-red-600' : 'text-clinic-ink'}`}>{v}</dd>
              </div>
            ))}
        </dl>

        {loyCard && loyCard.total > 0 && (
          <p className="mt-2 text-xs text-clinic-ink/70" data-testid="loyalty-line">
            ⭐ Loyalty: <strong>{loyCard.stamps}{loyCard.cycle_size ? ` / ${loyCard.cycle_size}` : ''} stamp</strong> (kul {loyCard.total})
            {loyCard.next_title && loyCard.remaining ? ` · ${loyCard.remaining} baad: ${loyCard.next_title}` : ''}
            {loyCard.ready.length > 0 && <span className="ml-1 font-semibold text-amber-700">· 🎁 {loyCard.ready.length} inaam tayyar</span>}
          </p>
        )}
        {todayStatus && <p className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${todayStatus.c}`}>{todayStatus.t}</p>}
        {family.length > 0 && (
          <p className="mt-2 text-xs text-clinic-ink/70">
            Family:{' '}
            {family.map((f, i) => (
              <span key={f.id}>
                {i > 0 && ', '}
                <Link href={`/admin/patients/${f.id}`} className="font-semibold text-clinic-teal hover:underline">
                  {f.full_name}
                </Link>
              </span>
            ))}
          </p>
        )}
        {openLabs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {openLabs.map((l) => (
              <Link key={l.id} href={`/admin/lab/${l.id}`} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                Lab: {l.work_type ?? 'kaam'} · {l.status === 'received' ? 'aa gaya, fit karna hai' : l.status === 'pending' ? 'bhejna baaki' : l.due_date ? `due ${fmtDate(l.due_date)}` : 'lab mein'}
              </Link>
            ))}
          </div>
        )}
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

      {canMoney && balance && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clinic-teal/10 bg-white p-4" data-testid="total-hisab">
          <div>
            <h2 className="font-display text-lg font-semibold text-clinic-ink">Kul hisaab</h2>
            <p className="mt-1 text-sm">
              Kul bill {money(balance.total_charges)} · Kul mila {money(balance.total_paid)} ·{' '}
              <span className={balance.balance > 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-700'}>Kul baqaya {money(Math.max(0, balance.balance))}</span>
            </p>
          </div>
          {(isOwner || can('billing.collect')) && balance.balance > 0 && (
            <PaymentDialog patient={{ id: patient.id, full_name: patient.full_name, phone: patient.phone, mr_number: patient.mr_number, portal_code: patient.portal_code }} balance={balance.balance} size="sm" />
          )}
        </section>
      )}

      {archiveCard && <ArchiveCardView card={archiveCard} canMoney={canMoney} />}

      {!canClinical && !canMoney && !can('appointments.view') && (
        <p className="text-sm text-clinic-ink/60">Aap ko is patient ka record dekhne ki permission nahi.</p>
      )}

      {/* ================= 2 - 12. AAJ KA VISIT (aik hi page) ================= */}
      {(canClinical || canMoney) && (
        <Suspense fallback={<Loading h="h-64" />}>
          <WorkspaceSection patient={patient} perms={perms} isOwner={isOwner} balance={balance?.balance ?? 0} isDental={isDental} history={history} />
        </Suspense>
      )}

      <div className="profile-extra grid gap-4">
      {canClinical && (
        <Suspense fallback={null}>
          <TreatmentMiniCards patient={{ id: patient.id, full_name: patient.full_name, phone: patient.phone, gender: (patient as { gender?: string | null }).gender ?? null }} canMoney={canMoney} canClinical={canClinical} canRx={can('prescriptions.view')} />
        </Suspense>
      )}

      {/* Kam istemal hone wali cheezein: neeche */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-clinic-teal/10 pt-4">
        <PortalLinkButton patientId={patient.id} patientName={patient.full_name} patientPhone={patient.phone} portalCode={patient.portal_code ?? null} />
        {isOwner && <DeletePatientButton patientId={patient.id} patientName={patient.full_name} mrNumber={patient.mr_number} />}
      </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ */
async function WorkspaceSection({
  patient,
  perms,
  isOwner,
  balance,
  isDental,
  history,
}: {
  patient: PatientRow
  perms: string[]
  isOwner: boolean
  balance: number
  isDental: boolean
  history: Record<string, unknown> | null
}) {
  const supabase = await createClient()
  const can = (p: string) => perms.includes(p)
  const today = todayKarachi()
  const canMoney = isOwner || can('billing.view')
  // meri discount ki had (SQL chali na ho to purana rule: owner 100%, baqi 0%)
  const dmRes = await supabase.rpc('my_discount_limit')
  const discountMax = dmRes.error || dmRes.data == null ? (isOwner ? 100 : 0) : Number(dmRes.data)
  const [treatments, chartRes, catRes, docRes, matRes, qualRes, cvRes, medRes, billRes, rxRes, photoRes, optRes, cvCnt, vnCnt, vsRes, stockRes, usedRes] = await Promise.all([
    getTreatments(patient.id),
    isDental && can('clinical.view')
      ? supabase
          .from('dental_chart')
          .select('tooth_number, condition, treatment_date, created_at, clinical_visit_id, treatment_id, surfaces, state, notes')
          .eq('patient_id', patient.id)
          .order('treatment_date', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('treatment_catalog').select('id, name, price, category, department, applies_to, price_note').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('treating_doctors').select('name').eq('is_active', true).order('name'),
    can('clinical.edit') ? supabase.from('treatment_materials').select('treatment_id, inventory_id, default_qty, inventory(item_name, unit)') : Promise.resolve({ data: [] }),
    can('clinical.edit') ? supabase.from('inventory_meta').select('inventory_id, inventory(item_name, unit, is_active)').eq('is_qualitative', true) : Promise.resolve({ data: [] }),
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
      ? supabase.from('invoices').select('id, clinical_visit_id').eq('patient_id', patient.id).eq('invoice_date', today).neq('status', 'void')
      : Promise.resolve({ data: [] }),
    can('prescriptions.view')
      ? supabase.from('prescriptions').select('id, items, prescribed_date').eq('patient_id', patient.id).order('prescribed_date', { ascending: false }).order('created_at', { ascending: false }).limit(30)
      : Promise.resolve({ data: [] }),
    can('clinical.view')
      ? supabase.from('patient_photos').select('id, storage_path, caption, taken_on, category').eq('patient_id', patient.id).order('taken_on', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase.from('clinic_options').select('kind, label, sort_order').eq('is_active', true).order('sort_order').order('label'),
    can('clinical.view') ? supabase.from('clinical_visits').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id).eq('status', 'finished') : Promise.resolve({ count: null }),
    can('clinical.view') ? supabase.from('visit_notes').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id) : Promise.resolve({ count: null }),
    supabase.from('site_settings').select('value').eq('key', 'visit_show').maybeSingle(),
    can('clinical.edit') ? supabase.from('inventory').select('id, item_name, unit').eq('is_active', true).is('deleted_at', null).order('item_name') : Promise.resolve({ data: [] }),
    can('clinical.edit') ? supabase.from('patient_treatments').select('name').neq('status', 'cancelled').gte('created_at', addDays(todayKarachi(), -365)).order('created_at', { ascending: false }).limit(1500) : Promise.resolve({ data: [] }),
  ])
  const opts = { complaint: [] as string[], homeo_complaint: [] as string[], diagnosis: [] as string[] }
  if (!optRes.error) for (const o of (optRes.data ?? []) as { kind: keyof typeof opts; label: string }[]) opts[o.kind]?.push(o.label)
  const isFirstVisit = cvCnt.count === 0 && vnCnt.count === 0
  const hasPlanned = treatments.some((t) => t.status === 'planned')
  const pastRx = ((rxRes.data ?? []) as { id: string; items: { name_en?: string; name_ur?: string; potency?: string; dosage?: string; frequency?: string; duration?: string; instructions?: string }[] | null; prescribed_date: string }[]).map((r) => ({
    id: r.id,
    date: r.prescribed_date,
    names: (r.items ?? []).map((it) => it.name_en || it.name_ur).filter(Boolean).join(' · '),
    items: (r.items ?? []).map((it) => ({ name: it.name_en || it.name_ur || '', potency: it.potency ?? '', dose: it.dosage ?? '', frequency: it.frequency ?? '', duration: it.duration ?? '', instructions: it.instructions ?? '' })).filter((it) => it.name),
  }))
  const extraItems = ((qualRes.data ?? []) as unknown as { inventory_id: string; inventory: { item_name: string; unit: string | null; is_active: boolean | null } | { item_name: string; unit: string | null; is_active: boolean | null }[] | null }[])
    .map((q) => ({ id: q.inventory_id, inv: Array.isArray(q.inventory) ? q.inventory[0] : q.inventory }))
    .filter((q) => q.inv && q.inv.is_active !== false)
    .map((q) => ({ inventory_id: q.id, name: q.inv!.item_name, unit: q.inv!.unit }))
  const materials: Record<string, MaterialOpt[]> = {}
  for (const m of (matRes.data ?? []) as unknown as { treatment_id: string; inventory_id: string; default_qty: number; inventory: { item_name: string; unit: string | null } | null }[]) {
    ;(materials[m.treatment_id] ??= []).push({ inventory_id: m.inventory_id, name: m.inventory?.item_name ?? '', unit: m.inventory?.unit ?? null, default_qty: num(m.default_qty) })
  }
  // applies_to naya column hai; SQL abhi na chali ho to purani list (bina is ke) hi le lo
  const catData = catRes.error
    ? (await supabase.from('treatment_catalog').select('id, name, price, category, department').eq('is_active', true).order('sort_order').order('name')).data
    : catRes.data
  const catalog: CatalogOpt[] = (catData ?? []).map((c) => ({ ...c, price: num(c.price), applies_to: effectiveApplies(c as { name: string; applies_to?: string | null }) })) as CatalogOpt[]
  const visitsToday = (cvRes.data ?? []) as VisitRow[]
  const draft = visitsToday.find((v) => v.status === 'draft') ?? null
  const fin = visitsToday.find((v) => v.status === 'finished') ?? null
  const finRx = fin ? ((fin as unknown as { prescriptions?: { id: string }[] }).prescriptions ?? [])[0] : undefined
  const invToday = (billRes.data ?? []) as { id: string; clinical_visit_id: string | null }[]
  const finishedToday = fin ? { id: fin.id, hasInvoice: invToday.some((i) => i.clinical_visit_id === fin.id), prescription_id: finRx?.id ?? null } : null
  const chartAll = (chartRes.data ?? []) as { tooth_number: string; condition: string; treatment_date: string; created_at: string | null; clinical_visit_id: string | null; treatment_id: string | null; surfaces: string[] | null; state: string | null; notes?: string | null }[]
  const startedMarks = draft
    ? chartAll
        .filter((c) => c.clinical_visit_id === draft.id && !c.treatment_id)
        .map((c) => ({ tooth: c.tooth_number, condition: c.condition, surfaces: c.surfaces ?? [], state: (c.state ?? 'existing') as 'existing' | 'planned' | 'completed', notes: c.notes ?? '' }))
    : []
  const ageNum = patient.age != null ? Number(patient.age) : patient.date_of_birth ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000) : null
  const hist = (key: string) => ((history?.[key] ?? {}) as Record<string, unknown>)

  return (
    <VisitWorkspace
      patient={{ id: patient.id, full_name: patient.full_name, phone: patient.phone, department: patient.department, age: ageNum, notes: ((patient as { notes?: string | null }).notes) ?? null }}
      visit={draft}
      finishedToday={finishedToday}
      startedMarks={startedMarks}
      history={{ medical_history: hist('medical_history'), dental_history: hist('dental_history') }}
      chartRecords={chartAll}
      treatments={treatments}
      catalog={catalog}
      materials={materials}
      extraItems={extraItems}
      topUsed={topUsed(((usedRes.data ?? []) as { name: string }[]).map((x) => x.name), 30)}
      stockItems={((stockRes.data ?? []) as { id: string; item_name: string; unit: string | null }[]).map((i) => ({ inventory_id: i.id, name: i.item_name, unit: i.unit }))}
      canSeeRecipes={isOwner}
      doctors={(docRes.data ?? []).map((d) => d.name as string)}
      defaultDoctor={patient.primary_doctor ?? null}
      medicines={((medRes.data ?? []) as MedOpt[]).map((m) => ({ ...m, price: num(m.price), stock_qty: m.stock_qty == null ? null : num(m.stock_qty) }))}
      pastRx={pastRx}
      xraySlot={can('clinical.view') ? <PatientPhotoGallery patientId={patient.id} photos={(('error' in photoRes && photoRes.error ? [] : photoRes.data ?? []) as PatientPhoto[])} canDelete={isOwner} /> : null}
      plansSlot={canMoney ? <Suspense fallback={null}><PlansSlot patient={patient} /></Suspense> : null}
      balance={balance}
      consentAt={(patient as { consent_at?: string | null }).consent_at ?? null}
      opts={opts}
      isFirstVisit={isFirstVisit}
      visitShow={(vsRes.data?.value ?? null) as { medical?: boolean; dental?: boolean; exam?: boolean; xray?: boolean } | null}
      hasPlanned={hasPlanned}
      perms={{
        clinicalView: can('clinical.view'),
        clinicalEdit: can('clinical.edit'),
        bill: isOwner || can('billing.create'),
        collect: isOwner || can('billing.collect'),
        money: canMoney,
        owner: isOwner,
        discountMax,
        rx: can('prescriptions.write'),
        lab: can('lab.manage'),
      }}
    />
  )
}


async function PlansSlot({ patient }: { patient: PatientRow }) {
  const supabase = await createClient()
  const { data: plansData } = await supabase
    .from('treatment_plans')
    .select('id, title, total_cost, advance_paid, duration_months, monthly_amount, start_date, status, doctor_id')
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false })
  const plans = (plansData ?? []) as Plan[]
  if (plans.length === 0) return null
  const { data } = await supabase
    .from('installments')
    .select('id, plan_id, installment_no, due_date, amount, paid_amount, paid_date, payment_method')
    .in('plan_id', plans.map((p) => p.id))
    .order('installment_no')
  const installments = (data ?? []) as (Installment & { plan_id: string })[]
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-clinic-ink/60">Purane installment plans (qist yahin se lein)</p>
      <div className="mt-2 grid gap-4">
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
  )
}

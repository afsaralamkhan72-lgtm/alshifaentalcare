import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffProfile, isOwnerRole } from '@/lib/auth'
import DentalChart from '@/components/admin/DentalChart'
import PatientEditModal from '@/components/admin/PatientEditModal'
import TreatmentPlanForm from '@/components/admin/TreatmentPlanForm'
import TreatmentPlanCard, { type Installment, type Plan } from '@/components/admin/TreatmentPlanCard'
import VisitNotes, { type VisitNote } from '@/components/admin/VisitNotes'
import DeletePatientButton from '@/components/admin/DeletePatientButton'
import PatientRecalls, { type PatientRecall } from '@/components/admin/PatientRecalls'
import PortalLinkButton from '@/components/admin/PortalLinkButton'
import VisitTimeline, { type TimelineEntry } from '@/components/admin/VisitTimeline'
import PatientPhotoGallery, { type PatientPhoto } from '@/components/admin/PatientPhotoGallery'
import PatientProfilePhoto from '@/components/admin/PatientProfilePhoto'
import PastTreatments, { type Episode } from '@/components/admin/PastTreatments'
import CloseTreatmentButton from '@/components/admin/CloseTreatmentButton'
import TreatmentList, { type TreatmentRow } from '@/components/admin/TreatmentList'
import PatientQuickActions from '@/components/admin/PatientQuickActions'
import ChargeBuilder, { type CatalogItem, type MaterialRef, type InventoryRef } from '@/components/admin/ChargeBuilder'
import { todayKarachi, money, fmtDate } from '@/lib/karachi'
import { toBalance, type LedgerRow, type PatientBalance } from '@/lib/ledger'
import LedgerTimeline from '@/components/admin/LedgerTimeline'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  // Reception ko paisa, invoice, treatment plan aur payment history nahi dikhti
  const staff = await getStaffProfile()
  const canBill = isOwnerRole(staff.role)

  const { data: patient } = await supabase.from('patients').select('*').eq('id', id).single()
  if (!patient) notFound()

  let dentalRecords: {
    id: string
    tooth_number: string
    condition: string
    notes: string | null
    treatment_date: string
  }[] = []

  if (patient.department === 'dental') {
    const { data } = await supabase
      .from('dental_chart')
      .select('id, tooth_number, condition, notes, treatment_date')
      .eq('patient_id', id)
      .order('treatment_date', { ascending: false })
    dentalRecords = data ?? []
  }

  // Sab queries aik saath, aik ke baad aik nahi — page bohat tez khulta hai
  const [
    plansRes,
    visitRes,
    recallRes,
    rxRes,
    payRes,
    apptRes,
    historyRes,
    photoRes,
    episodeRes,
  ] = await Promise.all([
    supabase
      .from('treatment_plans')
      .select('id, title, total_cost, advance_paid, duration_months, monthly_amount, start_date, status, doctor_id')
      .eq('patient_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('visit_notes')
      .select('id, visit_date, procedure, notes, next_visit')
      .eq('patient_id', id)
      .order('visit_date', { ascending: false }),
    supabase
      .from('recalls')
      .select('id, recall_type, interval_months, last_done, next_due, status')
      .eq('patient_id', id)
      .order('next_due', { ascending: true }),
    supabase
      .from('prescriptions')
      .select('id, department, items, notes_en, prescribed_date')
      .eq('patient_id', id)
      .order('prescribed_date', { ascending: false }),
    supabase
      .from('transactions')
      .select('id, amount, category, payment_method, description, transaction_date, treatment_name, treating_doctor, rate, discount_amount')
      .eq('patient_id', id)
      .eq('type', 'income')
      .order('transaction_date', { ascending: false }),
    // appointments are stored by phone, not patient_id
    supabase
      .from('appointments')
      .select('id, treatment_name, preferred_date, preferred_time, status')
      .eq('phone', patient.phone)
      .order('preferred_date', { ascending: false }),
    supabase
      .from('patient_history')
      .select('completed_step, is_finalized')
      .eq('patient_id', id)
      .maybeSingle(),
    supabase
      .from('patient_photos')
      .select('id, storage_path, caption, taken_on')
      .eq('patient_id', id)
      .order('taken_on', { ascending: false }),
    supabase
      .from('treatment_episodes')
      .select('*')
      .eq('patient_id', id)
      .order('completed_on', { ascending: false }),
  ])

  const plans = (plansRes.data ?? []) as Plan[]
  const visits = (visitRes.data ?? []) as VisitNote[]
  const recalls = (recallRes.data ?? []) as PatientRecall[]
  const history = historyRes.data
  const photos = (photoRes.error ? [] : photoRes.data ?? []) as PatientPhoto[]
  const episodes = (episodeRes.error ? [] : episodeRes.data ?? []) as Episode[]

  // Installments plans par depend karti hain, isliye ye alag chalti hai
  let installments: (Installment & { plan_id: string })[] = []
  if (plans.length > 0) {
    const { data } = await supabase
      .from('installments')
      .select('id, plan_id, installment_no, due_date, amount, paid_amount, paid_date, payment_method')
      .in('plan_id', plans.map((p) => p.id))
      .order('installment_no', { ascending: true })
    installments = (data ?? []) as (Installment & { plan_id: string })[]
  }

  // Phase 3: price list, doctors aur is patient ke naye invoices (sirf owner ke liye)
  let catalog: CatalogItem[] = []
  let doctorNames: string[] = []
  let invoices: { id: string; invoice_number: string; invoice_date: string; total: number; paid_amount: number; balance: number; status: string }[] = []
  let invoicesReady = false
  const invoiceItems: Record<string, { name: string; tooth: string | null }[]> = {}
  let materials: Record<string, MaterialRef[]> = {}
  let inventoryRefs: InventoryRef[] = []
  if (canBill) {
    const [catRes, invRes, docRes] = await Promise.all([
      supabase.from('treatment_catalog').select('id, name, price, department').eq('is_active', true).order('name'),
      supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total, paid_amount, balance, status')
        .eq('patient_id', id)
        .order('invoice_date', { ascending: false })
        .order('invoice_number', { ascending: false }),
      supabase.from('treating_doctors').select('name').eq('is_active', true).order('name'),
    ])
    invoicesReady = !catRes.error && !invRes.error
    catalog = (catRes.data ?? []).map((c) => ({ ...c, price: Number(c.price) })) as CatalogItem[]
    invoices = (invRes.data ?? []).map((i) => ({
      ...i,
      total: Number(i.total),
      paid_amount: Number(i.paid_amount),
      balance: Number(i.balance),
    }))
    doctorNames = (docRes.data ?? []).map((d) => d.name)
    if (invoices.length > 0) {
      const { data: itemRows } = await supabase
        .from('invoice_items')
        .select('invoice_id, name, tooth')
        .in('invoice_id', invoices.map((i) => i.id))
      for (const it of itemRows ?? []) {
        const list = invoiceItems[it.invoice_id] ?? (invoiceItems[it.invoice_id] = [])
        list.push({ name: it.name, tooth: it.tooth })
      }
    }

    // Phase 5: treatment ke saath aam samaan aur poori inventory (na ho to khali, kuch nahi bigarta)
    const [matRes, stockRes] = await Promise.all([
      supabase.from('treatment_materials').select('treatment_id, inventory_id, default_qty, inventory(item_name, unit)'),
      supabase.from('inventory').select('id, item_name, unit').order('item_name'),
    ])
    if (!matRes.error) {
      for (const m of (matRes.data ?? []) as unknown as { treatment_id: string; inventory_id: string; default_qty: number; inventory: { item_name: string; unit: string | null } | null }[]) {
        ;(materials[m.treatment_id] ??= []).push({
          inventory_id: m.inventory_id,
          name: m.inventory?.item_name ?? '',
          unit: m.inventory?.unit ?? null,
          default_qty: Number(m.default_qty),
        })
      }
    }
    if (!stockRes.error) {
      inventoryRefs = (stockRes.data ?? []).map((i) => ({ id: i.id, name: i.item_name, unit: i.unit }))
    }
  }
  const todayK = todayKarachi()

  const prescriptions = rxRes.data ?? []
  const payments = payRes.data ?? []
  const appointments = apptRes.data ?? []

  // Financial roll-up across plans + walk-in payments
  // CHARGE = kaam ki qeemat, PAYMENT = jo paise mile
  const planCharges = plans.reduce((s2, p) => s2 + Number(p.total_cost), 0)
  const walkInCharges = payments
    .filter((t) => t.rate != null)
    .reduce((s2, t) => s2 + (Number(t.rate) - Number(t.discount_amount ?? 0)), 0)

  let totalValue = planCharges + walkInCharges
  let totalPaid = payments.reduce((s2, t) => s2 + Number(t.amount), 0)
  let balance = Math.max(0, totalValue - totalPaid)

  // Phase 4: aik hi formula (database view). View na ho to purana hisaab hi chalta hai.
  let ledgerBalance: PatientBalance | null = null
  let ledgerRows: LedgerRow[] = []
  if (canBill) {
    const [balRes, ledRes] = await Promise.all([
      supabase.from('patient_balances').select('*').eq('patient_id', id).maybeSingle(),
      supabase
        .from('patient_ledger')
        .select('entry_date, sort_at, source, kind, label, charge, payment')
        .eq('patient_id', id),
    ])
    if (!balRes.error && balRes.data && !ledRes.error) {
      ledgerBalance = toBalance(balRes.data as Record<string, string | number | null>)
      ledgerRows = (ledRes.data ?? []) as LedgerRow[]
      totalValue = ledgerBalance.total_charges
      totalPaid = ledgerBalance.total_paid
      balance = ledgerBalance.balance
    }
  }

  // Visits, treatments aur prescriptions ko aik timeline mein mila dein
  const timeline: TimelineEntry[] = [
    ...visits.map((v) => ({
      date: v.visit_date,
      kind: 'visit' as const,
      title: v.procedure ?? 'Visit',
      detail: v.notes,
      nextVisit: v.next_visit,
    })),
    ...payments
      .filter((t) => t.treatment_name)
      .map((t) => ({
        date: t.transaction_date,
        kind: 'treatment' as const,
        title: t.treatment_name as string,
        detail: null,
        doctor: (t.treating_doctor as string | null) ?? null,
        amount: Number(t.amount),
      })),
    ...prescriptions.map((rx) => {
      const items = (rx.items ?? []) as { name_en?: string; name_ur?: string }[]
      return {
        date: rx.prescribed_date,
        kind: 'prescription' as const,
        title: 'Prescription',
        detail: items.map((i) => i.name_en || i.name_ur).filter(Boolean).join(', ') || null,
      }
    }),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const todayStr = todayKarachi()
  const upcomingAppt =
    appointments.find(
      (a) => a.preferred_date && a.preferred_date >= todayStr && a.status !== 'cancelled'
    )?.preferred_date ?? null

  const lastVisit = visits[0]?.visit_date ?? null
  const nextVisit = visits.find((v) => v.next_visit && v.next_visit >= todayKarachi())?.next_visit ?? null

  const callHref = `tel:${patient.phone.replace(/[^0-9+]/g, '')}`
  const subLine = [patient.age ? `${patient.age} saal` : null, patient.gender, patient.phone]
    .filter(Boolean)
    .join(' · ')

  return (
    <div>
      <Link
        href="/admin/patients"
        className="text-sm text-clinic-ink/50 transition-colors hover:text-clinic-teal"
      >
        ← All Patients
      </Link>

      {/* Chhota header: naam, umar, phone, aur 3 buttons */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clinic-teal/10 bg-white p-4">
        <div className="flex items-center gap-3">
          <PatientProfilePhoto
            patientId={patient.id}
            hasPhoto={Boolean(patient.profile_photo_path)}
          />
          <div>
            <h1 className="font-display text-xl font-semibold capitalize text-clinic-ink">{patient.full_name}</h1>
            <p className="text-sm text-clinic-ink/60">
              {patient.mr_number} · {subLine}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Link
            href={`/admin/patients/${patient.id}/history`}
            className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white"
          >
            {history?.is_finalized ? 'History' : history?.completed_step ? `History (${history.completed_step}/8)` : 'Start History'}
          </Link>
          <a
            href={callHref}
            className="rounded-full border border-clinic-teal/30 px-4 py-2 text-sm font-semibold text-clinic-ink/80"
          >
            Call
          </a>
        </div>
      </div>

      {patient.notes && (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900">{patient.notes}</p>
      )}

      {patient.department === 'dental' && (
        <div id="dental-chart" className="mt-6 scroll-mt-6">
          <DentalChart
            patientId={patient.id}
            initialRecords={dentalRecords}
            canBill={canBill && invoicesReady}
            defaultDoctor={patient.primary_doctor ?? null}
            catalog={catalog.map((c) => ({ id: c.id, name: c.name, price: c.price }))}
          />
        </div>
      )}

      {canBill && invoicesReady && (
        <div className="mt-8">
          <TreatmentList
            rows={invoices.map((i): TreatmentRow => ({ ...i, items: invoiceItems[i.id] ?? [] }))}
            summary={
              ledgerBalance
                ? { total: ledgerBalance.total_charges, paid: ledgerBalance.total_paid, balance: ledgerBalance.balance }
                : undefined
            }
          />
        </div>
      )}

      {/* Prescription history */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Prescriptions</h2>
        <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
          {prescriptions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-clinic-ink/50">
              No prescriptions recorded.
            </p>
          ) : (
            prescriptions.map((rx) => {
              const items = (rx.items ?? []) as { name_en?: string; name_ur?: string }[]
              return (
                <div key={rx.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium capitalize text-clinic-ink">
                      {rx.department}
                    </p>
                    <p className="text-xs text-clinic-ink/40">
                      {new Date(rx.prescribed_date).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-clinic-ink/60">
                    {items.map((it) => it.name_en || it.name_ur).filter(Boolean).join(' · ')}
                  </p>
                  {rx.notes_en && (
                    <p className="mt-1 text-xs text-clinic-ink/50">{rx.notes_en}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <details className="mt-8 rounded-2xl border border-clinic-teal/10 bg-white p-4" open={plans.length > 0}>
        <summary className="cursor-pointer font-display text-lg font-semibold text-clinic-ink">
          Aur (Visits, Photos, Recalls, Plans, Purana Hisaab)
        </summary>
        <div className="mt-2">
      <div id="visit-notes" className="mt-8 scroll-mt-6">
        <VisitNotes patientId={patient.id} notes={visits} />
      </div>

      <div id="patient-photos" className="mt-8 scroll-mt-6">
        <PatientPhotoGallery patientId={patient.id} photos={photos} />
      </div>

      <div className="mt-8">
        <PatientRecalls patientId={patient.id} recalls={recalls} />
      </div>

      {/* Treatment plans, orthodontics and any other multi-month course */}
      {canBill && (
      <div id="treatment-plans" className="mt-8 scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-clinic-ink">Treatment Plans</h2>
            <p className="text-sm text-clinic-ink/60">
              Monthly instalments, payment history and balance.
            </p>
          </div>
          <TreatmentPlanForm patientId={patient.id} />
        </div>

        <div className="mt-4 grid gap-4">
          {plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-6 text-center text-sm text-clinic-ink/60">
              Koi treatment plan nahi hai. Braces jaise long treatment ke liye plan banayein ·
              har month ki installment khud ban jayegi.
            </div>
          ) : (
            plans.map((plan) => (
              <TreatmentPlanCard
                key={plan.id}
                plan={plan}
                installments={installments.filter((i) => i.plan_id === plan.id)}
                patientId={patient.id}
                patientName={patient.full_name}
                patientPhone={patient.phone}
                portalCode={patient.portal_code ?? null}
              />
            ))
          )}
        </div>
      </div>
      )}

      {canBill && ledgerBalance && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Patient Ledger</h2>
          <div className="mt-3">
            <LedgerTimeline rows={ledgerRows} balance={ledgerBalance} />
          </div>
        </div>
      )}

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-clinic-teal/10 pt-4">
            <PortalLinkButton
              patientId={patient.id}
              patientName={patient.full_name}
              patientPhone={patient.phone}
              portalCode={patient.portal_code ?? null}
            />
            {canBill && (
              <DeletePatientButton
                patientId={patient.id}
                patientName={patient.full_name}
                mrNumber={patient.mr_number}
              />
            )}
          </div>
        </div>
      </details>
    </div>
  )
}

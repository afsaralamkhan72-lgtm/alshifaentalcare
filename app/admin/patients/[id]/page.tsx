import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DentalChart from '@/components/admin/DentalChart'
import PatientEditModal from '@/components/admin/PatientEditModal'
import TreatmentPlanForm from '@/components/admin/TreatmentPlanForm'
import TreatmentPlanCard, { type Installment, type Plan } from '@/components/admin/TreatmentPlanCard'
import VisitNotes, { type VisitNote } from '@/components/admin/VisitNotes'
import DeletePatientButton from '@/components/admin/DeletePatientButton'
import PatientRecalls, { type PatientRecall } from '@/components/admin/PatientRecalls'
import PortalLinkButton from '@/components/admin/PortalLinkButton'
import VisitTimeline, { type TimelineEntry } from '@/components/admin/VisitTimeline'
import PatientQuickActions from '@/components/admin/PatientQuickActions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

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

  // Treatment plans (orthodontics etc) + their monthly installments
  const { data: plansData } = await supabase
    .from('treatment_plans')
    .select('id, title, total_cost, advance_paid, duration_months, monthly_amount, start_date, status, doctor_id')
    .eq('patient_id', id)
    .order('created_at', { ascending: false })

  const plans = (plansData ?? []) as Plan[]

  let installments: (Installment & { plan_id: string })[] = []
  if (plans.length > 0) {
    const { data } = await supabase
      .from('installments')
      .select('id, plan_id, installment_no, due_date, amount, paid_amount, paid_date, payment_method')
      .in(
        'plan_id',
        plans.map((p) => p.id)
      )
      .order('installment_no', { ascending: true })
    installments = (data ?? []) as (Installment & { plan_id: string })[]
  }

  const { data: visitData } = await supabase
    .from('visit_notes')
    .select('id, visit_date, procedure, notes, next_visit')
    .eq('patient_id', id)
    .order('visit_date', { ascending: false })

  const visits = (visitData ?? []) as VisitNote[]

  const { data: recallData } = await supabase
    .from('recalls')
    .select('id, recall_type, interval_months, last_done, next_due, status')
    .eq('patient_id', id)
    .order('next_due', { ascending: true })

  const recalls = (recallData ?? []) as PatientRecall[]

  // Everything else that belongs to this patient's record
  const [rxRes, payRes, apptRes] = await Promise.all([
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
  ])

  const { data: history } = await supabase
    .from('patient_history')
    .select('completed_step, is_finalized')
    .eq('patient_id', id)
    .maybeSingle()

  const prescriptions = rxRes.data ?? []
  const payments = payRes.data ?? []
  const appointments = apptRes.data ?? []

  // Financial roll-up across plans + walk-in payments
  // CHARGE = kaam ki qeemat, PAYMENT = jo paise mile
  const planCharges = plans.reduce((s2, p) => s2 + Number(p.total_cost), 0)
  const walkInCharges = payments
    .filter((t) => t.rate != null)
    .reduce((s2, t) => s2 + (Number(t.rate) - Number(t.discount_amount ?? 0)), 0)

  const totalValue = planCharges + walkInCharges
  const totalPaid = payments.reduce((s2, t) => s2 + Number(t.amount), 0)
  const balance = Math.max(0, totalValue - totalPaid)

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

  const todayStr = new Date().toISOString().slice(0, 10)
  const upcomingAppt =
    appointments.find(
      (a) => a.preferred_date && a.preferred_date >= todayStr && a.status !== 'cancelled'
    )?.preferred_date ?? null

  const lastVisit = visits[0]?.visit_date ?? null
  const nextVisit = visits.find((v) => v.next_visit && v.next_visit >= new Date().toISOString().slice(0, 10))?.next_visit ?? null

  return (
    <div>
      <Link
        href="/admin/patients"
        className="text-sm text-clinic-ink/50 transition-colors hover:text-clinic-teal"
      >
        ← All Patients
      </Link>

      <div className="mt-3 rounded-2xl border border-clinic-teal/10 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-clinic-teal">{patient.mr_number}</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-clinic-ink">{patient.full_name}</h1>
            <p className="mt-1 text-sm text-clinic-ink/60">{patient.phone}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                patient.department === 'dental' ? 'bg-clinic-teal/10 text-clinic-teal' : 'bg-clinic-amber/10 text-clinic-amber'
              }`}
            >
              {patient.department}
            </span>
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
              {history?.is_finalized
                ? 'View History'
                : history?.completed_step
                  ? `Continue History (${history.completed_step}/8)`
                  : 'Start History'}
            </Link>
            <Link
              href={`/admin/patients/${patient.id}/invoice`}
              className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal"
            >
              Invoice
            </Link>
            <PortalLinkButton
              patientId={patient.id}
              patientName={patient.full_name}
              patientPhone={patient.phone}
              portalCode={patient.portal_code ?? null}
            />
            <DeletePatientButton
              patientId={patient.id}
              patientName={patient.full_name}
              mrNumber={patient.mr_number}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-clinic-teal/10 pt-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-clinic-ink/40">Age</p>
            <p className="text-clinic-ink">{patient.age ?? '—'}</p>
          </div>
          <div>
            <p className="text-clinic-ink/40">Gender</p>
            <p className="capitalize text-clinic-ink">{patient.gender ?? '—'}</p>
          </div>
          <div>
            <p className="text-clinic-ink/40">Registered</p>
            <p className="text-clinic-ink">{new Date(patient.created_at).toLocaleDateString('en-GB')}</p>
          </div>
          <div>
            <p className="text-clinic-ink/40">Address</p>
            <p className="text-clinic-ink">{patient.address ?? '—'}</p>
          </div>
          <div>
            <p className="text-clinic-ink/40">Date of Birth</p>
            <p className="text-clinic-ink">
              {patient.date_of_birth
                ? new Date(patient.date_of_birth).toLocaleDateString('en-GB')
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-clinic-ink/40">Last Visit</p>
            <p className="text-clinic-ink">
              {lastVisit ? new Date(lastVisit).toLocaleDateString('en-GB') : '—'}
            </p>
          </div>
          <div>
            <p className="text-clinic-ink/40">Next Visit</p>
            <p className={nextVisit ? 'font-medium text-clinic-teal' : 'text-clinic-ink'}>
              {nextVisit ? new Date(nextVisit).toLocaleDateString('en-GB') : '—'}
            </p>
          </div>
          {patient.notes && (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-clinic-ink/40">Notes</p>
              <p className="text-clinic-ink">{patient.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Record summary at a glance */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Total Value</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            Rs. {totalValue.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700/70">Paid</p>
          <p className="mt-1 font-display text-lg font-semibold text-emerald-700">
            Rs. {totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700/70">Balance</p>
          <p className="mt-1 font-display text-lg font-semibold text-amber-700">
            Rs. {balance.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Visits</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            {visits.length}
          </p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Prescriptions</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            {prescriptions.length}
          </p>
        </div>
      </div>

      <PatientQuickActions
        patientId={patient.id}
        patientName={patient.full_name}
        patientPhone={patient.phone}
        mrNumber={patient.mr_number}
        portalCode={patient.portal_code ?? null}
        department={patient.department}
        hasPlan={plans.length > 0}
        total={totalValue}
        paid={totalPaid}
        balance={balance}
        nextAppointment={upcomingAppt}
        nextVisit={nextVisit}
      />

      <div className="mt-6">
        <VisitTimeline entries={timeline} patientId={patient.id} />
      </div>

      {/* Treatment plans, orthodontics and any other multi-month course */}
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
                patientName={patient.full_name}
                patientPhone={patient.phone}
                portalCode={patient.portal_code ?? null}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-8">
        <PatientRecalls patientId={patient.id} recalls={recalls} />
      </div>

      <div id="visit-notes" className="mt-8 scroll-mt-6">
        <VisitNotes patientId={patient.id} notes={visits} />
      </div>

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

      {/* Payment history */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Payment History</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-clinic-mint text-left text-clinic-ink/60">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-clinic-ink/50">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((t) => (
                  <tr key={t.id} className="border-t border-clinic-teal/10">
                    <td className="px-4 py-3">
                      {new Date(t.transaction_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-clinic-ink/60">
                      {t.description ?? t.category ?? '—'}
                    </td>
                    <td className="px-4 py-3 capitalize">{t.payment_method ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      Rs. {Number(t.amount).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment history, matched on phone number */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Appointments</h2>
        <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
          {appointments.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-clinic-ink/50">
              No appointments found for this number.
            </p>
          ) : (
            appointments.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm text-clinic-ink">{a.treatment_name ?? 'Consultation'}</p>
                  <p className="text-xs text-clinic-ink/50">
                    {a.preferred_date
                      ? new Date(a.preferred_date).toLocaleDateString('en-GB')
                      : '—'}
                    {a.preferred_time ? ` · ${a.preferred_time}` : ''}
                  </p>
                </div>
                <span className="rounded-full bg-clinic-mint px-3 py-1 text-xs font-semibold capitalize text-clinic-ink/60">
                  {a.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {patient.department === 'dental' ? (
        <div id="dental-chart" className="mt-8 scroll-mt-6">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Interactive Dental Chart</h2>
          <div className="mt-3">
            <DentalChart patientId={patient.id} initialRecords={dentalRecords} />
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-6 text-center text-sm text-clinic-ink/60">
          Homeopathic patients ke liye dental chart applicable nahi. Prescriptions module
          agle phase mein aayega.
        </div>
      )}
    </div>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoiceActions from '@/components/admin/InvoiceActions'
import ClinicLogo from '@/components/ClinicLogo'
import InvoiceBuilder from '@/components/admin/InvoiceBuilder'
import DeleteTransactionButton from '@/components/admin/DeleteTransactionButton'
import { CLINIC } from '@/clinic.config'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: patient } = await supabase
    .from('patients')
    .select('id, mr_number, full_name, phone, department, age, address, portal_code, primary_doctor')
    .eq('id', id)
    .single()

  if (!patient) notFound()

  const [plansRes, txRes, clinicRes] = await Promise.all([
    supabase
      .from('treatment_plans')
      .select('id, title, total_cost, advance_paid, monthly_amount, duration_months')
      .eq('patient_id', id),
    supabase
      .from('transactions')
      .select('id, amount, category, payment_method, description, transaction_date, treatment_name, rate, discount_amount, treating_doctor')
      .eq('patient_id', id)
      .eq('type', 'income')
      .order('transaction_date', { ascending: false }),
    supabase.from('site_settings').select('value').eq('key', 'clinic_info').single(),
  ])

  const plans = plansRes.data ?? []

  const [{ data: savedDoctors }, { data: auth }] = await Promise.all([
    supabase.from('treating_doctors').select('name').eq('is_active', true).order('name'),
    supabase.auth.getUser(),
  ])

  const knownDoctors = (savedDoctors ?? []).map((d) => d.name)

  const { data: serviceRows } = await supabase.from('services').select('title').order('title')
  const knownTreatments = (serviceRows ?? []).map((r) => r.title)

  // Agar login kiya hua staff khud doctor hai to uska naam pehle se bhar dein
  let defaultDoctor: string | null = null
  if (auth?.user?.id) {
    const { data: me } = await supabase
      .from('staff_profiles')
      .select('full_name, role')
      .eq('id', auth.user.id)
      .maybeSingle()
    if (me && (me.role === 'doctor' || me.role === 'admin')) defaultDoctor = me.full_name
  }

  // Patient ka apna doctor sabse pehle
  if (patient.primary_doctor) defaultDoctor = patient.primary_doctor
  const transactions = txRes.data ?? []
  const clinic = (clinicRes.data?.value ?? {}) as Record<string, string>

  // Installments across all this patient's plans
  const planIds = plans.map((p) => p.id)
  let installments: {
    plan_id: string
    installment_no: number
    due_date: string
    amount: number
    paid_amount: number
    paid_date: string | null
    payment_method: string | null
  }[] = []
  if (planIds.length > 0) {
    const { data } = await supabase
      .from('installments')
      .select('plan_id, installment_no, due_date, amount, paid_amount, paid_date, payment_method')
      .order('installment_no', { ascending: true })
      .in('plan_id', planIds)
    installments = data ?? []
  }

  const planTotal = plans.reduce((s, p) => s + Number(p.total_cost), 0)
  const planPaid =
    plans.reduce((s, p) => s + Number(p.advance_paid), 0) +
    installments.reduce((s, i) => s + Number(i.paid_amount), 0)
  const walkInPaid = transactions
    .filter((t) => t.category !== 'treatment-installment')
    .reduce((s, t) => s + Number(t.amount), 0)

  const totalDiscount = transactions.reduce(
    (sum, t) => sum + Number(t.discount_amount ?? 0),
    0
  )

  const grandTotal = planTotal + walkInPaid
  const grandPaid = planPaid + walkInPaid
  const balance = Math.max(0, grandTotal - grandPaid)

  return (
    <div>
      <Link
        href={`/admin/patients/${id}`}
        className="text-sm text-clinic-ink/50 transition-colors hover:text-clinic-teal print:hidden"
      >
        ← {patient.full_name} 's profile
      </Link>

      <div className="mt-3" />

      <InvoiceBuilder
        patientId={patient.id}
        knownDoctors={knownDoctors}
        knownTreatments={knownTreatments}
        defaultDoctor={defaultDoctor}
      />

      <InvoiceActions
        patientName={patient.full_name}
        patientPhone={patient.phone}
        mrNumber={patient.mr_number ?? ''}
        portalCode={patient.portal_code ?? null}
        total={grandTotal}
        paid={grandPaid}
        balance={balance}
      />

      {/* This block is what gets printed */}
      <div
        id="invoice-sheet"
        className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-clinic-teal/20 bg-white"
      >
        <div className="flex flex-wrap items-start gap-3 bg-clinic-teal px-4 py-5 text-white sm:gap-4 sm:px-8 sm:py-6">
          <div className="rounded-lg bg-white p-1.5">
            <ClinicLogo logoUrl={clinic.logo_url} size={48} />
          </div>
          <div>
          <p className="font-display text-2xl font-semibold text-white">
            {clinic.name ?? CLINIC.name}
          </p>
          <p className="text-sm text-white/90">
            {clinic.doctor_name ?? CLINIC.doctor.name}
          </p>
          <p className="mt-1 text-xs text-white/80">
            {clinic.address ?? CLINIC.address.full} · {clinic.phone ?? CLINIC.phone.display}
          </p>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-8 sm:py-6">

        <p className="mt-6 font-display text-lg font-semibold text-clinic-ink">Payment Statement</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-medium text-clinic-ink/70">Patient</p>
            <p className="font-medium text-clinic-ink">{patient.full_name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-clinic-ink/70">MR Number</p>
            <p className="font-medium text-clinic-ink">{patient.mr_number}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-clinic-ink/70">Phone</p>
            <p className="font-medium text-clinic-ink">{patient.phone}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-clinic-ink/70">Date</p>
            <p className="font-medium text-clinic-ink">{new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {plans.length > 0 && (
          <>
            <p className="mt-6 text-sm font-semibold text-clinic-ink">Treatment Plans</p>
            <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
              <thead className="bg-clinic-mint text-left text-xs font-semibold text-clinic-ink/80">
                <tr>
                  <th className="px-2 py-1.5">Treatment</th>
                  <th className="px-2 py-1.5">Duration</th>
                  <th className="px-2 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-t border-clinic-teal/10">
                    <td className="px-2 py-2">{p.title}</td>
                    <td className="px-2 py-2">{p.duration_months} months</td>
                    <td className="px-2 py-2 text-right">Rs. {Number(p.total_cost).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </>
        )}

        {transactions.length > 0 && (
          <>
            <p className="mt-6 text-sm font-semibold text-clinic-ink">Treatments &amp; Payments</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-clinic-mint text-left text-xs font-semibold text-clinic-ink/80">
                  <tr>
                    <th className="px-2 py-1.5">Date</th>
                    <th className="px-2 py-1.5">Treatment</th>
                    <th className="px-2 py-1.5">Doctor</th>
                    <th className="px-2 py-1.5 text-right">Rate</th>
                    <th className="px-2 py-1.5 text-right">Discount</th>
                    <th className="px-2 py-1.5">Method</th>
                    <th className="px-2 py-1.5 text-right">Paid</th>
                    <th className="px-2 py-1.5 print:hidden"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-t border-clinic-teal/10">
                      <td className="px-2 py-2 whitespace-nowrap">
                        {new Date(t.transaction_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-2 py-2 text-clinic-ink">
                        {t.treatment_name ?? t.description ?? t.category ?? '—'}
                      </td>
                      <td className="px-2 py-2 text-clinic-ink">{t.treating_doctor ?? '—'}</td>
                      <td className="px-2 py-2 text-right">
                        {t.rate ? `Rs. ${Number(t.rate).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-2 py-2 text-right text-clinic-teal">
                        {Number(t.discount_amount) > 0
                          ? `Rs. ${Number(t.discount_amount).toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="px-2 py-2 capitalize">{t.payment_method ?? '—'}</td>
                      <td className="px-2 py-2 text-right font-semibold text-clinic-ink">
                        Rs. {Number(t.amount).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right print:hidden">
                        <DeleteTransactionButton
                          id={t.id}
                          label={t.treatment_name ?? t.description ?? 'Entry'}
                          amount={Number(t.amount)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Instalment schedule, orthodontics jaise lambe treatment ke liye */}
        {plans.map((plan) => {
          const rows = installments.filter((i) => i.plan_id === plan.id)
          if (rows.length === 0) return null

          const paidCount = rows.filter((r) => Number(r.paid_amount) > 0).length
          const today = new Date().toISOString().slice(0, 10)

          return (
            <div key={plan.id} className="mt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-clinic-ink">
                  {plan.title} — Instalment Schedule
                </p>
                <p className="text-xs font-medium text-clinic-ink/70">
                  Total Rs. {Number(plan.total_cost).toLocaleString()} · Diya Rs.{' '}
                  {(
                    Number(plan.advance_paid) +
                    rows.reduce((sum, r) => sum + Number(r.paid_amount), 0)
                  ).toLocaleString()}{' '}
                  · Baqaya Rs.{' '}
                  {Math.max(
                    0,
                    Number(plan.total_cost) -
                      Number(plan.advance_paid) -
                      rows.reduce((sum, r) => sum + Number(r.paid_amount), 0)
                  ).toLocaleString()}{' '}
                  · {paidCount} / {rows.length} months
                </p>
              </div>

              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="bg-clinic-mint text-left text-xs font-semibold text-clinic-ink/80">
                    <tr>
                      <th className="px-2 py-1.5">#</th>
                      <th className="px-2 py-1.5">Month</th>
                      <th className="px-2 py-1.5 text-right">Expected</th>
                      <th className="px-2 py-1.5 text-right">Diya</th>
                      <th className="px-2 py-1.5 text-right">Balance</th>
                      <th className="px-2 py-1.5">Status</th>
                      <th className="px-2 py-1.5">Paid On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let running = Number(plan.total_cost) - Number(plan.advance_paid)
                      return rows.map((r) => {
                      const isPaid = Number(r.paid_amount) > 0
                      const overdue = !isPaid && r.due_date < today
                      if (isPaid) running = Math.max(0, running - Number(r.paid_amount))
                      const bal = running
                      return (
                        <tr key={r.installment_no} className="border-t border-clinic-teal/10">
                          <td className="px-2 py-2">{r.installment_no}</td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {new Date(r.due_date).toLocaleDateString('en-GB', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-2 py-2 text-right text-clinic-ink/70">
                            Rs. {Number(r.amount).toLocaleString()}
                          </td>
                          <td className="px-2 py-2 text-right font-semibold text-clinic-ink">
                            {isPaid ? `Rs. ${Number(r.paid_amount).toLocaleString()}` : '—'}
                          </td>
                          <td className="px-2 py-2 text-right text-clinic-ink/70">
                            Rs. {bal.toLocaleString()}
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : overdue
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-clinic-mint text-clinic-ink/70'
                              }`}
                            >
                              {isPaid ? 'Paid' : overdue ? 'Overdue' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-clinic-ink/70">
                            {r.paid_date
                              ? `${new Date(r.paid_date).toLocaleDateString('en-GB')}${
                                  r.payment_method ? ` (${r.payment_method})` : ''
                                }`
                              : '—'}
                          </td>
                        </tr>
                      )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        <div className="mt-6 border-t border-clinic-teal/20 pt-4">
          <div className="flex justify-between py-1 text-sm">
            <span className="text-clinic-ink">Total Treatment Value</span>
            <span className="font-medium">Rs. {grandTotal.toLocaleString()}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between py-1 text-sm">
              <span className="text-clinic-ink">Total Discount</span>
              <span className="font-medium text-clinic-teal">
                Rs. {totalDiscount.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between py-1 text-sm">
            <span className="text-clinic-ink">Total Paid</span>
            <span className="font-medium text-emerald-700">Rs. {grandPaid.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex justify-between rounded-xl bg-clinic-teal px-4 py-3 text-base text-white">
            <span className="font-semibold">Balance Due</span>
            <span className="font-display font-semibold">Rs. {balance.toLocaleString()}</span>
          </div>
        </div>

        <p className="mt-6 border-t border-clinic-teal/20 pt-4 text-center text-xs text-clinic-ink/70">
          {clinic.timings ?? CLINIC.timings.full}
        </p>
        </div>
      </div>
    </div>
  )
}

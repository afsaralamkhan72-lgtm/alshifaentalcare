import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoiceActions from '@/components/admin/InvoiceActions'
import ClinicLogo from '@/components/ClinicLogo'
import InvoiceBuilder from '@/components/admin/InvoiceBuilder'
import DeleteTransactionButton from '@/components/admin/DeleteTransactionButton'
import { CLINIC, timingsLine } from '@/clinic.config'

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
      .select('id, title, total_cost, advance_paid, monthly_amount, duration_months, start_date')
      .eq('patient_id', id),
    supabase
      .from('transactions')
      .select('id, amount, category, payment_method, description, transaction_date, treatment_name, rate, discount_amount, treating_doctor, balance_due, due_date, settled_at')
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

  // ---- Hisaab kitab ----
  // CHARGE  = jo kaam hua uski qeemat (rate se discount minus)
  // PAYMENT = jo paise asal mein mile
  // Har payment transactions mein record hoti hai, isliye wahi ginti hai.

  const planCharges = plans.reduce((s, p) => s + Number(p.total_cost), 0)

  const walkInCharges = transactions
    .filter((t) => t.rate != null)
    .reduce((s, t) => s + (Number(t.rate) - Number(t.discount_amount ?? 0)), 0)

  const totalDiscount = transactions.reduce(
    (sum, t) => sum + Number(t.discount_amount ?? 0),
    0
  )

  // Chronological ledger: har charge aur har payment alag line par
  type LedgerRow = {
    date: string
    label: string
    doctor: string | null
    charge: number
    payment: number
    method: string | null
    id?: string
  }

  const ledger: LedgerRow[] = []

  for (const p2 of plans) {
    ledger.push({
      date: p2.start_date ?? new Date().toISOString().slice(0, 10),
      label: `${p2.title} (plan)`,
      doctor: null,
      charge: Number(p2.total_cost),
      payment: 0,
      method: null,
    })
  }

  for (const t of transactions) {
    const charge = t.rate != null ? Number(t.rate) - Number(t.discount_amount ?? 0) : 0
    const rawLabel = t.treatment_name ?? t.description ?? 'Payment'
    // "Dental Implants (baqaya)" jaise naam patient ko uljhate hain
    const cleanLabel =
      charge > 0
        ? rawLabel.replace(/\s*\((baqaya|advance)\)\s*/i, '')
        : `Payment${rawLabel.match(/month \d+/i) ? ` (${rawLabel.match(/month \d+/i)![0]})` : ''}`

    ledger.push({
      id: t.id,
      date: t.transaction_date,
      label: cleanLabel,
      doctor: (t.treating_doctor as string | null) ?? null,
      charge,
      payment: Number(t.amount),
      method: t.payment_method,
    })
  }

  ledger.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    // Aik hi din: pehle kaam (charge), phir payment
    const aIsCharge = a.charge > 0 ? 0 : 1
    const bIsCharge = b.charge > 0 ? 0 : 1
    return aIsCharge - bIsCharge
  })

  let runningBalance = 0
  const ledgerRows = ledger.map((row) => {
    runningBalance += row.charge - row.payment
    return { ...row, balance: runningBalance }
  })

  // Aaj ka hisaab alag, taake patient ko saaf nazar aaye
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCharge = ledgerRows
    .filter((r) => r.date === todayStr)
    .reduce((sum, r) => sum + r.charge, 0)
  const todayPaid = ledgerRows
    .filter((r) => r.date === todayStr)
    .reduce((sum, r) => sum + r.payment, 0)

  // Aaj se pehle ka baqaya
  const previousBalance = ledgerRows
    .filter((r) => r.date < todayStr)
    .reduce((sum, r) => sum + r.charge - r.payment, 0)

  // Jo treatments ke paise abhi baqi hain (ortho ke ilawa bhi)
  const openDues = transactions
    .filter((t) => Number(t.balance_due ?? 0) > 0 && !t.settled_at)
    .map((t) => ({
      id: t.id,
      name: (t.treatment_name ?? t.description ?? 'Treatment') as string,
      date: t.transaction_date as string,
      rate: Number(t.rate ?? 0),
      discount: Number(t.discount_amount ?? 0),
      paid: Number(t.amount),
      due: Number(t.balance_due),
      dueDate: (t.due_date ?? null) as string | null,
    }))
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))

  const overdueTotal = openDues
    .filter((d) => d.dueDate && d.dueDate < new Date().toISOString().slice(0, 10))
    .reduce((sum, d) => sum + d.due, 0)

  const grandTotal = planCharges + walkInCharges
  const grandPaid = transactions.reduce((s, t) => s + Number(t.amount), 0)
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
        patientName={patient.full_name}
        patientPhone={patient.phone}
        portalCode={patient.portal_code ?? null}
        knownDoctors={knownDoctors}
        knownTreatments={knownTreatments}
        defaultDoctor={defaultDoctor}
      />

      <InvoiceActions
        patientName={patient.full_name}
        patientPhone={patient.phone}
        mrNumber={patient.mr_number ?? ''}
        portalCode={patient.portal_code ?? null}
        previousBalance={previousBalance}
        dues={openDues.map((d) => ({ name: d.name, due: d.due, dueDate: d.dueDate }))}
        todayCharge={todayCharge}
        todayPaid={todayPaid}
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

        {/* Patient ke liye chaar saaf figures */}
        <div className="mt-6 overflow-hidden rounded-xl border border-clinic-teal/30">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <Figure label="Purana Baqaya" value={previousBalance} />
            <Figure label="Aaj Ka Kaam" value={todayCharge} />
            <Figure label="Aaj Mile" value={todayPaid} tone="green" />
            <Figure label="Ab Baqaya" value={balance} tone="teal" />
          </div>
        </div>

        {openDues.length > 0 && (
          <>
            <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-clinic-ink">Baqaya Tafseel</p>
              {overdueTotal > 0 && (
                <p className="text-xs font-semibold text-red-700">
                  Rs. {overdueTotal.toLocaleString()} ki tareekh guzar chuki
                </p>
              )}
            </div>

            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-clinic-mint text-left text-xs font-semibold text-clinic-ink/80">
                  <tr>
                    <th className="px-2 py-1.5">Treatment</th>
                    <th className="px-2 py-1.5">Kab Hua</th>
                    <th className="px-2 py-1.5 text-right">Qeemat</th>
                    <th className="px-2 py-1.5 text-right">Diya</th>
                    <th className="px-2 py-1.5 text-right">Baqaya</th>
                    <th className="px-2 py-1.5">Kab Tak</th>
                  </tr>
                </thead>
                <tbody>
                  {openDues.map((d) => {
                    const isOverdue =
                      d.dueDate && d.dueDate < new Date().toISOString().slice(0, 10)
                    return (
                      <tr key={d.id} className="border-t border-clinic-teal/10">
                        <td className="px-2 py-2 text-clinic-ink">{d.name}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-clinic-ink/70">
                          {new Date(d.date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-2 py-2 text-right text-clinic-ink/70">
                          Rs. {(d.rate - d.discount).toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right text-emerald-700">
                          Rs. {d.paid.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-clinic-ink">
                          Rs. {d.due.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          {d.dueDate ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                isOverdue
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-clinic-mint text-clinic-ink/70'
                              }`}
                            >
                              {new Date(d.dueDate).toLocaleDateString('en-GB')}
                              {isOverdue && ' · guzar gayi'}
                            </span>
                          ) : (
                            <span className="text-clinic-ink/40">date set nahi</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {ledgerRows.length > 0 && (
          <>
            <p className="mt-6 text-sm font-semibold text-clinic-ink">Poora Hisaab Kitab</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-clinic-mint text-left text-xs font-semibold text-clinic-ink/80">
                  <tr>
                    <th className="px-2 py-1.5">Date</th>
                    <th className="px-2 py-1.5">Tafseel</th>
                    <th className="px-2 py-1.5">Doctor</th>
                    <th className="px-2 py-1.5 text-right">Charge</th>
                    <th className="px-2 py-1.5 text-right">Mila</th>
                    <th className="px-2 py-1.5 text-right">Balance</th>
                    <th className="px-2 py-1.5 print:hidden"></th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((row, i) => (
                    <tr key={row.id ?? `plan-${i}`} className="border-t border-clinic-teal/10">
                      <td className="px-2 py-2 whitespace-nowrap">
                        {new Date(row.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-2 py-2 text-clinic-ink">
                        {row.label}
                        {row.method && (
                          <span className="ml-1 text-xs capitalize text-clinic-ink/50">
                            ({row.method})
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-clinic-ink/70">{row.doctor ?? '—'}</td>
                      <td className="px-2 py-2 text-right text-clinic-ink">
                        {row.charge > 0 ? `Rs. ${row.charge.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-emerald-700">
                        {row.payment > 0 ? `Rs. ${row.payment.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-clinic-ink">
                        Rs. {row.balance.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right print:hidden">
                        {row.id && (
                          <DeleteTransactionButton
                            id={row.id}
                            label={row.label}
                            amount={row.payment || row.charge}
                          />
                        )}
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

          // Ab tak kitna aana chahiye tha vs kitna aaya
          const dueSoFar =
            rows
              .filter((r) => r.due_date <= today)
              .reduce((sum, r) => sum + Number(r.amount), 0) + Number(plan.advance_paid)
          const gotSoFar =
            rows.reduce((sum, r) => sum + Number(r.paid_amount), 0) + Number(plan.advance_paid)
          const arrearsNow = Math.max(0, dueSoFar - gotSoFar)
          const planBalance = Math.max(0, Number(plan.total_cost) - gotSoFar)
          const missedMonths = rows.filter(
            (r) => r.due_date <= today && Number(r.paid_amount) === 0
          ).length

          return (
            <div key={plan.id} className="mt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-clinic-ink">
                  {plan.title} — Instalment Schedule
                </p>
                <p className="text-xs font-medium text-clinic-ink/70">
                  {paidCount} / {rows.length} months
                </p>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-clinic-teal/20">
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  <PlanFigure label="Plan Total" value={Number(plan.total_cost)} />
                  <PlanFigure label="Ab Tak Diya" value={gotSoFar} tone="green" />
                  <PlanFigure
                    label={missedMonths > 0 ? `Arrears (${missedMonths} month)` : 'Arrears'}
                    value={arrearsNow}
                    tone={arrearsNow > 0 ? 'red' : 'green'}
                  />
                  <PlanFigure label="Kul Baqaya" value={planBalance} tone="teal" />
                </div>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-clinic-mint text-left text-xs font-semibold text-clinic-ink/80">
                    <tr>
                      <th className="px-2 py-1.5">#</th>
                      <th className="px-2 py-1.5">Month</th>
                      <th className="px-2 py-1.5 text-right">Expected</th>
                      <th className="px-2 py-1.5 text-right">Diya</th>
                      <th className="px-2 py-1.5 text-right">Arrears</th>
                      <th className="px-2 py-1.5 text-right">Balance</th>
                      <th className="px-2 py-1.5">Status</th>
                      <th className="px-2 py-1.5">Paid On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let expectedSoFar = 0
                      let paidSoFar = Number(plan.advance_paid)
                      let running = Number(plan.total_cost) - Number(plan.advance_paid)

                      // Sirf wo mahine dikhayein jo guzar chuke, aur agla aik
                      const firstUnpaidIdx = rows.findIndex((r) => Number(r.paid_amount) === 0)
                      const lastElapsed = rows.filter((r) => r.due_date <= today).length
                      const showUpto = Math.max(
                        lastElapsed + 1,
                        firstUnpaidIdx >= 0 ? firstUnpaidIdx + 1 : 1
                      )

                      return rows.slice(0, showUpto).map((r) => {
                      const isPaid = Number(r.paid_amount) > 0
                      const overdue = !isPaid && r.due_date < today

                      if (r.due_date <= today) expectedSoFar += Number(r.amount)
                      paidSoFar += Number(r.paid_amount)
                      if (isPaid) running = Math.max(0, running - Number(r.paid_amount))

                      const arrears = Math.max(0, expectedSoFar + Number(plan.advance_paid) - paidSoFar)
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
                          <td
                            className={`px-2 py-2 text-right font-semibold ${
                              arrears > 0 ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            {arrears > 0 ? `Rs. ${arrears.toLocaleString()}` : 'Clear'}
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
            <span className="text-clinic-ink">Kul Charges (treatment ki qeemat)</span>
            <span className="font-medium">Rs. {grandTotal.toLocaleString()}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between py-1 text-sm">
              <span className="text-clinic-ink">Discount</span>
              <span className="font-medium text-clinic-teal">
                Rs. {totalDiscount.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between py-1 text-sm">
            <span className="text-clinic-ink">Kul Payment Mili</span>
            <span className="font-medium text-emerald-700">Rs. {grandPaid.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex justify-between rounded-xl bg-clinic-teal px-4 py-3 text-base text-white">
            <span className="font-semibold">Baqaya</span>
            <span className="font-display font-semibold">Rs. {balance.toLocaleString()}</span>
          </div>
        </div>

        <p className="mt-6 border-t border-clinic-teal/20 pt-4 text-center text-xs text-clinic-ink/70">
          {clinic.timings || timingsLine(clinic.closed_day)}
        </p>
        </div>
      </div>
    </div>
  )
}

function Figure({
  label,
  value,
  tone = 'plain',
}: {
  label: string
  value: number
  tone?: 'plain' | 'green' | 'teal'
}) {
  const box =
    tone === 'teal'
      ? 'bg-clinic-teal text-white'
      : tone === 'green'
        ? 'bg-emerald-50 text-emerald-800'
        : 'bg-white text-clinic-ink'

  return (
    <div className={`border-r border-clinic-teal/15 p-4 text-center last:border-r-0 ${box}`}>
      <p className={`text-xs font-medium ${tone === 'teal' ? 'text-white/80' : 'opacity-70'}`}>
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold">Rs. {value.toLocaleString()}</p>
    </div>
  )
}

function PlanFigure({
  label,
  value,
  tone = 'plain',
}: {
  label: string
  value: number
  tone?: 'plain' | 'green' | 'red' | 'teal'
}) {
  const box =
    tone === 'teal'
      ? 'bg-clinic-teal text-white'
      : tone === 'green'
        ? 'bg-emerald-50 text-emerald-800'
        : tone === 'red'
          ? 'bg-red-50 text-red-700'
          : 'bg-white text-clinic-ink'

  return (
    <div className={`border-r border-clinic-teal/15 p-3 text-center last:border-r-0 ${box}`}>
      <p className={`text-[11px] font-medium ${tone === 'teal' ? 'text-white/80' : 'opacity-70'}`}>
        {label}
      </p>
      <p className="mt-0.5 font-display font-semibold">Rs. {value.toLocaleString()}</p>
    </div>
  )
}

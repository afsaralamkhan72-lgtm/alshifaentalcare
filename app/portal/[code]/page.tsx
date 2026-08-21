import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildWhatsAppLink } from '@/lib/whatsapp'

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB') : '—'
}

export const metadata = {
  title: 'My Record | Al Shifa Health Care',
  robots: { index: false, follow: false },
}

export default async function PortalRecordPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = createAdminClient()

  if (!supabase) {
    return (
      <Shell>
        <p className="text-sm text-clinic-ink/60">
          Portal abhi setup nahi hua. Baraye meherbani clinic se raabta karein.
        </p>
      </Shell>
    )
  }

  // The code is the credential. Only non-clinical fields are selected.
  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, mr_number, phone, department')
    .eq('portal_code', code.toLowerCase())
    .is('deleted_at', null)
    .maybeSingle()

  if (!patient) notFound()

  const today = new Date().toISOString().slice(0, 10)

  const [plansRes, apptRes, visitRes] = await Promise.all([
    supabase
      .from('treatment_plans')
      .select('id, title, total_cost, advance_paid, monthly_amount, duration_months')
      .eq('patient_id', patient.id),
    supabase
      .from('appointments')
      .select('treatment_name, preferred_date, preferred_time, status')
      .eq('phone', patient.phone)
      .is('deleted_at', null)
      .order('preferred_date', { ascending: false })
      .limit(5),
    supabase
      .from('visit_notes')
      .select('visit_date, next_visit')
      .eq('patient_id', patient.id)
      .order('visit_date', { ascending: false })
      .limit(1),
  ])

  const plans = plansRes.data ?? []
  const appointments = apptRes.data ?? []
  const lastVisit = visitRes.data?.[0] ?? null

  // Instalments across all plans
  let installments: { amount: number; paid_amount: number; due_date: string; paid_date: string | null }[] = []
  if (plans.length > 0) {
    const { data } = await supabase
      .from('installments')
      .select('amount, paid_amount, due_date, paid_date')
      .in('plan_id', plans.map((p) => p.id))
      .order('due_date', { ascending: true })
    installments = data ?? []
  }

  const total = plans.reduce((s, p) => s + Number(p.total_cost), 0)
  const paid =
    plans.reduce((s, p) => s + Number(p.advance_paid), 0) +
    installments.reduce((s, i) => s + Number(i.paid_amount), 0)
  const balance = Math.max(0, total - paid)
  const nextDue = installments.find((i) => Number(i.paid_amount) === 0)

  const upcoming = appointments.find(
    (a) => a.preferred_date && a.preferred_date >= today && a.status !== 'cancelled'
  )

  return (
    <Shell>
      <p className="text-xs font-semibold uppercase tracking-wide text-clinic-amber">
        Your Record
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-clinic-ink">
        {patient.full_name}
      </h1>
      <p className="text-sm text-clinic-ink/50">
        {patient.mr_number} · {patient.department}
      </p>

      {/* Next appointment / next visit */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-clinic-teal p-5 text-white">
          <p className="text-xs text-white/60">Next Appointment</p>
          <p className="mt-1 font-display text-lg font-semibold">
            {upcoming
              ? `${fmt(upcoming.preferred_date)}${upcoming.preferred_time ? ` · ${upcoming.preferred_time}` : ''}`
              : 'Not booked'}
          </p>
          {lastVisit?.next_visit && (
            <p className="mt-2 text-xs text-white/60">
              Suggested next visit: {fmt(lastVisit.next_visit)}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
          <p className="text-xs text-clinic-ink/50">Balance</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            Rs. {balance.toLocaleString()}
          </p>
          {nextDue && (
            <p className="mt-2 text-xs text-clinic-ink/50">
              Next instalment Rs. {Number(nextDue.amount).toLocaleString()} due{' '}
              {fmt(nextDue.due_date)}
            </p>
          )}
        </div>
      </div>

      {/* Treatment plans */}
      {plans.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-clinic-ink">Treatment Plan</h2>
          <div className="mt-3 grid gap-3">
            {plans.map((p) => (
              <div key={p.id} className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
                <p className="font-medium text-clinic-ink">{p.title}</p>
                <p className="mt-1 text-sm text-clinic-ink/60">
                  Rs. {Number(p.total_cost).toLocaleString()} · {p.duration_months} months · Rs.{' '}
                  {Number(p.monthly_amount).toLocaleString()} per month
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Box label="Total" value={`Rs. ${total.toLocaleString()}`} />
            <Box label="Paid" value={`Rs. ${paid.toLocaleString()}`} tone="green" />
            <Box label="Balance" value={`Rs. ${balance.toLocaleString()}`} tone="amber" />
          </div>
        </section>
      )}

      {/* Payment history */}
      {installments.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-clinic-ink">Payment History</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-clinic-teal/10 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-clinic-mint text-left text-clinic-ink/60">
                <tr>
                  <th className="px-4 py-2">Due</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((i, n) => {
                  const isPaid = Number(i.paid_amount) > 0
                  return (
                    <tr key={n} className="border-t border-clinic-teal/10">
                      <td className="px-4 py-2">{fmt(i.due_date)}</td>
                      <td className="px-4 py-2">Rs. {Number(i.amount).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700'
                              : i.due_date < today
                                ? 'bg-red-50 text-red-700'
                                : 'bg-clinic-mint text-clinic-ink/50'
                          }`}
                        >
                          {isPaid ? `Paid ${fmt(i.paid_date)}` : i.due_date < today ? 'Overdue' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Appointments */}
      {appointments.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-clinic-ink">Recent Appointments</h2>
          <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
            {appointments.map((a, n) => (
              <div key={n} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-clinic-ink">{a.treatment_name ?? 'Consultation'}</p>
                  <p className="text-xs text-clinic-ink/50">{fmt(a.preferred_date)}</p>
                </div>
                <span className="rounded-full bg-clinic-mint px-3 py-1 text-xs font-semibold capitalize text-clinic-ink/60">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={buildWhatsAppLink({
            customMessage: `Asalam-o-Alaikum, main ${patient.full_name} (${patient.mr_number}) hoon. Mujhe appointment chahiye.`,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white"
        >
          Book on WhatsApp
        </a>
        <a
          href="tel:03422078639"
          className="rounded-full border border-clinic-teal px-5 py-2.5 text-sm font-semibold text-clinic-teal"
        >
          Call the Clinic
        </a>
      </div>

      <p className="mt-8 text-xs text-clinic-ink/40">
        This page shows appointments and payments only. For treatment details, prescriptions or
        reports, please speak to the doctor at the clinic.
      </p>
    </Shell>
  )
}

function Box({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' }) {
  const cls =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-clinic-teal/10 bg-white text-clinic-ink'
  return (
    <div className={`rounded-2xl border p-3 ${cls}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 font-display font-semibold">{value}</p>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-clinic-sand">
      <header className="border-b border-clinic-teal/10 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display font-semibold text-clinic-teal">
            Al Shifa Health Care
          </Link>
          <span className="text-xs text-clinic-ink/40">0342-2078639</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  )
}

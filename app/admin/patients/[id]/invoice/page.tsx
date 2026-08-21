import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoiceActions from '@/components/admin/InvoiceActions'
import ClinicLogo from '@/components/ClinicLogo'
import InvoiceBuilder from '@/components/admin/InvoiceBuilder'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: patient } = await supabase
    .from('patients')
    .select('id, mr_number, full_name, phone, department, age, address, portal_code')
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
      .select('amount, category, payment_method, description, transaction_date')
      .eq('patient_id', id)
      .eq('type', 'income')
      .order('transaction_date', { ascending: false }),
    supabase.from('site_settings').select('value').eq('key', 'clinic_info').single(),
  ])

  const plans = plansRes.data ?? []
  const transactions = txRes.data ?? []
  const clinic = (clinicRes.data?.value ?? {}) as Record<string, string>

  // Installments across all this patient's plans
  const planIds = plans.map((p) => p.id)
  let installments: { plan_id: string; paid_amount: number }[] = []
  if (planIds.length > 0) {
    const { data } = await supabase
      .from('installments')
      .select('plan_id, paid_amount')
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

      <InvoiceBuilder patientId={patient.id} total={grandTotal} paid={grandPaid} />

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
        <div className="flex items-start gap-4 bg-clinic-teal px-8 py-6 text-white">
          <div className="rounded-lg bg-white p-1.5">
            <ClinicLogo logoUrl={clinic.logo_url} size={48} />
          </div>
          <div>
          <p className="font-display text-2xl font-semibold text-white">
            {clinic.name ?? 'Al Shifa Health Care'}
          </p>
          <p className="text-sm text-white/90">
            {clinic.doctor_name ?? 'Dr. Muhammad Khalid Mahmood'}
          </p>
          <p className="mt-1 text-xs text-white/80">
            {clinic.address ?? 'Numaish, Nizami Road, Karachi'} · {clinic.phone ?? '0342-2078639'}
          </p>
          </div>
        </div>

        <div className="px-8 py-6">

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
            <table className="mt-2 w-full text-sm">
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
            </table>
          </>
        )}

        {transactions.length > 0 && (
          <>
            <p className="mt-6 text-sm font-semibold text-clinic-ink">Payments Received</p>
            <table className="mt-2 w-full text-sm">
              <thead className="bg-clinic-mint text-left text-xs font-semibold text-clinic-ink/80">
                <tr>
                  <th className="px-2 py-1.5">Date</th>
                  <th className="px-2 py-1.5">Description</th>
                  <th className="px-2 py-1.5">Method</th>
                  <th className="px-2 py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} className="border-t border-clinic-teal/10">
                    <td className="px-2 py-2">
                      {new Date(t.transaction_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-2 py-2 text-clinic-ink">{t.description ?? t.category ?? '—'}</td>
                    <td className="px-2 py-2 capitalize">{t.payment_method ?? '—'}</td>
                    <td className="px-2 py-2 text-right">Rs. {Number(t.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="mt-6 border-t border-clinic-teal/20 pt-4">
          <div className="flex justify-between py-1 text-sm">
            <span className="text-clinic-ink">Total Treatment Value</span>
            <span className="font-medium">Rs. {grandTotal.toLocaleString()}</span>
          </div>
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
          {clinic.timings ?? 'Open Daily 10:00 AM to 5:00 PM'}
        </p>
        </div>
      </div>
    </div>
  )
}

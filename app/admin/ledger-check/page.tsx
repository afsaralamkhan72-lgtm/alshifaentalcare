import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAnyPerm } from '@/lib/auth'
import { money } from '@/lib/karachi'
import SectionTabs from '@/components/admin/SectionTabs'

/**
 * Purani screens ka baqaya aur naye (aik hi formula wale) ledger ka muqabila.
 * Jahan farq ho wahan doctor ek nazar dekh le. Kuch badla nahi jata, sirf dikhaya jata hai.
 */
export default async function LedgerCheckPage() {
  await requireAnyPerm('reports.view')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('patient_balances')
    .select('patient_id, old_balance, new_balance, balance, legacy_balance, patients(full_name, mr_number)')
    .limit(2000)

  if (error) {
    return (
      <div>
        <SectionTabs which="reports" />
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Hisaab Check</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase mein <strong>phase4-ledger.sql</strong> chalayein (pehle test project par).
          </p>
        </div>
      </div>
    )
  }

  const rows = (data ?? []) as unknown as {
    patient_id: string
    old_balance: number
    new_balance: number
    balance: number
    legacy_balance: number
    patients: { full_name: string; mr_number: string | null } | null
  }[]

  const diff = rows
    .filter((r) => Math.abs(Number(r.balance) - Number(r.legacy_balance)) > 0.009)
    .sort((a, b) => Math.abs(Number(b.balance) - Number(b.legacy_balance)) - Math.abs(Number(a.balance) - Number(a.legacy_balance)))

  const rec = await supabase.rpc('invoice_reconcile')
  const recRows = (rec.data ?? []) as { invoice_id: string; invoice_number: string; paid_amount: number; payments_sum: number; txn_sum: number }[]
  const recMissing = !!rec.error

  const totalNow = rows.reduce((s, r) => s + Number(r.balance), 0)

  return (
    <div>
      <SectionTabs which="reports" />
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Hisaab Check</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Har patient ka baqaya ab aik hi formula se nikalta hai. Neeche wo patients hain jin ka baqaya purani screens ke
        formula se alag aata hai (aksar wo jinki treatment plan ki installment ek purane raste se likhi gayi thi jis mein
        patient ka naam nahi lagta tha).
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Patients</p>
          <p className="font-display text-lg font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Kul baqaya (naya formula)</p>
          <p className="font-display text-lg font-semibold text-amber-700">{money(totalNow)}</p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Jin mein farq hai</p>
          <p className="font-display text-lg font-semibold">{diff.length}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-clinic-teal/10 bg-white p-4" data-testid="reconcile">
        <p className="font-display font-semibold text-clinic-ink">Invoice, Payments aur Transactions ka mela</p>
        {recMissing ? (
          <p className="mt-1 text-sm text-amber-700">Is mele ke liye database mein <strong>part2-reconcile.sql</strong> chalana hoga.</p>
        ) : recRows.length === 0 ? (
          <p className="mt-1 text-sm text-emerald-700">✓ Har active invoice ka mila hua paisa, payments aur accounts teeno se barabar hai.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <p className="text-sm text-red-700">{recRows.length} invoice mein farq hai (kuch badla nahi gaya, sirf dikhaya hai):</p>
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-clinic-ink/60"><tr><th className="py-1">Invoice</th><th className="text-right">Invoice par</th><th className="text-right">Payments</th><th className="text-right">Accounts</th></tr></thead>
              <tbody>
                {recRows.map((r) => (
                  <tr key={r.invoice_id} className="border-t border-clinic-teal/10">
                    <td className="py-1"><Link href={`/admin/invoices/${r.invoice_id}`} className="font-semibold text-clinic-teal hover:underline">{r.invoice_number}</Link></td>
                    <td className="text-right">{money(r.paid_amount)}</td>
                    <td className="text-right">{money(r.payments_sum)}</td>
                    <td className="text-right">{money(r.txn_sum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3 text-right">Purana formula</th>
              <th className="px-4 py-3 text-right">Naya (ledger)</th>
              <th className="px-4 py-3 text-right">Farq</th>
            </tr>
          </thead>
          <tbody>
            {diff.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-emerald-700">Koi farq nahi. Sab patients ka hisaab match karta hai.</td></tr>
            )}
            {diff.map((r) => {
              const d = Number(r.balance) - Number(r.legacy_balance)
              return (
                <tr key={r.patient_id} className="border-t border-clinic-teal/10">
                  <td className="px-4 py-3">
                    <Link href={`/admin/patients/${r.patient_id}`} className="font-medium text-clinic-teal hover:underline">
                      {r.patients?.full_name ?? '—'}
                    </Link>
                    <span className="ml-2 text-xs text-clinic-ink/50">{r.patients?.mr_number}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{money(r.legacy_balance)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(r.balance)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${d < 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {d > 0 ? '+' : ''}{money(d)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

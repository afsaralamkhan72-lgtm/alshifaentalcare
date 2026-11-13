import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAnyPerm } from '@/lib/auth'
import { fmtDate, money, todayKarachi } from '@/lib/karachi'
import SectionTabs from '@/components/admin/SectionTabs'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; when?: string }>
}) {
  await requireAnyPerm('billing.view')
  const params = await searchParams
  const supabase = await createClient()

  let q = supabase
    .from('invoices')
    .select('id, invoice_number, invoice_date, total, paid_amount, balance, status, patients!inner(full_name, mr_number)')
    .is('patients.deleted_at', null)
    .order('invoice_date', { ascending: false })
    .order('invoice_number', { ascending: false })
    .limit(150)

  if (params.status === 'due') q = q.gt('balance', 0)
  else if (params.status === 'void') q = q.eq('status', 'void')
  const today = todayKarachi()
  if (params.when === 'today') q = q.eq('invoice_date', today)
  else if (params.when === 'week') {
    const d = new Date(`${today}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 6)
    q = q.gte('invoice_date', d.toISOString().slice(0, 10))
  }
  const term = (params.q ?? '').replace(/[,%()]/g, '').trim()
  if (term) {
    // Invoice number ya patient ka naam / phone / MR number
    const { data: pts } = await supabase
      .from('patients')
      .select('id')
      .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,mr_number.ilike.%${term}%`)
      .limit(50)
    const ids = (pts ?? []).map((x: { id: string }) => x.id)
    q = ids.length
      ? q.or(`invoice_number.ilike.%${term}%,patient_id.in.(${ids.join(',')})`)
      : q.ilike('invoice_number', `%${term}%`)
  }

  const { data, error } = await q

  if (error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Invoices</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase mein <strong>phase3-prices-invoices.sql</strong> chalayein (pehle test project par).
          </p>
        </div>
      </div>
    )
  }

  const rows = (data ?? []) as unknown as {
    id: string
    invoice_number: string
    invoice_date: string
    total: number
    paid_amount: number
    balance: number
    status: string
    patients: { full_name: string; mr_number: string | null } | null
  }[]

  return (
    <div>
      <SectionTabs which="accounts" />
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Invoices</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Naye invoice. Naya invoice patient ke page par "Complete + Charge" se banta hai.
      </p>

      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={params.q ?? ''} placeholder="Invoice number ya patient ka naam / phone" aria-label="Invoice number ya patient ka naam / phone" className="min-w-[200px] flex-1 rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
        <select name="when" defaultValue={params.when ?? ''} className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm">
          <option value="">Har tareekh</option>
          <option value="today">Aaj</option>
          <option value="week">Is hafte</option>
        </select>
        <select name="status" defaultValue={params.status ?? ''} className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm">
          <option value="">Sab</option>
          <option value="due">Baqaya wale</option>
          <option value="void">Cancel</option>
        </select>
        <button className="rounded-lg bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">Dekhein</button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Tareekh</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Mile</th>
              <th className="px-4 py-3 text-right">Baqaya</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-clinic-ink/50">Koi invoice nahi.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-clinic-teal/10">
                <td className="px-4 py-3">
                  <Link href={`/admin/invoices/${r.id}`} className="font-semibold text-clinic-teal hover:underline">{r.invoice_number}</Link>
                  {r.status === 'void' && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">Cancel</span>}
                </td>
                <td className="px-4 py-3">{fmtDate(r.invoice_date)}</td>
                <td className="px-4 py-3">{r.patients?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-right">{money(r.total)}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{money(r.paid_amount)}</td>
                <td className="px-4 py-3 text-right font-semibold text-amber-700">{money(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

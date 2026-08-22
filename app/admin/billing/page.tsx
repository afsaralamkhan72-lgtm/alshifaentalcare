import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/admin/StatCard'
import TransactionForm from '@/components/admin/TransactionForm'
import EditTransactionButton from '@/components/admin/EditTransactionButton'
import DeleteTransactionButton from '@/components/admin/DeleteTransactionButton'

interface SearchParams {
  from?: string
  to?: string
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

async function getTransactions(from: string, to: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('transactions')
    .select('id, type, category, amount, payment_method, description, transaction_date, rate, discount_amount, treatment_name, treating_doctor')
    .gte('transaction_date', from)
    .lte('transaction_date', to)
    .order('transaction_date', { ascending: false })
    .limit(300)
  return data ?? []
}

const METHODS = ['cash', 'bank', 'easypaisa', 'jazzcash'] as const

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const from = params.from || firstOfMonth()
  const to = params.to || todayStr()

  const transactions = await getTransactions(from, to)

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0)
  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)

  // Income split by payment method, shows how much came via cash vs bank
  // vs mobile wallets in the selected period.
  const byMethod = METHODS.map((m) => ({
    method: m,
    total: transactions
      .filter((t) => t.type === 'income' && t.payment_method === m)
      .reduce((s, t) => s + Number(t.amount), 0),
  }))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Billing &amp; Accounts</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">
            {from} se {to} tak ka record
          </p>
        </div>
        <TransactionForm />
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-clinic-ink/50">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 block rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-clinic-ink/50">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="mt-1 block rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-lg bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
          Apply
        </button>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total Income" value={`Rs. ${income.toLocaleString()}`} accent="green" />
        <StatCard label="Total Expenses" value={`Rs. ${expense.toLocaleString()}`} accent="red" />
        <StatCard
          label="Net Profit"
          value={`Rs. ${(income - expense).toLocaleString()}`}
          accent={income - expense >= 0 ? 'teal' : 'red'}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {byMethod.map((m) => (
          <div key={m.method} className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
            <p className="text-xs capitalize text-clinic-ink/50">{m.method} (income)</p>
            <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
              Rs. {m.total.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-clinic-teal/10">
                <td className="px-4 py-3">{new Date(t.transaction_date).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      t.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {t.type}
                  </span>
                </td>
                <td className="px-4 py-3">{t.category ?? '—'}</td>
                <td className="px-4 py-3 capitalize">{t.payment_method ?? '—'}</td>
                <td className="px-4 py-3 text-clinic-ink/60">{t.description ?? '—'}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    t.type === 'income' ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {t.type === 'income' ? '+' : '−'} Rs. {Number(t.amount).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <EditTransactionButton
                      id={t.id}
                      label={t.treatment_name ?? t.description ?? t.category ?? 'Entry'}
                      amount={Number(t.amount)}
                      rate={t.rate != null ? Number(t.rate) : null}
                      discountAmount={Number(t.discount_amount ?? 0)}
                      paymentMethod={t.payment_method}
                      transactionDate={t.transaction_date}
                    />
                    <DeleteTransactionButton
                      id={t.id}
                      label={t.treatment_name ?? t.description ?? t.category ?? 'Entry'}
                      amount={Number(t.amount)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-clinic-ink/50">
                  Is period mein koi transaction nahi hai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

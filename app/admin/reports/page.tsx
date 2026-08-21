import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/admin/StatCard'

function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0)
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  }
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const month = params.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { from, to } = monthBounds(month)

  const supabase = await createClient()

  const [txRes, patientsRes, apptRes, plansRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, category, amount, payment_method')
      .gte('transaction_date', from)
      .lte('transaction_date', to),
    supabase
      .from('patients')
      .select('department, created_at')
      .is('deleted_at', null)
      .gte('created_at', from)
      .lte('created_at', `${to}T23:59:59`),
    supabase
      .from('appointments')
      .select('status')
      .gte('preferred_date', from)
      .lte('preferred_date', to),
    supabase.from('treatment_plans').select('total_cost, advance_paid, status'),
  ])

  const tx = txRes.data ?? []
  const income = tx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = tx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  // Income grouped by category — shows which treatments actually earn
  const byCategory = new Map<string, number>()
  for (const t of tx) {
    if (t.type !== 'income') continue
    const key = t.category || 'uncategorised'
    byCategory.set(key, (byCategory.get(key) ?? 0) + Number(t.amount))
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1])

  // Expenses grouped by category
  const byExpense = new Map<string, number>()
  for (const t of tx) {
    if (t.type !== 'expense') continue
    const key = t.category || 'uncategorised'
    byExpense.set(key, (byExpense.get(key) ?? 0) + Number(t.amount))
  }
  const expenseCats = [...byExpense.entries()].sort((a, b) => b[1] - a[1])

  const newPatients = patientsRes.data ?? []
  const appts = apptRes.data ?? []
  const plans = plansRes.data ?? []

  const activePlanValue = plans
    .filter((p) => p.status === 'active')
    .reduce((s, p) => s + Number(p.total_cost) - Number(p.advance_paid), 0)

  const maxCat = categories[0]?.[1] ?? 1

  const label = new Date(from).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Monthly Report</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">{label}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/reports?month=${shiftMonth(month, -1)}`}
            className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
          >
            ← Previous
          </Link>
          <Link
            href={`/admin/reports?month=${shiftMonth(month, 1)}`}
            className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
          >
            Next →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Income" value={`Rs. ${income.toLocaleString()}`} accent="green" />
        <StatCard label="Expenses" value={`Rs. ${expense.toLocaleString()}`} accent="red" />
        <StatCard
          label="Net Profit"
          value={`Rs. ${(income - expense).toLocaleString()}`}
          accent={income - expense >= 0 ? 'teal' : 'red'}
        />
        <StatCard label="New Patients" value={String(newPatients.length)} accent="teal" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Dental Patients</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            {newPatients.filter((p) => p.department === 'dental').length}
          </p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Homeopathic Patients</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            {newPatients.filter((p) => p.department === 'homeopathic').length}
          </p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Appointments Completed</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            {appts.filter((a) => a.status === 'completed').length} / {appts.length}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700/70">Outstanding (active plans)</p>
          <p className="mt-1 font-display text-lg font-semibold text-amber-700">
            Rs. {activePlanValue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Income by category with simple bars */}
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
          <p className="font-display font-semibold text-clinic-ink">Income by Category</p>
          {categories.length === 0 ? (
            <p className="mt-4 text-sm text-clinic-ink/50">Is mahine koi income record nahi hui.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {categories.map(([cat, amount]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-clinic-ink/70">{cat.replace(/-/g, ' ')}</span>
                    <span className="font-medium text-clinic-ink">
                      Rs. {amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-clinic-mint">
                    <div
                      className="h-full rounded-full bg-clinic-teal"
                      style={{ width: `${Math.max(4, (amount / maxCat) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
          <p className="font-display font-semibold text-clinic-ink">Expenses by Category</p>
          {expenseCats.length === 0 ? (
            <p className="mt-4 text-sm text-clinic-ink/50">Is mahine koi expense record nahi hua.</p>
          ) : (
            <div className="mt-4 grid gap-2">
              {expenseCats.map(([cat, amount]) => (
                <div
                  key={cat}
                  className="flex justify-between border-b border-clinic-teal/10 py-2 text-sm last:border-0"
                >
                  <span className="capitalize text-clinic-ink/70">{cat.replace(/-/g, ' ')}</span>
                  <span className="font-medium text-red-700">Rs. {amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

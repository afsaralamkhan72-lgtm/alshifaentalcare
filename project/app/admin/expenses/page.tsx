import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import { todayKarachi, addDays, money } from '@/lib/karachi'
import ExpenseManager, { type ExpenseRow, type CategoryRow } from '@/components/admin/ExpenseManager'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  await requireOwner()
  const sp = await searchParams
  const today = todayKarachi()
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? (sp.month as string) : today.slice(0, 7)
  const from = `${month}-01`
  const nextMonth = addDays(`${month}-28`, 5).slice(0, 7)
  const to = `${nextMonth}-01`

  const supabase = await createClient()
  const [rowsRes, catRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, transaction_date, category, amount, payment_method, description, source')
      .eq('type', 'expense')
      .gte('transaction_date', from)
      .lt('transaction_date', to)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.from('expense_categories').select('id, name, is_active').order('sort_order').order('name'),
  ])

  if (catRes.error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Kharche</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase mein <strong>phase6-expenses-lab.sql</strong> chalayein (pehle test project par).
          </p>
        </div>
      </div>
    )
  }

  const rows = (rowsRes.data ?? []) as ExpenseRow[]
  const total = rows.reduce((s, r) => s + Number(r.amount), 0)
  const byCat = new Map<string, number>()
  for (const r of rows) byCat.set(r.category ?? 'Other', (byCat.get(r.category ?? 'Other') ?? 0) + Number(r.amount))
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1])
  const prev = addDays(`${month}-01`, -1).slice(0, 7)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Kharche</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">Clinic ke tamam kharche, category ke hisaab se.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/admin/expenses?month=${prev}`} className="rounded-full border border-clinic-teal/20 px-3 py-1">
            ← {prev}
          </Link>
          <span className="rounded-full bg-clinic-teal px-3 py-1 text-white">{month}</span>
          {nextMonth <= today.slice(0, 7) && (
            <Link href={`/admin/expenses?month=${nextMonth}`} className="rounded-full border border-clinic-teal/20 px-3 py-1">
              {nextMonth} →
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-clinic-teal p-4 text-white">
          <p className="text-xs text-white/60">Is mahine ka kul kharcha</p>
          <p className="mt-1 font-display text-xl font-semibold">{money(total)}</p>
        </div>
        {cats.slice(0, 3).map(([name, v]) => (
          <div key={name} className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
            <p className="text-xs text-clinic-ink/50">{name}</p>
            <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">{money(v)}</p>
          </div>
        ))}
      </div>
      {cats.length > 3 && (
        <p className="mt-2 text-xs text-clinic-ink/50">
          Baqi: {cats.slice(3).map(([n, v]) => `${n} ${money(v)}`).join(' · ')}
        </p>
      )}

      <div className="mt-6">
        <ExpenseManager today={today} rows={rows} categories={(catRes.data ?? []) as CategoryRow[]} />
      </div>
    </div>
  )
}

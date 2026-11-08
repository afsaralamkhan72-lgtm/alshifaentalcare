import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAnyPerm } from '@/lib/auth'
import StatCard from '@/components/admin/StatCard'
import { todayKarachi } from '@/lib/karachi'
import SectionTabs from '@/components/admin/SectionTabs'

const pad = (n: number) => String(n).padStart(2, '0')

// Mahine ki pehli aur aakhri tareekh (string se, server ke time-zone se bilkul azaad)
function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` }
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  await requireAnyPerm('reports.view')
  const params = await searchParams
  // Default mahina Karachi ki aaj ki tareekh se (server UTC mein ho to bhi)
  const month = /^\d{4}-\d{2}$/.test(params.month ?? '') ? (params.month as string) : todayKarachi().slice(0, 7)
  const { from, to } = monthBounds(month)

  const supabase = await createClient()

  const [txRes, patientsRes, apptRes, balRes, invRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, category, amount, payment_method, treating_doctor, patient_id')
      .gte('transaction_date', from)
      .lte('transaction_date', to),
    supabase
      .from('patients')
      .select('department, created_at')
      .is('deleted_at', null)
      .gte('created_at', `${from}T00:00:00+05:00`)
      .lte('created_at', `${to}T23:59:59+05:00`),
    supabase
      .from('appointments')
      .select('status')
      .gte('preferred_date', from)
      .lte('preferred_date', to),
    // Kul baqaya: wohi jo Accounts aur Baqaya page par hai (purana aur naya system dono)
    supabase.from('patient_balances').select('patient_id, balance').gt('balance', 0),
    // Is mahine ke bills mein kaun si treatment kitni bani (bill ki raqam ke hisaab se)
    supabase.from('invoices').select('id').gte('invoice_date', from).lte('invoice_date', to).is('voided_at', null).limit(5000),
  ])
  const invIds = (invRes.data ?? []).map((i) => i.id as string)
  const byTreat = new Map<string, { total: number; count: number }>()
  for (let i = 0; i < invIds.length; i += 200) {
    const { data: its } = await supabase.from('invoice_items').select('name, qty, line_total').in('invoice_id', invIds.slice(i, i + 200))
    for (const it of its ?? []) {
      const nm = String(it.name ?? '').trim()
      if (!nm) continue
      const row = byTreat.get(nm) ?? { total: 0, count: 0 }
      row.total += Number(it.line_total) || 0
      row.count += Number(it.qty) || 1
      byTreat.set(nm, row)
    }
  }
  const treatRows = [...byTreat.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total).slice(0, 12)
  const maxTreat = treatRows[0]?.total || 1

  const tx = txRes.data ?? []

  // Doctor-wise earnings, doctor ka naam entry ke waqt likha jata hai
  const doctorTotals = new Map<string, { total: number; patients: Set<string>; entries: number }>()
  for (const t of tx) {
    if (t.type !== 'income') continue
    const key = (t.treating_doctor as string | null)?.trim() || 'Doctor set nahi'
    const row = doctorTotals.get(key) ?? { total: 0, patients: new Set<string>(), entries: 0 }
    row.total += Number(t.amount)
    row.entries += 1
    if (t.patient_id) row.patients.add(t.patient_id)
    doctorTotals.set(key, row)
  }

  const doctorRows = [...doctorTotals.entries()]
    .map(([name, v]) => ({
      id: name,
      name,
      total: v.total,
      cases: v.patients.size,
      entries: v.entries,
    }))
    .sort((a, b) => b.total - a.total)

  const maxDoctor = doctorRows[0]?.total ?? 1
  const income = tx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = tx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  // Income grouped by category, shows which treatments actually earn
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
  // Recycle bin wale patients ka baqaya Dues list mein nahi aata, is liye yahan bhi alag rakha (dono hisaab barabar)
  const balRows = (balRes.data ?? []) as { patient_id: string; balance: number }[]
  const { data: binRows } = balRows.length
    ? await supabase.from('patients').select('id').not('deleted_at', 'is', null).in('id', balRows.map((r) => r.patient_id))
    : { data: [] as { id: string }[] }
  const binIds = new Set((binRows ?? []).map((r) => r.id))
  const dueTotal = balRows.filter((r) => !binIds.has(r.patient_id)).reduce((s, r) => s + Number(r.balance), 0)
  const binDue = balRows.filter((r) => binIds.has(r.patient_id)).reduce((s, r) => s + Number(r.balance), 0)

  const maxCat = categories[0]?.[1] ?? 1

  const label = `${MONTHS[Number(month.split('-')[1]) - 1]} ${month.split('-')[0]}`

  return (
    <div>
      <SectionTabs which="reports" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Mahine ki Report</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">{label}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/reports?month=${shiftMonth(month, -1)}`}
            className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
          >
            ← Pichla
          </Link>
          <Link
            href={`/admin/reports?month=${shiftMonth(month, 1)}`}
            className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
          >
            Agla →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Income (wasooli)" value={`Rs. ${income.toLocaleString()}`} accent="green" />
        <StatCard label="Kharche" value={`Rs. ${expense.toLocaleString()}`} accent="red" />
        <StatCard
          label="Munafa"
          value={`Rs. ${(income - expense).toLocaleString()}`}
          accent={income - expense >= 0 ? 'teal' : 'red'}
        />
        <StatCard label="Naye patients" value={String(newPatients.length)} accent="teal" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Dental patients</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            {newPatients.filter((p) => p.department === 'dental').length}
          </p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Homeopathic patients</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            {newPatients.filter((p) => p.department === 'homeopathic').length}
          </p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Appointments (poori / kul)</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            {appts.filter((a) => a.status === 'completed').length} / {appts.length}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700/70">Kul baqaya (patients se lena hai)</p>
          <p className="mt-1 font-display text-lg font-semibold text-amber-700">
            Rs. {dueTotal.toLocaleString()}
          </p>
          {binDue > 0 && <p className="mt-1 text-[11px] text-amber-800">+ Rs. {binDue.toLocaleString()} recycle bin wale patients ka (Dues list mein nahi)</p>}
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-clinic-teal/10 bg-white p-6">
        <p className="font-display font-semibold text-clinic-ink">Treatment ke hisaab se kaam (bill)</p>
        <p className="mt-1 text-sm text-clinic-ink/60">Is mahine ke bills mein kaun si treatment kitni hui aur kitne ki bani.</p>
        {treatRows.length === 0 ? (
          <p className="mt-4 text-sm text-clinic-ink/50">Is mahine koi bill nahi bana.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {treatRows.map((t) => (
              <div key={t.name}>
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium text-clinic-ink">{t.name}</span>
                  <span className="text-clinic-ink">
                    Rs. {t.total.toLocaleString()}
                    <span className="ml-2 text-xs text-clinic-ink/60">{t.count} baar</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-clinic-mint">
                  <div className="h-full rounded-full bg-clinic-teal" style={{ width: `${Math.max(4, (t.total / maxTreat) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-clinic-teal/10 bg-white p-6">
        <p className="font-display font-semibold text-clinic-ink">Doctor ke hisaab se income</p>
        <p className="mt-1 text-sm text-clinic-ink/60">
          Kis doctor ne kitna kamaya aur kitne patients dekhe.
        </p>

        {doctorRows.length === 0 ? (
          <p className="mt-4 text-sm text-clinic-ink/50">Is mahine koi income record nahi hui.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {doctorRows.map((d) => (
              <div key={d.id}>
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium text-clinic-ink">{d.name}</span>
                  <span className="text-clinic-ink">
                    Rs. {d.total.toLocaleString()}
                    <span className="ml-2 text-xs text-clinic-ink/60">
                      {d.cases} patients · {d.entries} payments
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-clinic-mint">
                  <div
                    className="h-full rounded-full bg-clinic-teal"
                    style={{ width: `${Math.max(4, (d.total / maxDoctor) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Income by category with simple bars */}
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
          <p className="font-display font-semibold text-clinic-ink">Income, category ke hisaab se</p>
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
          <p className="font-display font-semibold text-clinic-ink">Kharche, category ke hisaab se</p>
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

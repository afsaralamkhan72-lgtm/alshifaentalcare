import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/admin/StatCard'
import { toInternationalPKNumber } from '@/lib/whatsapp'
import { getStaffProfile, isOwnerRole } from '@/lib/auth'
import OwnerToday from '@/components/admin/OwnerToday'
import { todayKarachi } from '@/lib/karachi'

function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}` }
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function getDashboardStats(month: string, canSeeMoney: boolean) {
  const supabase = await createClient()
  const { start: monthStart, end: monthEnd } = monthBounds(month)

  const [totalRes, dentalRes, homeoRes, incomeRes, expenseRes, pendingRes] = await Promise.all([
    supabase.from('patients').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('patients').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('department', 'dental'),
    supabase.from('patients').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('department', 'homeopathic'),
    canSeeMoney
      ? supabase
          .from('transactions')
          .select('amount, treatment_name, category, patient_id')
          .eq('type', 'income')
          .gte('transaction_date', monthStart)
          .lte('transaction_date', monthEnd)
      : Promise.resolve({ data: [] as { amount: number; treatment_name: string | null; category: string | null; patient_id: string | null }[] }),
    canSeeMoney
      ? supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'expense')
          .gte('transaction_date', monthStart)
          .lte('transaction_date', monthEnd)
      : Promise.resolve({ data: [] as { amount: number }[] }),
    supabase
      .from('appointments')
      .select('id, patient_name, phone, department, treatment_name, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Baqaya payments jo aaj ya us se pehle due hain
  const todayStr = todayKarachi()
  const { data: dueRows } = canSeeMoney
    ? await supabase
        .from('transactions')
        .select('balance_due, due_date, patients(full_name)')
        .gt('balance_due', 0)
        .is('settled_at', null)
        .lte('due_date', todayStr)
        .order('due_date', { ascending: true })
    : { data: [] }

  const dues = (dueRows ?? []) as unknown as {
    balance_due: number
    patients: { full_name: string } | null
  }[]
  const dueAmount = dues.reduce((sum, d) => sum + Number(d.balance_due), 0)

  const incomeRows = incomeRes.data ?? []
  const income = incomeRows.reduce((sum, t) => sum + Number(t.amount), 0)

  // Kaunsa treatment kitna chala aur kitna kamaya
  const byTreatment = new Map<string, { total: number; count: number }>()
  for (const t of incomeRows) {
    const raw = (t.treatment_name as string | null)?.trim()
    if (!raw) continue
    // "RCT (baqaya)" aur "RCT (advance)" ko aik hi ginein
    const name = raw.replace(/\s*\((baqaya|advance|month \d+)\)\s*/i, '').trim()
    if (!name) continue
    const row = byTreatment.get(name) ?? { total: 0, count: 0 }
    row.total += Number(t.amount)
    row.count += 1
    byTreatment.set(name, row)
  }

  const treatments = [...byTreatment.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // Dental vs Homeopathic income
  const patientIds = [...new Set(incomeRows.map((t) => t.patient_id).filter(Boolean))]
  let deptIncome = { dental: 0, homeopathic: 0, other: 0 }

  if (patientIds.length > 0) {
    const { data: pts } = await supabase
      .from('patients')
      .select('id, department')
      .in('id', patientIds as string[])

    const deptById = new Map((pts ?? []).map((p) => [p.id, p.department]))
    for (const t of incomeRows) {
      const dept = t.patient_id ? deptById.get(t.patient_id as string) : null
      if (dept === 'dental') deptIncome.dental += Number(t.amount)
      else if (dept === 'homeopathic') deptIncome.homeopathic += Number(t.amount)
      else deptIncome.other += Number(t.amount)
    }
  } else {
    deptIncome.other = income
  }
  let expense = expenseRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0
  let incomeTotal = income
  // Phase 9: poore mahine ka total database se (select ki 1000 rows ki hadd se bachne ke liye)
  if (canSeeMoney) {
    const { data: rep } = await supabase.rpc('report_summary', { p_from: monthStart, p_to: monthEnd })
    if (rep) {
      incomeTotal = Number((rep as { income: number }).income)
      expense = Number((rep as { expense: number }).expense)
    }
  }

  return {
    totalPatients: totalRes.count ?? 0,
    dentalCount: dentalRes.count ?? 0,
    homeoCount: homeoRes.count ?? 0,
    income: incomeTotal,
    expense,
    pendingAppointments: pendingRes.data ?? [],
    dues,
    dueAmount,
    treatments,
    deptIncome,
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams
  const currentMonth = todayKarachi().slice(0, 7)
  const month = /^\d{4}-\d{2}$/.test(params.month ?? '') ? (params.month as string) : currentMonth

  const profile = await getStaffProfile()
  const canSeeMoney = isOwnerRole(profile.role)
  const stats = await getDashboardStats(month, canSeeMoney)

  // Samaan ke alerts: kam stock aur 30 din mein expiry (sab staff ke liye, is mein paisa nahi)
  const supabaseAlerts = await createClient()
  const { data: stockRows } = await supabaseAlerts
    .from('inventory')
    .select('item_name, quantity, unit, reorder_level, expiry_date')
  const { data: offRows } = await supabaseAlerts.from('inventory').select('item_name').eq('is_active', false)
  const offNames = new Set((offRows ?? []).map((r) => r.item_name))
  const liveStock = (stockRows ?? []).filter((r) => !offNames.has(r.item_name))
  const lowStock = liveStock.filter((r) => Number(r.quantity) <= Number(r.reorder_level))
  const expiring = liveStock.filter(
    (r) => r.expiry_date && (new Date(r.expiry_date).getTime() - Date.now()) / 86_400_000 <= 30
  )
  const { dues, dueAmount } = stats

  const monthLabel = new Date(`${month}-01`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
  const isCurrentMonth = month === currentMonth

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">Clinic overview, {monthLabel}.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/dashboard?month=${shiftMonth(month, -1)}`}
            className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm text-clinic-ink/70"
          >
            ← Pichla
          </Link>
          <form className="flex items-center gap-2">
            <input
              type="month"
              name="month"
              defaultValue={month}
              className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-clinic-teal px-3 py-2 text-sm font-semibold text-white">
              Dekhein
            </button>
          </form>
          <Link
            href={`/admin/dashboard?month=${shiftMonth(month, 1)}`}
            className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm text-clinic-ink/70"
          >
            Agla →
          </Link>
          {!isCurrentMonth && (
            <Link
              href="/admin/dashboard"
              className="rounded-lg bg-clinic-mint px-3 py-2 text-sm font-semibold text-clinic-teal"
            >
              Aaj
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Patients" value={stats.totalPatients} />
        <StatCard label="Dental Patients" value={stats.dentalCount} accent="teal" />
        <StatCard label="Homeopathic Patients" value={stats.homeoCount} accent="amber" />
        {canSeeMoney && (
          <>
            <StatCard label={`Income (${monthLabel})`} value={`Rs. ${stats.income.toLocaleString()}`} accent="green" />
            <StatCard label={`Expenses (${monthLabel})`} value={`Rs. ${stats.expense.toLocaleString()}`} accent="red" />
          </>
        )}
      </div>

      {canSeeMoney && <OwnerToday />}

      {(lowStock.length > 0 || expiring.length > 0) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {lowStock.length > 0 && (
            <Link href="/admin/inventory" className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">{lowStock.length} samaan khatam hone wala hai</p>
              <p className="mt-1 text-xs text-red-600">
                {lowStock.slice(0, 6).map((i) => `${i.item_name} (${Number(i.quantity)})`).join(', ')}
                {lowStock.length > 6 ? ' ...' : ''}
              </p>
            </Link>
          )}
          {expiring.length > 0 && (
            <Link href="/admin/inventory" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-700">{expiring.length} samaan ki expiry qareeb hai</p>
              <p className="mt-1 text-xs text-amber-600">{expiring.slice(0, 6).map((i) => i.item_name).join(', ')}</p>
            </Link>
          )}
        </div>
      )}

      {/* Income kahan se aa rahi hai */}
      {canSeeMoney && (
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
          <p className="font-display font-semibold text-clinic-ink">
            Kaunsa Treatment Zyada Chal Raha Hai
          </p>
          <p className="mt-1 text-sm text-clinic-ink/60">{monthLabel}</p>

          {stats.treatments.length === 0 ? (
            <p className="mt-4 text-sm text-clinic-ink/50">
              Is mahine treatment ke naam ke sath koi income record nahi hui.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {stats.treatments.map((t) => {
                const max = stats.treatments[0].total || 1
                return (
                  <div key={t.name}>
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-medium text-clinic-ink">{t.name}</span>
                      <span className="text-clinic-ink">
                        Rs. {t.total.toLocaleString()}
                        <span className="ml-2 text-xs text-clinic-ink/60">
                          {t.count} payments
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-clinic-mint">
                      <div
                        className="h-full rounded-full bg-clinic-teal"
                        style={{ width: `${Math.max(4, (t.total / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
          <p className="font-display font-semibold text-clinic-ink">Income Kis Department Se</p>
          <p className="mt-1 text-sm text-clinic-ink/60">{monthLabel}</p>

          <div className="mt-4 grid gap-3">
            {[
              { label: 'Dental', value: stats.deptIncome.dental, color: 'bg-clinic-teal' },
              {
                label: 'Homeopathic',
                value: stats.deptIncome.homeopathic,
                color: 'bg-clinic-amber',
              },
              {
                label: 'Patient ke bagair (walk-in / general)',
                value: stats.deptIncome.other,
                color: 'bg-clinic-ink/30',
              },
            ].map((d) => {
              const total = stats.income || 1
              return (
                <div key={d.label}>
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="font-medium text-clinic-ink">{d.label}</span>
                    <span className="text-clinic-ink">Rs. {d.value.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-clinic-mint">
                    <div
                      className={`h-full rounded-full ${d.color}`}
                      style={{ width: `${Math.max(2, (d.value / total) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <Link
            href={`/admin/reports?month=${month}`}
            className="mt-4 inline-block text-sm font-semibold text-clinic-teal hover:underline"
          >
            Poori report dekhein →
          </Link>
        </section>
      </div>
      )}

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Pending Appointment Requests</h2>

        {stats.pendingAppointments.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-clinic-mint text-left text-clinic-ink/60">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Treatment</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {stats.pendingAppointments.map((a) => (
                  <tr key={a.id} className="border-t border-clinic-teal/10">
                    <td className="px-4 py-2">{a.patient_name}</td>
                    <td className="px-4 py-2">{a.phone}</td>
                    <td className="px-4 py-2 capitalize">{a.department ?? '—'}</td>
                    <td className="px-4 py-2">{a.treatment_name ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <a
                        href={`https://wa.me/${toInternationalPKNumber(a.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-whatsapp px-3 py-1 text-xs font-semibold text-white"
                      >
                        WhatsApp
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-clinic-ink/50">No pending appointment requests.</p>
        )}
      </div>
    </div>
  )
}

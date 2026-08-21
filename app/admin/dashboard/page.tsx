import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/admin/StatCard'
import { toInternationalPKNumber } from '@/lib/whatsapp'

function firstDayOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

async function getDashboardStats() {
  const supabase = await createClient()
  const monthStart = firstDayOfMonth()

  const [totalRes, dentalRes, homeoRes, incomeRes, expenseRes, pendingRes] = await Promise.all([
    supabase.from('patients').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('patients').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('department', 'dental'),
    supabase.from('patients').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('department', 'homeopathic'),
    supabase.from('transactions').select('amount').eq('type', 'income').gte('transaction_date', monthStart),
    supabase.from('transactions').select('amount').eq('type', 'expense').gte('transaction_date', monthStart),
    supabase
      .from('appointments')
      .select('id, patient_name, phone, department, treatment_name, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Baqaya payments jo aaj ya us se pehle due hain
  const todayStr = new Date().toISOString().slice(0, 10)
  const { data: dueRows } = await supabase
    .from('transactions')
    .select('balance_due, due_date, patients(full_name)')
    .gt('balance_due', 0)
    .is('settled_at', null)
    .lte('due_date', todayStr)
    .order('due_date', { ascending: true })

  const dues = (dueRows ?? []) as unknown as {
    balance_due: number
    patients: { full_name: string } | null
  }[]
  const dueAmount = dues.reduce((sum, d) => sum + Number(d.balance_due), 0)

  const income = incomeRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0
  const expense = expenseRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0

  return {
    totalPatients: totalRes.count ?? 0,
    dentalCount: dentalRes.count ?? 0,
    homeoCount: homeoRes.count ?? 0,
    income,
    expense,
    pendingAppointments: pendingRes.data ?? [],
    dues,
    dueAmount,
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const { dues, dueAmount } = stats

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">Clinic overview.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Patients" value={stats.totalPatients} />
        <StatCard label="Dental Patients" value={stats.dentalCount} accent="teal" />
        <StatCard label="Homeopathic Patients" value={stats.homeoCount} accent="amber" />
        <StatCard label="Income (This Month)" value={`Rs. ${stats.income.toLocaleString()}`} accent="green" />
        <StatCard label="Expenses (This Month)" value={`Rs. ${stats.expense.toLocaleString()}`} accent="red" />
      </div>

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

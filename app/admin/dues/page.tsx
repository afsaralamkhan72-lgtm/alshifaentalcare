import { createClient } from '@/lib/supabase/server'
import DuesList, { type DueRow } from '@/components/admin/DuesList'

export default async function DuesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id, treatment_name, rate, discount_amount, amount, balance_due, due_date, transaction_date, treating_doctor, patients(id, full_name, phone, mr_number, portal_code, deleted_at)'
    )
    .gt('balance_due', 0)
    .is('settled_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Baqaya Payments</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase mein nayi <strong>SETUP-ALL.sql</strong> chalayein.
          </p>
        </div>
      </div>
    )
  }

  const rows = ((data ?? []) as unknown as DueRow[]).filter(
    (r) => r.patients && !r.patients.deleted_at
  )

  const today = new Date().toISOString().slice(0, 10)
  const overdue = rows.filter((r) => r.due_date && r.due_date < today)
  const dueToday = rows.filter((r) => r.due_date === today)
  const upcoming = rows.filter((r) => r.due_date && r.due_date > today)
  const noDate = rows.filter((r) => !r.due_date)

  const totalOutstanding = rows.reduce((s, r) => s + Number(r.balance_due), 0)
  const overdueAmount = overdue.reduce((s, r) => s + Number(r.balance_due), 0)

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Baqaya Payments</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Jin patients ke paise baqi hain aur kab tak dene hain.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-700/80">Overdue</p>
          <p className="mt-1 font-display text-2xl font-semibold text-red-700">{overdue.length}</p>
          <p className="mt-0.5 text-xs text-red-700/80">Rs. {overdueAmount.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-700/80">Aaj Due</p>
          <p className="mt-1 font-display text-2xl font-semibold text-amber-700">
            {dueToday.length}
          </p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs font-medium text-clinic-ink/70">Aane Wale</p>
          <p className="mt-1 font-display text-2xl font-semibold text-clinic-ink">
            {upcoming.length}
          </p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs font-medium text-clinic-ink/70">Kul Baqaya</p>
          <p className="mt-1 font-display text-2xl font-semibold text-clinic-teal">
            Rs. {totalOutstanding.toLocaleString()}
          </p>
        </div>
      </div>

      {overdue.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-lg font-semibold text-red-700">
            Overdue ({overdue.length})
          </h2>
          <DuesList rows={overdue} tone="overdue" />
        </>
      )}

      {dueToday.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-lg font-semibold text-amber-700">
            Aaj Due ({dueToday.length})
          </h2>
          <DuesList rows={dueToday} tone="today" />
        </>
      )}

      <h2 className="mt-8 font-display text-lg font-semibold text-clinic-ink">
        Aane Wale ({upcoming.length})
      </h2>
      <DuesList rows={upcoming} />

      {noDate.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-lg font-semibold text-clinic-ink">
            Date Set Nahi ({noDate.length})
          </h2>
          <DuesList rows={noDate} />
        </>
      )}
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import RecallList, { type RecallRow } from '@/components/admin/RecallList'
import DormantList, { type DormantPatient } from '@/components/admin/DormantList'

export default async function RecallPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().slice(0, 10)
  const in60 = new Date()
  in60.setDate(in60.getDate() + 60)
  const horizon = in60.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('recalls')
    .select('id, recall_type, interval_months, last_done, next_due, reminders_sent, last_reminded, patients(id, full_name, phone, mr_number, deleted_at)')
    .eq('status', 'active')
    .lte('next_due', horizon)
    .order('next_due', { ascending: true })

  if (error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Recall</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase → SQL Editor mein <strong>phase6.sql</strong> chalayein.
          </p>
        </div>
      </div>
    )
  }

  // Drop recalls whose patient is in the recycle bin
  const rows = ((data ?? []) as unknown as RecallRow[]).filter(
    (r) => r.patients && !r.patients.deleted_at
  )

  const overdue = rows.filter((r) => r.next_due < today)
  const dueSoon = rows.filter((r) => r.next_due >= today)

  // Dormant: patients with no visit in the last 6 months (or ever)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const cutoff = sixMonthsAgo.toISOString().slice(0, 10)

  const { data: allPatients } = await supabase
    .from('patients')
    .select('id, full_name, phone, mr_number, created_at')
    .is('deleted_at', null)

  const { data: recentVisits } = await supabase
    .from('visit_notes')
    .select('patient_id, visit_date')
    .gte('visit_date', cutoff)

  const activeIds = new Set((recentVisits ?? []).map((v) => v.patient_id))

  const dormant = ((allPatients ?? []) as DormantPatient[])
    .filter((p) => !activeIds.has(p.id) && p.created_at.slice(0, 10) < cutoff)
    .slice(0, 50)

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Recall</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Jin patients ko dobara bulana hai — scaling, check-up, ortho review.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-700/70">Overdue</p>
          <p className="mt-1 font-display text-2xl font-semibold text-red-700">{overdue.length}</p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Agle 60 din</p>
          <p className="mt-1 font-display text-2xl font-semibold text-clinic-ink">{dueSoon.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700/70">6 mahine se ghayab</p>
          <p className="mt-1 font-display text-2xl font-semibold text-amber-700">{dormant.length}</p>
        </div>
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold text-red-700">
        Overdue ({overdue.length})
      </h2>
      <RecallList rows={overdue} overdue />

      <h2 className="mt-8 font-display text-lg font-semibold text-clinic-ink">
        Agle 60 din ({dueSoon.length})
      </h2>
      <RecallList rows={dueSoon} />

      <h2 className="mt-10 font-display text-lg font-semibold text-clinic-ink">
        6 Mahine Se Nahi Aaye
      </h2>
      <p className="mt-1 text-sm text-clinic-ink/60">
        In ka koi visit record nahi hua. Aik WhatsApp message inhein wapas laa sakta hai.
      </p>
      <DormantList patients={dormant} />
    </div>
  )
}

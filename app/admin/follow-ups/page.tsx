import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FollowUpActions from '@/components/admin/FollowUpActions'

interface VisitRow {
  id: string
  patient_id: string
  visit_date: string
  procedure: string | null
  notes: string | null
  next_visit: string | null
  patients: { full_name: string; phone: string; mr_number: string | null } | null
}

export default async function FollowUpsPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date()
  in30.setDate(in30.getDate() + 30)
  const horizon = in30.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('visit_notes')
    .select('id, patient_id, visit_date, procedure, notes, next_visit, patients(full_name, phone, mr_number)')
    .not('next_visit', 'is', null)
    .lte('next_visit', horizon)
    .order('next_visit', { ascending: true })

  // phase2.sql not run yet
  if (error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Follow-ups</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase → SQL Editor mein <strong>phase2.sql</strong> chalayein. Us ke baad ye page
            kaam karega.
          </p>
        </div>
      </div>
    )
  }

  const rows = (data ?? []) as unknown as VisitRow[]
  const overdue = rows.filter((r) => r.next_visit! < today)
  const upcoming = rows.filter((r) => r.next_visit! >= today)

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Follow-ups</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Jin patients ka agla visit due hai — RCT checkup, braces tightening, wire change.
      </p>

      {overdue.length > 0 && (
        <>
          <h2 className="mt-6 font-display text-lg font-semibold text-red-700">
            Overdue ({overdue.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {overdue.map((r) => (
              <FollowUpRow key={r.id} row={r} overdue />
            ))}
          </div>
        </>
      )}

      <h2 className="mt-8 font-display text-lg font-semibold text-clinic-ink">
        Agle 30 din ({upcoming.length})
      </h2>
      <div className="mt-3 grid gap-3">
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/50">
            Koi follow-up due nahi. Patient ke profile mein visit note likhte waqt &quot;Next
            visit&quot; date daalein — wo yahan aa jayega.
          </div>
        ) : (
          upcoming.map((r) => <FollowUpRow key={r.id} row={r} />)
        )}
      </div>
    </div>
  )
}

function FollowUpRow({ row, overdue = false }: { row: VisitRow; overdue?: boolean }) {
  const patient = row.patients

  return (
    <div
      className={`rounded-2xl border bg-white p-4 ${
        overdue ? 'border-red-200' : 'border-clinic-teal/10'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/admin/patients/${row.patient_id}`}
            className="font-medium text-clinic-ink hover:text-clinic-teal"
          >
            {patient?.full_name ?? 'Unknown'}
          </Link>
          <p className="text-xs text-clinic-ink/50">
            {patient?.mr_number} · {patient?.phone}
          </p>
          <p className="mt-1 text-sm text-clinic-ink/70">
            {row.procedure ?? 'Visit'} —{' '}
            {new Date(row.visit_date).toLocaleDateString('en-GB')}
          </p>
          {row.notes && <p className="mt-1 text-xs text-clinic-ink/50">{row.notes}</p>}
        </div>

        <div className="text-right">
          <p className="text-xs text-clinic-ink/50">Next visit</p>
          <p
            className={`font-display font-semibold ${
              overdue ? 'text-red-700' : 'text-clinic-teal'
            }`}
          >
            {new Date(row.next_visit!).toLocaleDateString('en-GB')}
          </p>
        </div>
      </div>

      {patient && (
        <div className="mt-3 border-t border-clinic-teal/10 pt-3">
          <FollowUpActions
            patientName={patient.full_name}
            patientPhone={patient.phone}
            nextVisit={row.next_visit!}
            procedure={row.procedure ?? 'checkup'}
          />
        </div>
      )}
    </div>
  )
}

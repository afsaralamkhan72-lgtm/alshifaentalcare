import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppointmentBoard, { type Appointment } from '@/components/admin/AppointmentBoard'

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>
}) {
  const params = await searchParams
  const date = params.date || new Date().toISOString().slice(0, 10)
  const status = params.status || 'all'

  const supabase = await createClient()

  let query = supabase
    .from('appointments')
    .select('id, patient_name, phone, department, treatment_name, preferred_date, preferred_time, status, created_at')
    .is('deleted_at', null)
    .eq('preferred_date', date)
    .order('preferred_time', { ascending: true })

  if (status !== 'all') query = query.eq('status', status)

  const { data } = await query
  const appointments = (data ?? []) as Appointment[]

  // Counts for the whole day regardless of filter
  const { data: allDay } = await supabase
    .from('appointments')
    .select('status')
    .is('deleted_at', null)
    .eq('preferred_date', date)

  const counts = {
    all: allDay?.length ?? 0,
    pending: allDay?.filter((a) => a.status === 'pending').length ?? 0,
    confirmed: allDay?.filter((a) => a.status === 'confirmed').length ?? 0,
    completed: allDay?.filter((a) => a.status === 'completed').length ?? 0,
  }

  const isToday = date === new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Appointments</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">
            {isToday ? 'Aaj' : new Date(date).toLocaleDateString('en-GB')} ka schedule
          </p>
        </div>
        <AppointmentBoard appointments={appointments} />
      </div>

      {/* Day navigation */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/admin/appointments?date=${shiftDate(date, -1)}&status=${status}`}
          className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm text-clinic-ink/70"
        >
          ← Previous
        </Link>
        <form className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
          />
          <input type="hidden" name="status" value={status} />
          <button className="rounded-lg bg-clinic-teal px-3 py-2 text-sm font-semibold text-white">
            Go
          </button>
        </form>
        <Link
          href={`/admin/appointments?date=${shiftDate(date, 1)}&status=${status}`}
          className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm text-clinic-ink/70"
        >
          Next →
        </Link>
        {!isToday && (
          <Link
            href="/admin/appointments"
            className="rounded-lg bg-clinic-mint px-3 py-2 text-sm font-semibold text-clinic-teal"
          >
            Today
          </Link>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(['all', 'pending', 'confirmed', 'completed'] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/appointments?date=${date}&status=${s}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
              status === s
                ? 'bg-clinic-teal text-white'
                : 'bg-white text-clinic-ink/60 border border-clinic-teal/10'
            }`}
          >
            {s} ({counts[s]})
          </Link>
        ))}
      </div>
    </div>
  )
}

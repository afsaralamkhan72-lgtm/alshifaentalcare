import { requirePerm } from '@/lib/auth'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppointmentBoard, { type Appointment } from '@/components/admin/AppointmentBoard'
import { todayKarachi, addDays } from '@/lib/karachi'
import { getReminderDays } from '@/lib/reminders'
import { getStaffProfile, isOwnerRole } from '@/lib/auth'

const SELECT = 'id, patient_name, phone, department, treatment_name, preferred_date, preferred_time, status, created_at, patient_id, doctor, source'

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string; view?: string }>
}) {
  await requirePerm('appointments.view')
  const params = await searchParams
  const today = todayKarachi()
  const days = await getReminderDays()
  const staff = await getStaffProfile()
  const VIEWS = [
    { k: 'today', l: 'Aaj' },
    { k: 'next', l: `Agle ${days} din` },
    { k: 'upcoming', l: 'Aage ki sab' },
    { k: 'missed', l: 'Nahi aaye' },
    { k: 'requests', l: 'Website requests' },
    { k: 'day', l: 'Din chunein' },
  ]
  const view = VIEWS.some((v) => v.k === params.view) ? (params.view as string) : params.date ? 'day' : 'today'

  if (view !== 'day') {
    const sb = await createClient()
    let q = sb.from('appointments').select(SELECT).is('deleted_at', null)
    if (view === 'today') q = q.eq('preferred_date', today).neq('status', 'cancelled')
    if (view === 'next') q = q.gt('preferred_date', today).lte('preferred_date', addDays(today, days)).in('status', ['pending', 'confirmed'])
    if (view === 'upcoming') q = q.gt('preferred_date', today).in('status', ['pending', 'confirmed'])
    if (view === 'missed') q = q.lt('preferred_date', today).gte('preferred_date', addDays(today, -60)).in('status', ['pending', 'confirmed'])
    if (view === 'requests') q = q.eq('status', 'pending')
    const { data: rows, error } = await q
      .order('preferred_date', { ascending: view !== 'missed' })
      .order('preferred_time', { ascending: true })
      .limit(300)
    const counts = await Promise.all(
      [
        sb.from('appointments').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('preferred_date', today).neq('status', 'cancelled'),
        sb.from('appointments').select('id', { count: 'exact', head: true }).is('deleted_at', null).gt('preferred_date', today).lte('preferred_date', addDays(today, days)).in('status', ['pending', 'confirmed']),
        sb.from('appointments').select('id', { count: 'exact', head: true }).is('deleted_at', null).lt('preferred_date', today).gte('preferred_date', addDays(today, -60)).in('status', ['pending', 'confirmed']),
        sb.from('appointments').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending'),
      ]
    )
    const badge: Record<string, number | null> = { today: counts[0].count, next: counts[1].count, missed: counts[2].count, requests: counts[3].count }
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Appointments</h1>
          <AppointmentBoard appointments={[]} listOnly showButton emptyText="" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <Link
              key={v.k}
              href={`/admin/appointments?view=${v.k}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${view === v.k ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/15 bg-white text-clinic-ink/70'}`}
            >
              {v.l}
              {badge[v.k] ? <span className={`ml-1.5 rounded-full px-1.5 text-xs ${v.k === 'missed' && view !== v.k ? 'bg-red-100 text-red-700' : 'bg-white/30'}`}>{badge[v.k]}</span> : null}
            </Link>
          ))}
        </div>
        {view === 'missed' && <p className="mt-3 text-sm text-amber-800">Pichle 60 din ki appointments jo na &quot;Aa gaye&quot; hui na cancel. Call / WhatsApp kar ke nayi tareekh dein.</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error.message}</p>}
        <div className="mt-4">
          <AppointmentBoard appointments={(rows ?? []) as Appointment[]} listOnly showButton={false} emptyText="Is list mein koi appointment nahi." />
        </div>
      </div>
    )
  }

  const date = params.date || todayKarachi()
  const status = params.status || 'all'

  const supabase = await createClient()

  let query = supabase
    .from('appointments')
    .select(SELECT)
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
    arrived: allDay?.filter((a) => a.status === 'arrived').length ?? 0,
    completed: allDay?.filter((a) => a.status === 'completed').length ?? 0,
  }

  const isToday = date === todayKarachi()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Appointments</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">
            {isToday ? 'Aaj' : new Date(date).toLocaleDateString('en-GB')} ka schedule ·{' '}
            <Link href="/admin/appointments" className="font-semibold text-clinic-teal">
              ← Aaj / agle din / nahi aaye
            </Link>
          </p>
        </div>
        <AppointmentBoard appointments={appointments} />
      </div>

      {/* Day navigation */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/admin/appointments?view=day&date=${shiftDate(date, -1)}&status=${status}`}
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
          <input type="hidden" name="view" value="day" />
          <button className="rounded-lg bg-clinic-teal px-3 py-2 text-sm font-semibold text-white">
            Go
          </button>
        </form>
        <Link
          href={`/admin/appointments?view=day&date=${shiftDate(date, 1)}&status=${status}`}
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
        {(['all', 'pending', 'confirmed', 'arrived', 'completed'] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/appointments?view=day&date=${date}&status=${s}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
              status === s
                ? 'bg-clinic-teal text-white'
                : 'bg-white text-clinic-ink/60 border border-clinic-teal/10'
            }`}
          >
            {s === 'arrived' ? 'intezar' : s} ({counts[s]})
          </Link>
        ))}
      </div>
    </div>
  )
}

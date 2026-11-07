import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import { todayKarachi } from '@/lib/karachi'
import { type DayRow, type LeaveType, type ReqRow, type Rules, nextPayDay } from '@/lib/attendanceUi'
import AttendanceToday from '@/components/admin/AttendanceToday'
import AttendanceMonth, { type CalcRow } from '@/components/admin/AttendanceMonth'
import AttendanceSettings, { type ClosedDay, type ProfileOpt, type StaffSet } from '@/components/admin/AttendanceSettings'

export const dynamic = 'force-dynamic'

const TABS = [
  { k: 'aaj', l: 'Aaj / roz ki hazri' },
  { k: 'mahina', l: 'Mahine ka hisab' },
  { k: 'qaide', l: 'Qaide aur settings' },
]

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ d?: string; m?: string; t?: string }> }) {
  await requireOwner()
  const sp = await searchParams
  const today = todayKarachi()
  const tab = TABS.some((x) => x.k === sp.t) ? (sp.t as string) : 'aaj'
  const date = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) && sp.d <= today ? sp.d : today
  const period = sp.m && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m) ? sp.m : date.slice(0, 7)
  const supabase = await createClient()

  const rulesRes = await supabase.from('attendance_rules').select('*').eq('id', 1).maybeSingle()
  if (rulesRes.error || !rulesRes.data || !('shift_end' in rulesRes.data)) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Staff ki hazri</h1>
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Pehle <strong>al-shifa-FINAL-SQL.sql</strong> Supabase SQL Editor mein chalayein (is mein FINAL45 shamil hai).
        </p>
      </div>
    )
  }
  const raw = rulesRes.data as Record<string, unknown>
  const rules: Rules = {
    work_start: String(raw.work_start),
    shift_end: String(raw.shift_end),
    grace_minutes: Number(raw.grace_minutes),
    weekly_off: (raw.weekly_off as number[]) ?? [],
    late_from: raw.late_from as Rules['late_from'],
    cut_late: !!raw.cut_late,
    early_cut: !!raw.early_cut,
    absent_cut: !!raw.absent_cut,
    overtime_on: !!raw.overtime_on,
    overtime_mult: Number(raw.overtime_mult),
    overtime_min: Number(raw.overtime_min),
    pay_day: raw.pay_day == null ? null : Number(raw.pay_day),
    remind_days: Number(raw.remind_days),
    clinic_lat: raw.clinic_lat == null ? null : Number(raw.clinic_lat),
    clinic_lng: raw.clinic_lng == null ? null : Number(raw.clinic_lng),
    radius_m: Number(raw.radius_m),
    require_location: !!raw.require_location,
    device_hash: (raw.device_hash as string | null) ?? null,
  }

  const pay = nextPayDay(today, rules.pay_day)
  const showPay = pay && pay.daysLeft <= rules.remind_days

  return (
    <div>
      <Link href="/admin/payroll" className="mb-2 inline-block text-sm text-clinic-ink/50 hover:text-clinic-teal">← Salary</Link>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Staff ki hazri</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">Aane / jaane ka waqt, mohlat, late, overtime, band din, aur salary minute ke hisab se.</p>

      {showPay && pay && (
        <Link href="/admin/payroll" className="mt-3 block rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Tankhwah ki tareekh {pay.daysLeft === 0 ? 'aaj hai' : `${pay.daysLeft} din baad hai`} ({pay.date}). Salary page kholein →
        </Link>
      )}

      <nav className="mt-4 flex flex-wrap gap-2">
        {TABS.map((x) => (
          <Link key={x.k} href={`/admin/attendance?t=${x.k}`} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === x.k ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/30 text-clinic-teal'}`}>
            {x.l}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        {tab === 'aaj' && (await TodayTab({ date, today, rules }))}
        {tab === 'mahina' && (await MonthTab({ period, today }))}
        {tab === 'qaide' && (await SettingsTab({ rules, today }))}
      </div>
    </div>
  )
}

async function TodayTab({ date, today, rules }: { date: string; today: string; rules: Rules }) {
  const supabase = await createClient()
  const [dayRes, ltRes, reqRes, susRes] = await Promise.all([
    supabase.rpc('attendance_day_view', { p_date: date }),
    supabase.from('leave_types').select('id, name, paid, yearly_quota, active').order('created_at'),
    supabase
      .from('attendance_requests')
      .select('id, staff_id, att_date, kind, req_time, reason, created_at, staff_members(full_name)')
      .eq('status', 'pending')
      .order('created_at'),
    supabase.rpc('clinic_closed_suspects'),
  ])
  if (dayRes.error) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{dayRes.error.message}</p>
  // Jin mahinon ki salary tayyar (lock) ho chuki hai un ke din badal nahi sakte, is liye un par sawal nahi
  const lockedRes = await supabase.from('payroll_periods').select('period')
  const locked = new Set(((lockedRes.data ?? []) as { period: string }[]).map((x) => x.period))
  const suspectDays = ((susRes.data ?? []) as { day: string }[]).map((x) => x.day).filter((d) => !locked.has(d.slice(0, 7)))
  return (
    <AttendanceToday
      date={date}
      today={today}
      rows={(dayRes.data ?? []) as DayRow[]}
      leaveTypes={(ltRes.data ?? []) as LeaveType[]}
      requests={(reqRes.data ?? []) as unknown as ReqRow[]}
      suspects={suspectDays}
      graceMin={rules.grace_minutes}
    />
  )
}

async function MonthTab({ period, today }: { period: string; today: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('payroll_calc', { p_period: period })
  if (error) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error.message}</p>
  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const o: Record<string, unknown> = { ...r }
    for (const k of ['monthly_salary', 'entitled', 'cut_late', 'cut_early', 'cut_absent', 'cut_total', 'ot_amount', 'net', 'rate_per_min']) {
      if (o[k] != null) o[k] = Number(o[k])
    }
    return o as unknown as CalcRow
  })
  return <AttendanceMonth period={period} today={today} rows={rows} />
}

async function SettingsTab({ rules, today }: { rules: Rules; today: string }) {
  const supabase = await createClient()
  const [ltRes, stRes, prRes, cdRes] = await Promise.all([
    supabase.from('leave_types').select('id, name, paid, yearly_quota, active').order('created_at'),
    supabase
      .from('staff_members')
      .select('id, full_name, title, joined_on, shift_start, shift_end, weekly_off, attendance_on, profile_id, is_active')
      .order('full_name'),
    supabase.from('staff_profiles').select('id, full_name, role').eq('is_active', true).order('full_name'),
    supabase.from('clinic_days').select('day, closed, reason').gte('day', today).order('day'),
  ])
  return (
    <AttendanceSettings
      rules={rules}
      leaveTypes={(ltRes.data ?? []) as LeaveType[]}
      staff={(stRes.data ?? []) as StaffSet[]}
      profiles={(prRes.data ?? []) as ProfileOpt[]}
      closedDays={(cdRes.data ?? []) as ClosedDay[]}
      today={today}
    />
  )
}

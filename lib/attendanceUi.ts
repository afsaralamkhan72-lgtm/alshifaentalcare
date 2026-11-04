import { CLINIC } from '@/clinic.config'

/** Database (attendance_day_view) se aayi hui aik din ki line */
export interface DayRow {
  staff_id: string
  full_name: string
  title: string | null
  track: boolean
  status: 'present' | 'absent' | 'leave' | 'half' | null
  check_in: string | null
  check_out: string | null
  source: string | null
  late_reason: string | null
  shift_s: string
  shift_e: string
  open_day: boolean
  late_min: number
  early_min: number
  ot_min: number
  leave_name: string | null
  pending_requests: number
}

export interface Rules {
  work_start: string
  shift_end: string
  grace_minutes: number
  weekly_off: number[]
  late_from: 'shift_start' | 'after_grace'
  cut_late: boolean
  early_cut: boolean
  absent_cut: boolean
  overtime_on: boolean
  overtime_mult: number
  overtime_min: number
  pay_day: number | null
  remind_days: number
  clinic_lat: number | null
  clinic_lng: number | null
  radius_m: number
  require_location: boolean
  device_hash: string | null
}

export interface LeaveType {
  id: string
  name: string
  paid: boolean
  yearly_quota: number | null
  active: boolean
}

export interface ReqRow {
  id: string
  staff_id: string
  att_date: string
  kind: 'in' | 'out'
  req_time: string
  reason: string
  created_at: string
  staff_members: { full_name: string } | { full_name: string }[] | null
}

export const DAYS_UR = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumerat', 'Jumma', 'Hafta']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "09:13:45" -> "9:13 AM" */
export function t12(t: string | null | undefined): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return ''
  const ap = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}

/** "09:13:45" -> "09:13" (time input ke liye) */
export const hm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '')

/** 125 -> "2 ghante 5 minute" */
export function dur(min: number): string {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h && r) return `${h} ghante ${r} minute`
  if (h) return `${h} ghante`
  return `${r} minute`
}

export function dateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${DAYS_UR[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** Source ka naam */
export function sourceLabel(s: string | null): string {
  switch (s) {
    case 'self':
      return 'apne phone se'
    case 'device':
      return 'clinic ke phone se'
    case 'request':
      return 'darkhwast se'
    case 'admin':
      return 'admin ne likhi'
    default:
      return ''
  }
}

/** Ek staff ki line, WhatsApp ke liye (tankhwah / katauti ki raqam kabhi nahi) */
export function rowLine(r: DayRow): string {
  if (r.status === 'present' || (r.status === 'half' && r.check_in)) {
    const inn = t12(r.check_in)
    let s = `${r.full_name}: ${inn || (r.status === 'half' ? 'aadha din' : 'hazir')}`
    if (r.status === 'half') s += ' (aadha din)'
    if (r.open_day && r.late_min > 0) s += `, ${r.late_min} minute late`
    else if (r.open_day && inn) s += ', waqt par'
    if (!r.open_day) s += ' (band din ka kaam)'
    if (r.check_out) s += `, gaya ${t12(r.check_out)}`
    return s
  }
  if (r.status === 'half') return `${r.full_name}: aadha din`
  if (r.status === 'leave') return `${r.full_name}: chhutti`
  if (r.status === 'absent') return `${r.full_name}: ghair-hazir`
  return `${r.full_name}: abhi nahi aaya`
}

/** Poori list ka text: WhatsApp group mein bhejne ke liye */
export function shareText(date: string, rows: DayRow[]): string {
  const tracked = rows.filter((r) => r.track)
  const open = tracked.length ? tracked.every((r) => r.open_day) : true
  const head = `${CLINIC.name}\nAaj ki hazri, ${dateLabel(date)}\n`
  if (!open && tracked.every((r) => !r.status)) return `${head}\nAaj clinic band hai.`
  const lines = tracked
    .filter((r) => r.open_day || r.status)
    .map(rowLine)
  return `${head}\n${lines.join('\n')}`
}

export const whatsappShareLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

/** Tankhwah ki agli tareekh aur kitne din baqi (pay_day 1-28) */
export function nextPayDay(today: string, payDay: number | null): { date: string; daysLeft: number } | null {
  if (!payDay) return null
  const [y, m, d] = today.split('-').map(Number)
  let yy = y
  let mm = m
  if (d > payDay) {
    mm += 1
    if (mm > 12) {
      mm = 1
      yy += 1
    }
  }
  const date = `${yy}-${String(mm).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`
  const left = Math.round((Date.UTC(yy, mm - 1, payDay) - Date.UTC(y, m - 1, d)) / 86400000)
  return { date, daysLeft: left }
}

/** Pichhla mahina YYYY-MM */
export function prevMonth(today: string): string {
  const [y, m] = today.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

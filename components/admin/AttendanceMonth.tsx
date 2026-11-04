'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { dur, t12 } from '@/lib/attendanceUi'

export interface CalcRow {
  staff_id: string
  full_name: string
  title: string | null
  monthly_salary: number
  track: boolean
  eff_from: string
  month_min: number
  eff_min: number
  rate_per_min: number | null
  work_days: number
  present: number
  half: number
  absent: number
  leave_paid: number
  leave_unpaid: number
  unmarked: number
  missing_out: number
  late_days: number
  late_min: number
  early_min: number
  absent_min: number
  ot_min: number
  entitled: number
  cut_late: number
  cut_early: number
  cut_absent: number
  cut_total: number
  ot_amount: number
  net: number
  finalized: boolean
}

interface MonthDay {
  d: string
  open_day: boolean
  in_range: boolean
  status: string | null
  check_in: string | null
  check_out: string | null
  late_min: number
  early_min: number
  absent_min: number
  ot_min: number
  unmarked: boolean
  missing_out: boolean
}

const rs = (n: number) => `Rs. ${Math.round(Number(n)).toLocaleString('en-US')}`
const STATUS_UR: Record<string, string> = { present: 'hazir', half: 'aadha din', leave: 'chhutti', absent: 'ghair-hazir' }

export default function AttendanceMonth({ period, today, rows }: { period: string; today: string; rows: CalcRow[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [days, setDays] = useState<Record<string, MonthDay[]>>({})

  const [y, m] = period.split('-').map(Number)
  const monthEnded = Date.UTC(y, m, 1) <= Date.parse(`${today}T00:00:00Z`)
  const go = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1))
    router.push(`/admin/attendance?t=mahina&m=${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }

  async function finalize(staff: string | null) {
    const q = staff ? 'Is staff ka mahina tayyar karein? Tayyar hone ke baad is mahine ki hazri badli nahi ja sakti.' : 'Sab ka mahina tayyar karein? Tayyar hone ke baad hazri badli nahi ja sakti.'
    if (!confirm(q)) return
    setBusy(staff ?? 'all')
    setErr('')
    setMsg('')
    const sb = createClient()
    const { data, error } = staff
      ? await sb.rpc('payroll_finalize', { p_staff: staff, p_period: period })
      : await sb.rpc('payroll_finalize_all', { p_period: period })
    setBusy('')
    if (error) return setErr(friendlyError(error.message))
    setMsg(staff ? 'Mahina tayyar ho gaya. Salary page par entry dekh lein.' : `${data} staff ka mahina tayyar ho gaya.`)
    router.refresh()
  }

  async function toggle(id: string) {
    if (open === id) return setOpen(null)
    setOpen(id)
    if (days[id]) return
    const { data, error } = await createClient().rpc('attendance_month_days', { p_staff: id, p_period: period })
    if (error) return setErr(friendlyError(error.message))
    setDays({ ...days, [id]: (data ?? []) as MonthDay[] })
  }

  const pending = rows.filter((r) => !r.finalized)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}

      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Mahine ka hisab</h2>
          <button type="button" onClick={() => go(-1)} className="rounded border border-clinic-teal/25 px-2 text-sm">‹</button>
          <span className="text-sm font-medium">{period}</span>
          <button type="button" onClick={() => go(1)} className="rounded border border-clinic-teal/25 px-2 text-sm">›</button>
          <button
            type="button"
            disabled={!monthEnded || pending.length === 0 || busy === 'all'}
            onClick={() => finalize(null)}
            className="ml-auto rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Sab ka mahina tayyar karein
          </button>
        </div>
        {!monthEnded && <p className="mt-2 text-xs text-clinic-ink/55">Ye mahina abhi chal raha hai. Neeche abhi tak ka hisab hai; mahina khatam hone ke baad hi tayyar hoga.</p>}
        <p className="mt-1 text-[11px] text-clinic-ink/50">
          Aik minute ki qeemat = tankhwah ÷ mahine ki kul shift ke minute. Band din aur haftawar chhutti ginti se bahar hain. Jo din likha nahi, us ki katauti nahi banti.
        </p>

        <ul className="mt-3 grid gap-3">
          {rows.length === 0 && <li className="text-sm text-clinic-ink/60">Koi staff nahi.</li>}
          {rows.map((r) => (
            <li key={r.staff_id} className="rounded-xl border border-clinic-teal/15 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-clinic-ink">{r.full_name}</span>
                {r.title && <span className="text-xs text-clinic-ink/55">{r.title}</span>}
                {!r.track && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">hazri nahi lagti</span>}
                {r.finalized && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">tayyar (lock)</span>}
                <span className="ml-auto font-display text-lg font-semibold text-clinic-ink">{rs(r.net)}</span>
              </div>
              <p className="mt-1 text-[11px] text-clinic-ink/55">
                Tankhwah {rs(r.monthly_salary)}
                {r.eff_min < r.month_min && ` · joining (${r.eff_from}) se ${dur(r.eff_min)} ka hisab: ${rs(r.entitled)}`}
                {r.rate_per_min ? ` · aik minute = Rs. ${Number(r.rate_per_min).toFixed(2)}` : ''}
              </p>

              {r.track && (
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                  <span>Hazir: <b>{r.present}</b> · aadha: <b>{r.half}</b></span>
                  <span>Chhutti: <b>{r.leave_paid}</b> (bagair tankhwah: <b>{r.leave_unpaid}</b>)</span>
                  <span className={r.absent ? 'text-red-600' : ''}>Ghair-hazir: <b>{r.absent}</b></span>
                  <span className={r.unmarked ? 'text-amber-700' : ''}>Likhi nahi: <b>{r.unmarked}</b> din</span>
                  <span>Late: <b>{dur(r.late_min)}</b> ({r.late_days} din)</span>
                  <span>Jaldi gaye: <b>{dur(r.early_min)}</b></span>
                  <span>Ghair-hazri/bagair tankhwah: <b>{dur(r.absent_min)}</b></span>
                  <span className="text-violet-700">Overtime: <b>{dur(r.ot_min)}</b></span>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {r.cut_total > 0 && (
                  <span className="text-red-700">
                    Katauti {rs(r.cut_total)} (late {rs(r.cut_late)}, jaldi {rs(r.cut_early)}, ghair-hazri {rs(r.cut_absent)})
                  </span>
                )}
                {r.ot_amount > 0 && <span className="text-violet-700">Overtime {rs(r.ot_amount)}</span>}
                {r.missing_out > 0 && <span className="text-amber-700">{r.missing_out} din jaane ka waqt nahi likha (koi katauti nahi)</span>}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {r.track && (
                  <button type="button" onClick={() => toggle(r.staff_id)} className="text-xs text-clinic-teal underline">
                    {open === r.staff_id ? 'Din band karein' : 'Roz ka hisab dekhein'}
                  </button>
                )}
                {!r.finalized && (
                  <button
                    type="button"
                    disabled={!monthEnded || busy === r.staff_id}
                    onClick={() => finalize(r.staff_id)}
                    className="rounded-full border border-clinic-teal px-3 py-1 text-xs font-semibold text-clinic-teal disabled:opacity-40"
                  >
                    Mahina tayyar karein
                  </button>
                )}
                <Link href={`/admin/payroll/slip?staff=${r.staff_id}&m=${period}`} className="rounded-full border border-clinic-ink/20 px-3 py-1 text-xs font-semibold text-clinic-ink/70">
                  Salary parchi
                </Link>
              </div>

              {open === r.staff_id && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="text-clinic-ink/55">
                      <tr>
                        <th className="py-1 pr-2">Din</th><th className="pr-2">Halat</th><th className="pr-2">Aaya</th><th className="pr-2">Gaya</th><th className="pr-2">Late</th><th className="pr-2">Jaldi</th><th className="pr-2">Ghair-hazri</th><th>Overtime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(days[r.staff_id] ?? []).filter((x) => x.in_range).map((x) => (
                        <tr key={x.d} className={`border-t border-clinic-teal/10 ${x.open_day ? '' : 'bg-gray-50 text-clinic-ink/55'}`}>
                          <td className="py-1 pr-2 whitespace-nowrap">{x.d.slice(8)}{!x.open_day ? ' (band)' : ''}</td>
                          <td className="pr-2">{x.status ? STATUS_UR[x.status] : x.open_day && x.unmarked ? <span className="text-amber-700">likhi nahi</span> : ''}</td>
                          <td className="pr-2">{t12(x.check_in)}</td>
                          <td className="pr-2">{t12(x.check_out) || (x.missing_out ? <span className="text-amber-700">nahi likha</span> : '')}</td>
                          <td className="pr-2">{x.late_min || ''}</td>
                          <td className="pr-2">{x.early_min || ''}</td>
                          <td className="pr-2">{x.absent_min ? dur(x.absent_min) : ''}</td>
                          <td className="text-violet-700">{x.ot_min || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

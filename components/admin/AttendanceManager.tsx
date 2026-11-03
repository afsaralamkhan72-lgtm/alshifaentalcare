'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'

export interface AttRow { staff_id: string; status: 'present' | 'absent' | 'leave' | 'half'; check_in: string | null; check_out: string | null; note: string | null }
export interface SummaryRow { staff_id: string; full_name: string; monthly_salary: number; present: number; half: number; absent: number; leave: number; late: number; suggested: number; applied: boolean }
export interface Rules { work_start: string; grace_minutes: number; late_cut: number; absent_cut: boolean }

const ST: { k: AttRow['status']; l: string; on: string }[] = [
  { k: 'present', l: 'Hazir', on: 'bg-emerald-600 text-white' },
  { k: 'half', l: 'Aadha din', on: 'bg-amber-500 text-white' },
  { k: 'leave', l: 'Chutti', on: 'bg-sky-600 text-white' },
  { k: 'absent', l: 'Ghair-hazir', on: 'bg-red-600 text-white' },
]
const hm = (t: string | null) => (t ? t.slice(0, 5) : '')
const rs = (n: number) => `Rs. ${Number(n).toLocaleString('en-US')}`

export default function AttendanceManager({
  date, today, period, staff, att, rules, summary, summaryError,
}: {
  date: string; today: string; period: string
  staff: { id: string; full_name: string; title: string | null }[]
  att: AttRow[]; rules: Rules; summary: SummaryRow[]; summaryError: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [times, setTimes] = useState<Record<string, { i: string; o: string }>>({})
  const [rl, setRl] = useState({ start: hm(rules.work_start), grace: String(rules.grace_minutes), late: String(rules.late_cut), absent: rules.absent_cut })
  const by = new Map(att.map((a) => [a.staff_id, a]))
  const isToday = date === today

  async function call(key: string, fn: string, args: Record<string, unknown>, ok?: string) {
    setBusy(key)
    setErr('')
    setMsg('')
    const { error } = await createClient().rpc(fn, args)
    setBusy('')
    if (error) return setErr(friendlyError(error.message))
    if (ok) setMsg(ok)
    router.refresh()
  }
  const go = (d: string, m?: string) => router.push(`/admin/attendance?d=${d}${m ? `&m=${m}` : ''}`)
  const tm = (id: string) => times[id] ?? { i: hm(by.get(id)?.check_in ?? null), o: hm(by.get(id)?.check_out ?? null) }
  const mark = (id: string, status: string) => {
    const t = tm(id)
    return call(id, 'attendance_mark', { p_staff: id, p_date: date, p_status: status, p_in: t.i || null, p_out: t.o || null, p_note: by.get(id)?.note ?? null })
  }
  const late = (id: string) => {
    const a = by.get(id)
    if (!a || a.status !== 'present' || !a.check_in) return false
    const [h, m] = a.check_in.split(':').map(Number)
    const [sh, sm] = rules.work_start.split(':').map(Number)
    return h * 60 + m > sh * 60 + sm + rules.grace_minutes
  }
  const shiftMonth = (n: number) => {
    const [y, m] = period.split('-').map(Number)
    const d = new Date(Date.UTC(y, m - 1 + n, 1))
    go(date, `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="mt-4 grid gap-5">
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}

      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Roz ki hazri</h2>
          <input type="date" max={today} value={date} onChange={(e) => e.target.value && go(e.target.value, period)} className="rounded-lg border border-clinic-teal/25 px-2 py-1 text-sm" />
          {!isToday && <button type="button" onClick={() => go(today)} className="text-xs text-clinic-teal underline">aaj</button>}
          <button type="button" disabled={busy === 'all' || staff.length === 0} onClick={() => call('all', 'attendance_mark_all_present', { p_date: date }, 'Baqi sab ko hazir likh diya')} className="ml-auto rounded-full border border-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-40">
            Baqi sab hazir
          </button>
        </div>
        {staff.length === 0 && <p className="mt-3 text-sm text-clinic-ink/60">Koi active staff nahi. Pehle Salary page par staff jorein.</p>}
        <ul className="mt-3 grid gap-3">
          {staff.map((s) => {
            const a = by.get(s.id)
            const t = tm(s.id)
            return (
              <li key={s.id} className="rounded-xl border border-clinic-teal/15 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-clinic-ink">{s.full_name}</span>
                  {s.title && <span className="text-xs text-clinic-ink/55">{s.title}</span>}
                  {late(s.id) && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700">late</span>}
                  {!a && <span className="text-[11px] text-clinic-ink/45">abhi likhi nahi</span>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ST.map((x) => (
                    <button key={x.k} type="button" disabled={busy === s.id} onClick={() => mark(s.id, x.k)} className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-40 ${a?.status === x.k ? x.on : 'border border-clinic-teal/25 text-clinic-ink/70'}`}>
                      {x.l}
                    </button>
                  ))}
                </div>
                {(a?.status === 'present' || a?.status === 'half' || isToday) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <label className="flex items-center gap-1">
                      Aaya
                      <input type="time" value={t.i} onChange={(e) => setTimes({ ...times, [s.id]: { ...t, i: e.target.value } })} className="rounded border border-clinic-teal/25 px-1.5 py-1" />
                    </label>
                    <label className="flex items-center gap-1">
                      Gaya
                      <input type="time" value={t.o} onChange={(e) => setTimes({ ...times, [s.id]: { ...t, o: e.target.value } })} className="rounded border border-clinic-teal/25 px-1.5 py-1" />
                    </label>
                    {(a?.status === 'present' || a?.status === 'half') && (
                      <button type="button" disabled={busy === s.id} onClick={() => mark(s.id, a.status)} className="rounded-full bg-clinic-teal px-3 py-1 font-semibold text-white disabled:opacity-40">
                        Waqt mehfooz
                      </button>
                    )}
                    {isToday && (
                      <>
                        <button type="button" disabled={busy === s.id + 'i'} onClick={() => call(s.id + 'i', 'attendance_clock', { p_staff: s.id, p_action: 'in' })} className="rounded-full border border-emerald-600 px-3 py-1 font-semibold text-emerald-700 disabled:opacity-40">
                          Abhi aaya
                        </button>
                        <button type="button" disabled={busy === s.id + 'o' || !a} onClick={() => call(s.id + 'o', 'attendance_clock', { p_staff: s.id, p_action: 'out' })} className="rounded-full border border-clinic-teal/40 px-3 py-1 font-semibold text-clinic-ink/70 disabled:opacity-40">
                          Abhi gaya
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Mahine ka hisaab</h2>
          <button type="button" onClick={() => shiftMonth(-1)} className="rounded border border-clinic-teal/25 px-2 text-sm">‹</button>
          <span className="text-sm font-medium">{period}</span>
          <button type="button" onClick={() => shiftMonth(1)} className="rounded border border-clinic-teal/25 px-2 text-sm">›</button>
        </div>
        {summaryError ? (
          <p className="mt-2 text-sm text-red-700">{friendlyError(summaryError)}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-clinic-ink/55">
                <tr><th className="py-1 pr-3">Staff</th><th className="pr-2">Hazir</th><th className="pr-2">Aadha</th><th className="pr-2">Chutti</th><th className="pr-2">Ghair</th><th className="pr-2">Late</th><th className="pr-2 text-right">Katauti</th><th /></tr>
              </thead>
              <tbody>
                {summary.map((r) => (
                  <tr key={r.staff_id} className="border-t border-clinic-teal/10">
                    <td className="py-1.5 pr-3 font-medium">{r.full_name}</td>
                    <td className="pr-2">{r.present}</td><td className="pr-2">{r.half}</td><td className="pr-2">{r.leave}</td>
                    <td className={`pr-2 ${r.absent ? 'text-red-600' : ''}`}>{r.absent}</td><td className="pr-2">{r.late}</td>
                    <td className="pr-2 text-right whitespace-nowrap">{r.suggested > 0 ? rs(r.suggested) : '—'}</td>
                    <td className="text-right">
                      {r.applied ? (
                        <span className="text-[11px] text-emerald-700">lag chuki</span>
                      ) : r.suggested > 0 ? (
                        <button type="button" disabled={busy === r.staff_id + 'd'} onClick={() => confirm(`${r.full_name} ki ${rs(r.suggested)} katauti salary mein lagayein?`) && call(r.staff_id + 'd', 'attendance_apply_deduction', { p_staff: r.staff_id, p_period: period }, 'Katauti salary ke hisaab mein likh di')} className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-40">
                          Katauti lagayein
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-clinic-ink/50">Katauti sirf unhi dinon ki hoti hai jo likhe gaye hon. Jo din likha nahi, us ki katauti nahi banti.</p>
      </section>

      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Qaide</h2>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <label className="grid gap-0.5">Kaam shuru hone ka waqt
            <input type="time" value={rl.start} onChange={(e) => setRl({ ...rl, start: e.target.value })} className="rounded-lg border border-clinic-teal/25 px-2 py-1.5" />
          </label>
          <label className="grid gap-0.5">Mohlat (minute)
            <input type="number" min={0} max={240} value={rl.grace} onChange={(e) => setRl({ ...rl, grace: e.target.value })} className="rounded-lg border border-clinic-teal/25 px-2 py-1.5" />
          </label>
          <label className="grid gap-0.5">Har late par katauti (Rs; 0 = nahi)
            <input type="number" min={0} value={rl.late} onChange={(e) => setRl({ ...rl, late: e.target.value })} className="rounded-lg border border-clinic-teal/25 px-2 py-1.5" />
          </label>
          <label className="flex items-center gap-2 pt-5">
            <input type="checkbox" checked={rl.absent} onChange={(e) => setRl({ ...rl, absent: e.target.checked })} className="h-4 w-4" />
            Ghair-hazri par din ki tankhwah katein (tankhwah ÷ mahine ke din)
          </label>
        </div>
        <button type="button" disabled={busy === 'rules'} onClick={() => call('rules', 'attendance_set_rules', { p_start: rl.start, p_grace: Number(rl.grace), p_late_cut: Number(rl.late) || 0, p_absent_cut: rl.absent }, 'Qaide mehfooz ho gaye')} className="mt-3 rounded-full bg-clinic-teal px-5 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
          Qaide mehfooz karein
        </button>
      </section>
    </div>
  )
}

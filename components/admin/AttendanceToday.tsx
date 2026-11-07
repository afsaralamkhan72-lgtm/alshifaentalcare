'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import {
  type DayRow,
  type LeaveType,
  type ReqRow,
  dateLabel,
  hm,
  shareText,
  sourceLabel,
  t12,
  whatsappShareLink,
} from '@/lib/attendanceUi'

type St = 'present' | 'half' | 'leave' | 'absent'
const ST: { k: St; l: string; on: string }[] = [
  { k: 'present', l: 'Hazir', on: 'bg-emerald-600 text-white' },
  { k: 'half', l: 'Aadha din', on: 'bg-amber-500 text-white' },
  { k: 'leave', l: 'Chhutti', on: 'bg-sky-600 text-white' },
  { k: 'absent', l: 'Ghair-hazir', on: 'bg-red-600 text-white' },
]

export default function AttendanceToday({
  date,
  today,
  rows,
  leaveTypes,
  requests,
  suspects,
  graceMin,
}: {
  date: string
  today: string
  rows: DayRow[]
  leaveTypes: LeaveType[]
  requests: ReqRow[]
  suspects: string[]
  graceMin: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [times, setTimes] = useState<Record<string, { i: string; o: string }>>({})
  const active = leaveTypes.filter((t) => t.active)
  const [lt, setLt] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const isToday = date === today
  const tracked = rows.filter((r) => r.track)
  const closed = tracked.length > 0 && tracked.every((r) => !r.open_day)

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

  const go = (d: string) => router.push(`/admin/attendance?d=${d}`)
  const tm = (r: DayRow) => times[r.staff_id] ?? { i: hm(r.check_in), o: hm(r.check_out) }
  const ltOf = (id: string) => lt[id] ?? active.find((t) => t.paid)?.id ?? active[0]?.id ?? null

  const mark = (r: DayRow, status: St) => {
    const t = tm(r)
    return call(r.staff_id, 'attendance_mark2', {
      p_staff: r.staff_id,
      p_date: date,
      p_status: status,
      p_in: status === 'present' || status === 'half' ? t.i || null : null,
      p_out: status === 'present' || status === 'half' ? t.o || null : null,
      p_note: null,
      p_leave_type: status === 'leave' ? ltOf(r.staff_id) : null,
    })
  }

  const setDay = (d: string, closedFlag: boolean, why: string, ok: string) =>
    call('day' + d, 'clinic_set_days', { p_from: d, p_to: d, p_closed: closedFlag, p_reason: why || null }, ok)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}

      {suspects.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">
            {suspects.length === 1 ? `Kya ${dateLabel(suspects[0])} ko clinic band thi?` : `${suspects.length} din ki hazri nahi lagi. Kya clinic band thi?`}
          </p>
          <p className="text-xs">Un dinon par na hazri lagi, na visit, na payment, na appointment. Band din ki katauti nahi lagti.</p>
          {suspects.length > 1 && (
            <button
              type="button"
              disabled={busy === 'dayall'}
              onClick={async () => {
                setBusy('dayall')
                setErr('')
                setMsg('')
                const sb = createClient()
                const res = await Promise.all(suspects.map((d) => sb.rpc('clinic_set_days', { p_from: d, p_to: d, p_closed: false, p_reason: 'Khuli thi (tasdeeq)' })))
                setBusy('')
                const bad = res.filter((x) => x.error)
                if (bad.length) setErr(`${res.length - bad.length} din save hue, ${bad.length} nahi: ` + friendlyError(bad[0].error!.message))
                else setMsg('Sab din khuli din likh diye')
                router.refresh()
              }}
              className="mt-2 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              Sab din khuli thi
            </button>
          )}
          <ul className="mt-2 grid gap-1.5">
            {suspects.map((d) => (
              <li key={d} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/60 px-2 py-1.5">
                <span>{dateLabel(d)}</span>
                <span className="flex gap-2">
                  <button type="button" disabled={busy === 'day' + d} onClick={() => setDay(d, true, 'Clinic band (tasdeeq)', 'Us din ko clinic band likh diya')} className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
                    Band thi
                  </button>
                  <button type="button" disabled={busy === 'day' + d} onClick={() => setDay(d, false, 'Khuli thi (tasdeeq)', 'Theek hai, khuli din hi rahega')} className="rounded-full border border-amber-600 px-3 py-1 text-xs font-semibold text-amber-800 disabled:opacity-60">
                    Khuli thi
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {requests.length > 0 && (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <h2 className="font-display text-base font-semibold text-sky-900">Hazri ki darkhwastein ({requests.length})</h2>
          <ul className="mt-2 grid gap-2">
            {requests.map((q) => {
              const name = Array.isArray(q.staff_members) ? q.staff_members[0]?.full_name : q.staff_members?.full_name
              return (
                <li key={q.id} className="rounded-xl bg-white p-3 text-sm">
                  <p className="font-semibold text-clinic-ink">
                    {name} · {q.kind === 'in' ? 'aane' : 'jaane'} ka waqt {t12(q.req_time)} · {dateLabel(q.att_date)}
                  </p>
                  <p className="text-xs text-clinic-ink/60">Wajah: {q.reason}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy === q.id} onClick={() => call(q.id, 'attendance_request_decide', { p_id: q.id, p_approve: true }, 'Mangoor kar di, hazri lag gayi')} className="rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white disabled:opacity-40">
                      Mangoor
                    </button>
                    <button type="button" disabled={busy === q.id} onClick={() => call(q.id, 'attendance_request_decide', { p_id: q.id, p_approve: false }, 'Radd kar di')} className="rounded-full border border-red-400 px-4 py-1 text-xs font-semibold text-red-700 disabled:opacity-40">
                      Radd
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">{isToday ? 'Aaj ki hazri' : 'Hazri'}</h2>
          <input type="date" max={today} value={date} onChange={(e) => e.target.value && go(e.target.value)} className="rounded-lg border border-clinic-teal/25 px-2 py-1 text-sm" />
          {!isToday && (
            <button type="button" onClick={() => go(today)} className="text-xs text-clinic-teal underline">
              aaj
            </button>
          )}
          <a
            href={whatsappShareLink(shareText(date, rows))}
            target="_blank"
            rel="noreferrer"
            className="ml-auto rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white"
          >
            WhatsApp group mein bhejein
          </a>
        </div>
        <p className="mt-1 text-[11px] text-clinic-ink/50">Message mein sirf naam, waqt aur halat hoti hai. Tankhwah ya katauti ki raqam kabhi nahi.</p>

        {closed ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <span>Is din clinic band / chhutti ka din hai. Koi katauti nahi, aur koi aaye to overtime.</span>
            <button type="button" disabled={busy === 'day' + date} onClick={() => setDay(date, false, 'Khuli', 'Is din ko khuli kar diya')} className="rounded-full border border-amber-600 px-3 py-1 text-xs font-semibold">
              Is din ko khuli karein
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Band karne ki wajah (jaise baarish)" className="min-w-[12rem] flex-1 rounded-lg border border-clinic-teal/25 px-2 py-1.5 sm:max-w-xs" />
            <button type="button" disabled={busy === 'day' + date} onClick={() => confirm('Is din ko clinic band likhein? Kisi ki katauti nahi lagegi.') && setDay(date, true, reason, 'Is din ko clinic band likh diya')} className="rounded-full border border-amber-600 px-3 py-1.5 font-semibold text-amber-800 disabled:opacity-40">
              Is din clinic band karein
            </button>
            <button
              type="button"
              disabled={busy === 'all' || tracked.length === 0}
              onClick={() => call('all', 'attendance_mark_all_present', { p_date: date }, 'Baqi sab ko hazir likh diya')}
              className="ml-auto rounded-full border border-emerald-600 px-3 py-1.5 font-semibold text-emerald-700 disabled:opacity-40"
            >
              Baqi sab hazir
            </button>
          </div>
        )}

        {tracked.length === 0 && <p className="mt-3 text-sm text-clinic-ink/60">Koi staff nahi jis ki hazri lagti ho. Pehle Salary page par staff jorein.</p>}

        <ul className="mt-3 grid gap-3">
          {tracked.map((r) => {
            const t = tm(r)
            const busyHere = busy === r.staff_id
            return (
              <li key={r.staff_id} className="rounded-xl border border-clinic-teal/15 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-clinic-ink">{r.full_name}</span>
                  {r.title && <span className="text-xs text-clinic-ink/55">{r.title}</span>}
                  {r.open_day && r.late_min > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700">{r.late_min} minute late</span>}
                  {r.open_day && r.status === 'present' && r.check_in && r.late_min === 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">waqt par</span>}
                  {r.early_min > 0 && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] text-orange-700">{r.early_min} minute jaldi gaya</span>}
                  {r.ot_min > 0 && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-700">overtime {r.ot_min} minute</span>}
                  {r.leave_name && r.status === 'leave' && <span className="text-[11px] text-clinic-ink/55">{r.leave_name}</span>}
                  {!r.status && <span className="text-[11px] text-clinic-ink/45">abhi likhi nahi</span>}
                  {r.source && <span className="text-[11px] text-clinic-ink/45">{sourceLabel(r.source)}</span>}
                  {r.pending_requests > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-800">darkhwast baqi</span>}
                </div>
                {r.late_reason && <p className="mt-1 text-[11px] text-clinic-ink/55">Wajah: {r.late_reason}</p>}
                <p className="mt-0.5 text-[11px] text-clinic-ink/45">
                  Shift {t12(r.shift_s)} - {t12(r.shift_e)} · mohlat {graceMin} minute
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {ST.map((x) => (
                    <button key={x.k} type="button" disabled={busyHere} onClick={() => mark(r, x.k)} className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-40 ${r.status === x.k ? x.on : 'border border-clinic-teal/25 text-clinic-ink/70'}`}>
                      {x.l}
                    </button>
                  ))}
                  {active.length > 1 && (
                    <select aria-label="Chhutti ki qism" value={ltOf(r.staff_id) ?? ''} onChange={(e) => setLt({ ...lt, [r.staff_id]: e.target.value })} className="rounded-lg border border-clinic-teal/25 px-1.5 py-1 text-xs">
                      {active.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {(r.status === 'present' || r.status === 'half' || isToday) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <label className="flex items-center gap-1">
                      Aaya
                      <input type="time" value={t.i} onChange={(e) => setTimes({ ...times, [r.staff_id]: { ...t, i: e.target.value } })} className="rounded border border-clinic-teal/25 px-1.5 py-1" />
                    </label>
                    <label className="flex items-center gap-1">
                      Gaya
                      <input type="time" value={t.o} onChange={(e) => setTimes({ ...times, [r.staff_id]: { ...t, o: e.target.value } })} className="rounded border border-clinic-teal/25 px-1.5 py-1" />
                    </label>
                    {(r.status === 'present' || r.status === 'half') && (
                      <button type="button" disabled={busyHere} onClick={() => mark(r, r.status as St)} className="rounded-full bg-clinic-teal px-3 py-1 font-semibold text-white disabled:opacity-40">
                        Waqt mehfooz
                      </button>
                    )}
                    {isToday && (
                      <>
                        <button type="button" disabled={busy === r.staff_id + 'i'} onClick={() => call(r.staff_id + 'i', 'attendance_clock', { p_staff: r.staff_id, p_action: 'in' })} className="rounded-full border border-emerald-600 px-3 py-1 font-semibold text-emerald-700 disabled:opacity-40">
                          Abhi aaya
                        </button>
                        <button type="button" disabled={busy === r.staff_id + 'o' || !r.status} onClick={() => call(r.staff_id + 'o', 'attendance_clock', { p_staff: r.staff_id, p_action: 'out' })} className="rounded-full border border-clinic-teal/40 px-3 py-1 font-semibold text-clinic-ink/70 disabled:opacity-40">
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
    </div>
  )
}

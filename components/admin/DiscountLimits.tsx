'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { fmtDate } from '@/lib/karachi'

export interface LimitRow { role: string; max_percent: number }
export interface LogRow {
  id: string
  created_at: string
  kind: string
  base_amount: number
  discount_amount: number
  percent: number
  given_by_name: string | null
  given_by_role: string | null
  patient_name: string | null
}

const ROLE: Record<string, string> = { admin: 'Admin', doctor: 'Doctor', receptionist: 'Receptionist' }
const rs = (n: number) => `Rs. ${Number(n).toLocaleString('en-US')}`

/** Riyayat ki had (role ke hisaab se) aur har riyayat ka record. Sirf doctor/admin. */
export default function DiscountLimits({ limits, log, missing }: { limits: LimitRow[]; log: LogRow[]; missing: boolean }) {
  const router = useRouter()
  const [vals, setVals] = useState<Record<string, string>>(Object.fromEntries(limits.map((l) => [l.role, String(l.max_percent)])))
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  if (missing) return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Pehle FINAL28 ki SQL Supabase mein chalayein.</p>

  async function save(role: string) {
    setBusy(role)
    setErr('')
    setMsg('')
    const { error } = await createClient().rpc('set_discount_limit', { p_role: role, p_percent: Number(vals[role]) })
    setBusy('')
    if (error) return setErr(friendlyError(error.message))
    setMsg(`${ROLE[role]} ki had mehfooz ho gayi`)
    router.refresh()
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Riyayat (discount) ki had</h2>
        <p className="mt-1 text-sm text-clinic-ink/60">
          Har role kitne percent tak riyayat de sakta hai. 0 matlab riyayat nahi de sakta. Ye hadd treatment ki qeemat (price-list se kam) aur bill ki riyayat dono par lagti hai.
        </p>
        {err && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        {msg && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}
        <ul className="mt-3 grid gap-2">
          {['receptionist', 'doctor', 'admin'].map((r) => (
            <li key={r} className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-sm font-medium">{ROLE[r]}</span>
              <input type="number" min={0} max={100} step="0.5" value={vals[r] ?? '0'} onChange={(e) => setVals({ ...vals, [r]: e.target.value })} className="w-24 rounded-lg border border-clinic-teal/25 px-2 py-1.5 text-right" />
              <span className="text-sm">%</span>
              <button type="button" disabled={busy === r} onClick={() => save(r)} className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                Mehfooz
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Riyayat ka record</h2>
        <p className="mt-1 text-xs text-clinic-ink/55">Pichli 100 riyayatein: kis ne, kis patient ko, kitni di.</p>
        {log.length === 0 ? (
          <p className="mt-3 text-sm text-clinic-ink/60">Abhi koi riyayat nahi di gayi.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-clinic-ink/55">
                <tr>
                  <th className="py-1 pr-3">Tareekh</th>
                  <th className="pr-3">Patient</th>
                  <th className="pr-3">Kis par</th>
                  <th className="pr-3 text-right">Riyayat</th>
                  <th>Kis ne</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id} className="border-t border-clinic-teal/10">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{fmtDate(l.created_at.slice(0, 10))}</td>
                    <td className="pr-3">{l.patient_name ?? '—'}</td>
                    <td className="pr-3">{l.kind === 'treatment' ? 'Treatment' : 'Bill'} ({rs(l.base_amount)})</td>
                    <td className="pr-3 text-right whitespace-nowrap">{rs(l.discount_amount)} ({Number(l.percent)}%)</td>
                    <td>{l.given_by_name ?? '—'}{l.given_by_role ? ` (${ROLE[l.given_by_role] ?? l.given_by_role})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

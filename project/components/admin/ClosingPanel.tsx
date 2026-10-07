'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money, fmtDate } from '@/lib/karachi'

export interface Summary {
  date: string
  opening_cash: number
  cash_in: number
  cash_out: number
  expected_cash: number
  other_in: number
  other_out: number
  invoices_count: number
  invoices_total: number
  closed: boolean
  counted_cash: number | null
  difference: number | null
  late_entries: number
}
export interface ClosingRow {
  close_date: string
  expected_cash: number
  counted_cash: number
  difference: number
  note: string | null
  closed_by_name: string | null
}

export default function ClosingPanel({ summary, history, today }: { summary: Summary; history: ClosingRow[]; today: string }) {
  const router = useRouter()
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const diff = counted === '' ? null : Number(counted) - Number(summary.expected_cash)
  const input = 'rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  async function close() {
    setBusy(true)
    setErr('')
    const supabase = createClient()
    const { error } = await supabase.rpc('close_day', {
      p_date: summary.date,
      p_counted_cash: Number(counted),
      p_note: note || null,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    router.refresh()
  }

  const rows: [string, string][] = [
    ['Pichli closing ka cash (opening)', money(summary.opening_cash)],
    ['+ Aaj cash aaya', money(summary.cash_in)],
    ['− Aaj cash gaya', money(summary.cash_out)],
    ['= Cash hona chahiye', money(summary.expected_cash)],
  ]

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display font-semibold text-clinic-ink">{fmtDate(summary.date)}</p>
          <div className="flex gap-2 text-xs">
            {summary.date !== today && (
              <a href="/admin/closing" className="rounded-full bg-clinic-mint px-3 py-1 text-clinic-teal">Aaj</a>
            )}
            <form className="flex gap-1">
              <input type="date" name="date" max={today} defaultValue={summary.date} className="rounded-lg border border-clinic-teal/20 px-2 py-1" />
              <button className="rounded-lg bg-clinic-teal px-3 py-1 text-white">Dekhein</button>
            </form>
          </div>
        </div>

        <div className="mt-4 divide-y divide-clinic-teal/10 text-sm">
          {rows.map(([l, v]) => (
            <div key={l} className="flex justify-between py-2">
              <span className="text-clinic-ink/60">{l}</span>
              <span className="font-semibold text-clinic-ink">{v}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-clinic-ink/50">
          Bank/Easypaisa/JazzCash: aaya {money(summary.other_in)}, gaya {money(summary.other_out)} (ye cash mein nahi ginte). Invoices: {summary.invoices_count}, kul {money(summary.invoices_total)}.
        </p>

        {summary.closed ? (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            Din band ho chuka. Ginti shuda cash {money(summary.counted_cash)}, farq {money(summary.difference)}.
            {summary.late_entries > 0 && (
              <p className="mt-1 font-semibold text-amber-700">Closing ke baad {summary.late_entries} nayi entry aayi, check karein.</p>
            )}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 rounded-xl bg-clinic-mint/60 p-4">
            <label className="text-sm font-medium text-clinic-ink">Drawer mein gin kar kitna cash hai?</label>
            <input type="number" min="0" inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} className={input} placeholder="Rs." />
            {diff !== null && (
              <p className={`text-sm font-semibold ${diff === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {diff === 0 ? 'Bilkul theek' : diff > 0 ? `Rs. ${diff.toLocaleString()} zyada` : `Rs. ${Math.abs(diff).toLocaleString()} kam`}
              </p>
            )}
            <input value={note} onChange={(e) => setNote(e.target.value)} className={input} placeholder={diff && diff !== 0 ? 'Farq ki wajah (zaroori)' : 'Note (optional)'} />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button disabled={busy || counted === ''} onClick={close} className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? 'Saving...' : 'Din band karein'}
            </button>
            <p className="text-xs text-clinic-ink/50">Closing baad mein badli nahi ja sakti. Agle din ki opening yehi ginti shuda cash hogi.</p>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-clinic-teal/10 bg-white">
        <p className="px-4 pt-4 font-display font-semibold text-clinic-ink">Pichli closings</p>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[560px] text-sm">
            <thead className="bg-clinic-mint text-left text-clinic-ink/60">
              <tr><th className="px-4 py-2">Tareekh</th><th className="px-4 py-2">Hona chahiye</th><th className="px-4 py-2">Gina</th><th className="px-4 py-2">Farq</th><th className="px-4 py-2">Note</th></tr>
            </thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-clinic-ink/50">Abhi koi closing nahi.</td></tr>}
              {history.map((h) => (
                <tr key={h.close_date} className="border-t border-clinic-teal/10">
                  <td className="px-4 py-2">{fmtDate(h.close_date)}</td>
                  <td className="px-4 py-2">{money(h.expected_cash)}</td>
                  <td className="px-4 py-2">{money(h.counted_cash)}</td>
                  <td className={`px-4 py-2 font-semibold ${Number(h.difference) === 0 ? 'text-emerald-700' : 'text-red-600'}`}>{money(h.difference)}</td>
                  <td className="px-4 py-2 text-clinic-ink/60">{h.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

import { fmtDate, money } from '@/lib/karachi'
import type { LedgerRow, PatientBalance } from '@/lib/ledger'

/** Patient ka poora hisaab: kab kya charge hua, kab kitna mila, aur us waqt baqaya kitna tha */
export default function LedgerTimeline({
  rows,
  balance,
}: {
  rows: LedgerRow[]
  balance: PatientBalance
}) {
  const sorted = [...rows].sort(
    (a, b) => a.entry_date.localeCompare(b.entry_date) || a.sort_at.localeCompare(b.sort_at)
  )
  let running = 0
  const withRun = sorted.map((r) => {
    running += Number(r.charge) - Number(r.payment)
    return { ...r, running }
  })
  const hasOld = rows.some((r) => r.source === 'old')
  const hasNew = rows.some((r) => r.source === 'new')

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="text-xs text-clinic-ink/50">Total Hisaab</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">{money(balance.total_charges)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700/70">Mile</p>
          <p className="mt-1 font-display text-lg font-semibold text-emerald-700">{money(balance.total_paid)}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700/70">Baqaya</p>
          <p className="mt-1 font-display text-lg font-semibold text-amber-700">{money(balance.balance)}</p>
        </div>
        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4 text-xs text-clinic-ink/70">
          {hasOld && <p>Purana hisaab baqaya: <strong>{money(balance.old_balance)}</strong></p>}
          {hasNew && <p>Naye invoice baqaya: <strong>{money(balance.new_balance)}</strong></p>}
          {!hasOld && !hasNew && <p>Abhi koi hisaab nahi.</p>}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60">
            <tr>
              <th className="px-4 py-3">Tareekh</th>
              <th className="px-4 py-3">Tafseel</th>
              <th className="px-4 py-3 text-right">Charge</th>
              <th className="px-4 py-3 text-right">Mila</th>
              <th className="px-4 py-3 text-right">Baqaya</th>
            </tr>
          </thead>
          <tbody>
            {withRun.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-clinic-ink/50">Koi entry nahi.</td></tr>
            )}
            {withRun.map((r, i) => (
              <tr key={i} className="border-t border-clinic-teal/10">
                <td className="px-4 py-2">{fmtDate(r.entry_date)}</td>
                <td className="px-4 py-2">
                  {r.label}
                  {r.source === 'old' && (
                    <span className="ml-2 rounded-full bg-clinic-mint px-2 py-0.5 text-[10px] font-semibold text-clinic-ink/60">Purana</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">{Number(r.charge) ? money(r.charge) : '—'}</td>
                <td className={`px-4 py-2 text-right ${Number(r.payment) < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {Number(r.payment) ? money(r.payment) : '—'}
                </td>
                <td className="px-4 py-2 text-right font-semibold">{money(Math.max(0, r.running))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-clinic-ink/50">
        Purana hisaab (naye invoice system se pehle ka) alag nishan se dikhta hai, wo badla nahi gaya.
      </p>
    </div>
  )
}

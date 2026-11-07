import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { money, todayKarachi } from '@/lib/karachi'

interface Rep {
  income: number
  expense: number
}

function bounds(month: string) {
  const [y, m] = month.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}` }
}
function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Sirf doctor/admin: aaj aur mahine ki wasooli, kharcha, munafa, pichle mahine se muqabla, patients ka baqaya, staff ka hisaab */
export default async function OwnerMoney() {
  const supabase = await createClient()
  const today = todayKarachi()
  const month = today.slice(0, 7)
  const prev = prevMonth(month)
  const mb = bounds(month)
  const pb = bounds(prev)

  const [dayRes, monRes, prevRes, duesRes, staffRes] = await Promise.all([
    supabase.rpc('report_summary', { p_from: today, p_to: today }),
    supabase.rpc('report_summary', { p_from: mb.start, p_to: today }),
    supabase.rpc('report_summary', { p_from: pb.start, p_to: pb.end }),
    supabase.from('transactions').select('balance_due').gt('balance_due', 0).is('settled_at', null),
    supabase.from('staff_balances').select('balance, total_advance'),
  ])
  const day = dayRes.data as Rep | null
  const mon = monRes.data as Rep | null
  const pre = prevRes.data as Rep | null
  if (!day || !mon || !pre) return null

  const n = (v: unknown) => Number(v ?? 0)
  const duesRows = duesRes.data ?? []
  const duesTotal = duesRows.reduce((a, r) => a + n(r.balance_due), 0)
  const staff = staffRes.data ?? []
  const staffOwed = staff.reduce((a, r) => a + Math.max(0, n(r.balance)), 0)
  const staffExtra = staff.reduce((a, r) => a + Math.max(0, -n(r.balance)), 0)

  const dayProfit = n(day.income) - n(day.expense)
  const monProfit = n(mon.income) - n(mon.expense)
  const preProfit = n(pre.income) - n(pre.expense)
  const pct = (a: number, b: number) => (b === 0 ? null : Math.round(((a - b) / Math.abs(b)) * 100))
  const incPct = pct(n(mon.income), n(pre.income))
  const proPct = pct(monProfit, preProfit)

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
        <p className="font-display font-semibold text-clinic-ink">Aaj ka munafa</p>
        <div className="mt-3 grid gap-2 text-sm">
          <Row label="Wasooli" value={money(n(day.income))} />
          <Row label="Kharche" value={money(n(day.expense))} />
          <Row label="Munafa" value={money(dayProfit)} bold tone={dayProfit < 0 ? 'red' : 'green'} />
        </div>
      </section>

      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-5 lg:col-span-2">
        <div className="flex items-baseline justify-between">
          <p className="font-display font-semibold text-clinic-ink">Is mahine aur pichle mahine ka muqabla</p>
          <Link href="/admin/accounts" className="text-xs font-semibold text-clinic-teal">Poori report →</Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="table-fit w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-clinic-ink/45">
                <th className="py-1 pr-3 font-semibold" />
                <th className="py-1 pr-3 text-right font-semibold">Is mahine<span className="block text-[9px] font-normal normal-case tracking-normal text-clinic-ink/40">{month}, abhi tak</span></th>
                <th className="py-1 pr-3 text-right font-semibold">Pichla mahina<span className="block text-[9px] font-normal normal-case tracking-normal text-clinic-ink/40">{prev}, poora</span></th>
                <th className="py-1 text-right font-semibold">Farq</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-clinic-teal/10">
              <Cmp label="Wasooli" a={n(mon.income)} b={n(pre.income)} p={incPct} />
              <Cmp label="Kharche" a={n(mon.expense)} b={n(pre.expense)} p={pct(n(mon.expense), n(pre.expense))} invert />
              <Cmp label="Munafa" a={monProfit} b={preProfit} p={proPct} bold />
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-clinic-ink/45">Munafa = wasooli minus kharche (jo likhe gaye). Pichla mahina poora hai, is liye is mahine ka abhi kam dikhna normal hai.</p>
      </section>

      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-5 lg:col-span-3">
        <p className="font-display font-semibold text-clinic-ink">Baqaya aur staff</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/admin/dues" className="rounded-xl bg-clinic-mint/60 p-3">
            <p className="font-display font-semibold text-clinic-ink">{money(duesTotal)}</p>
            <p className="mt-0.5 text-[11px] text-clinic-ink/50">Patients ka baqaya ({duesRows.length})</p>
          </Link>
          <Link href="/admin/payroll" className="rounded-xl bg-clinic-mint/60 p-3">
            <p className="font-display font-semibold text-clinic-ink">{money(staffOwed)}</p>
            <p className="mt-0.5 text-[11px] text-clinic-ink/50">Staff ko dena</p>
          </Link>
          <Link href="/admin/payroll" className="rounded-xl bg-clinic-mint/60 p-3">
            <p className={`font-display font-semibold ${staffExtra > 0 ? 'text-red-600' : 'text-clinic-ink'}`}>{money(staffExtra)}</p>
            <p className="mt-0.5 text-[11px] text-clinic-ink/50">Staff ne zyada liya (advance)</p>
          </Link>
        </div>
      </section>
    </div>
  )
}

function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: 'green' | 'red' }) {
  const c = tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-600' : 'text-clinic-ink'
  return (
    <div className="flex justify-between">
      <span className="text-clinic-ink/60">{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${c}`}>{value}</span>
    </div>
  )
}

function Cmp({ label, a, b, p, bold, invert }: { label: string; a: number; b: number; p: number | null; bold?: boolean; invert?: boolean }) {
  // Wasooli/munafa badhna acha (hara); kharcha badhna bura (laal)
  const good = p == null ? null : invert ? p <= 0 : p >= 0
  return (
    <tr className={bold ? 'font-semibold' : ''}>
      <td className="py-2 pr-3 text-clinic-ink/70">{label}</td>
      <td className="whitespace-nowrap py-2 pr-3 text-right text-clinic-ink">{money(a)}</td>
      <td className="whitespace-nowrap py-2 pr-3 text-right text-clinic-ink/70">{money(b)}</td>
      <td className={`whitespace-nowrap py-2 text-right ${good == null ? 'text-clinic-ink/40' : good ? 'text-emerald-700' : 'text-red-600'}`}>
        {p == null ? '—' : `${p > 0 ? '+' : ''}${p}%`}
      </td>
    </tr>
  )
}

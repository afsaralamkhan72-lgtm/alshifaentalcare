import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import { todayKarachi, addDays, money } from '@/lib/karachi'
import PrintButton from '@/components/admin/PrintButton'

export const dynamic = 'force-dynamic'

export default async function PayrollReportPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireOwner()
  const sp = await searchParams
  const today = todayKarachi()
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? (sp.month as string) : today.slice(0, 7)
  const next = addDays(`${month}-28`, 5).slice(0, 7)
  const prev = addDays(`${month}-01`, -1).slice(0, 7)
  const sb = await createClient()
  const [staffRes, ledRes] = await Promise.all([
    sb.from('staff_members').select('id, full_name, title, monthly_salary, is_active').order('full_name'),
    sb.from('staff_ledger').select('staff_id, kind, amount, entry_date, acknowledged_at').gte('entry_date', `${month}-01`).lt('entry_date', `${next}-01`),
  ])
  const led = (ledRes.data ?? []) as { staff_id: string; kind: string; amount: number; acknowledged_at: string | null }[]
  const rows = ((staffRes.data ?? []) as { id: string; full_name: string; title: string | null; monthly_salary: number; is_active: boolean }[])
    .map((s) => {
      const mine = led.filter((l) => l.staff_id === s.id)
      const sum = (k: string) => mine.filter((l) => l.kind === k).reduce((t, l) => t + Number(l.amount), 0)
      const paid = -sum('payout')
      const pendingAck = mine.filter((l) => (l.kind === 'payout' || l.kind === 'advance') && !l.acknowledged_at).length
      return { ...s, due: sum('salary_due'), bonus: sum('bonus'), ded: -sum('deduction'), adv: -sum('advance'), paid, net: sum('salary_due') + sum('bonus') + sum('deduction') + sum('advance') + sum('payout'), pendingAck, any: mine.length > 0 }
    })
    .filter((r) => r.is_active || r.any)
  const totalPaid = rows.reduce((t, r) => t + r.paid, 0)
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Salary ki mahana report</h1>
          <p className="mt-1 text-sm text-clinic-ink/60"><Link href="/admin/payroll" className="underline">← Staff Salary</Link></p>
        </div>
        <div className="flex items-center gap-2 text-sm print:hidden">
          <Link href={`/admin/payroll/report?month=${prev}`} className="rounded-full border border-clinic-teal/20 px-3 py-1">← {prev}</Link>
          <span className="rounded-full bg-clinic-teal px-3 py-1 text-white">{month}</span>
          {next <= today.slice(0, 7) && <Link href={`/admin/payroll/report?month=${next}`} className="rounded-full border border-clinic-teal/20 px-3 py-1">{next} →</Link>}
        </div>
      </div>
      <p className="mt-4 text-sm">Is mahine ada ki gayi raqam: <strong data-testid="payroll-paid">{money(totalPaid)}</strong></p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60"><tr><th className="px-3 py-2">Staff</th><th className="px-3 py-2 text-right">Salary</th><th className="px-3 py-2 text-right">Bonus</th><th className="px-3 py-2 text-right">Katauti</th><th className="px-3 py-2 text-right">Advance</th><th className="px-3 py-2 text-right">Ada</th><th className="px-3 py-2 text-right">Baqi</th><th className="px-3 py-2">Dastkhat</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-clinic-ink/50">Koi staff nahi.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-clinic-teal/10">
                <td className="px-3 py-2">{r.full_name}<span className="text-clinic-ink/50">{r.title ? ` · ${r.title}` : ''}</span></td>
                <td className="px-3 py-2 text-right">{money(r.due)}</td>
                <td className="px-3 py-2 text-right">{money(r.bonus)}</td>
                <td className="px-3 py-2 text-right">{money(r.ded)}</td>
                <td className="px-3 py-2 text-right">{money(r.adv)}</td>
                <td className="px-3 py-2 text-right">{money(r.paid)}</td>
                <td className="px-3 py-2 text-right font-medium">{money(r.net)}</td>
                <td className="px-3 py-2">{r.pendingAck > 0 ? <span className="text-amber-700">{r.pendingAck} confirm baaki</span> : r.any ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-clinic-ink/50">Salary ki raqam staff ke profile se aati hai (aap ne likhi hui). Dastkhat = staff ne apne portal par advance/ada raqam ki tasdeeq ki ya nahi.</p>
      <div className="mt-4 print:hidden"><PrintButton /></div>
    </div>
  )
}

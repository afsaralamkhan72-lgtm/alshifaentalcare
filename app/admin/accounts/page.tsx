import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissions, getStaffProfile, isOwnerRole } from '@/lib/auth'
import { money, todayKarachi } from '@/lib/karachi'

/** Accounts: paise ki saari cheezein aik page par. Har number database ki asli entries se. */
export default async function AccountsPage() {
  const staff = await getStaffProfile()
  const perms = await getPermissions()
  const owner = isOwnerRole(staff.role)
  const can = (p: string) => owner || perms.includes(p)
  if (!can('billing.view') && !can('reports.view') && !can('expenses.manage')) redirect('/admin/dashboard?denied=1')

  const supabase = await createClient()
  const today = todayKarachi()
  const monthStart = `${today.slice(0, 7)}-01`
  const [dayRes, monthRes, refundRes, dueRes] = await Promise.all([
    can('reports.view') ? supabase.rpc('day_summary', { p_date: today }) : Promise.resolve({ data: null, error: null }),
    can('reports.view') ? supabase.rpc('report_summary', { p_from: monthStart, p_to: today }) : Promise.resolve({ data: null, error: null }),
    can('billing.view') ? supabase.from('payments').select('amount').eq('kind', 'refund').gte('paid_on', monthStart) : Promise.resolve({ data: [] }),
    can('billing.view') ? supabase.from('patient_balances').select('balance').gt('balance', 0) : Promise.resolve({ data: [] }),
  ])
  const day = (dayRes.data ?? null) as null | { cash_in: number; other_in: number; cash_out: number; other_out: number; closed: boolean }
  const month = (monthRes.data ?? null) as null | { income: number; expense: number; income_by_method: Record<string, number> }
  const refunds = (refundRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const dues = (dueRes.data ?? []) as { balance: number }[]
  const dueTotal = dues.reduce((s, r) => s + Number(r.balance), 0)

  const tiles = [
    day && { l: 'Aaj ki wasooli', v: money(Number(day.cash_in) + Number(day.other_in)), sub: `Cash ${money(day.cash_in)} · Online ${money(day.other_in)}`, c: 'text-emerald-700' },
    day && { l: 'Aaj ke kharche', v: money(Number(day.cash_out) + Number(day.other_out)), sub: day.closed ? 'Din band ho chuka' : 'Din abhi khula hai', c: 'text-red-600' },
    can('billing.view') && { l: 'Kul baqaya (patients)', v: money(dueTotal), sub: `${dues.length} patients`, c: 'text-red-600' },
    month && { l: 'Is mahine wasooli', v: money(month.income), sub: Object.entries(month.income_by_method ?? {}).map(([k, v]) => `${k} ${money(v)}`).join(' · '), c: 'text-clinic-ink' },
    month && { l: 'Is mahine kharche', v: money(month.expense), sub: '', c: 'text-clinic-ink' },
    can('billing.view') && { l: 'Is mahine refund', v: money(refunds), sub: '', c: 'text-clinic-ink' },
  ].filter(Boolean) as { l: string; v: string; sub: string; c: string }[]

  const links = [
    { href: '/admin/closing', l: 'Din ki closing', d: 'Raat ko cash gin kar din band karein', show: can('billing.collect') || can('reports.view') },
    { href: '/admin/dues', l: 'Baqaya', d: 'Kis ka kitna baqi hai, payment lein', show: can('billing.view') },
    { href: '/admin/invoices', l: 'Bills', d: 'Sab bills, refund, cancel, print', show: can('billing.view') },
    { href: '/admin/expenses', l: 'Kharche', d: 'Kiraya, bijli, samaan wagera', show: can('expenses.manage') },
    { href: '/admin/payroll', l: 'Staff salary', d: 'Tankhwa aur advance', show: owner },
    { href: '/admin/summary', l: 'Reports', d: 'Munafa, mahine ki report, hisaab check', show: can('reports.view') },
  ].filter((x) => x.show)

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Accounts</h1>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.l} className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
            <p className="text-xs text-clinic-ink/50">{t.l}</p>
            <p className={`mt-1 font-display text-2xl font-semibold ${t.c}`}>{t.v}</p>
            {t.sub && <p className="mt-1 text-xs capitalize text-clinic-ink/50">{t.sub}</p>}
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((x) => (
          <Link key={x.href} href={x.href} className="rounded-2xl border border-clinic-teal/15 bg-white p-5 transition-colors hover:border-clinic-teal">
            <p className="font-display text-lg font-semibold text-clinic-teal">{x.l} →</p>
            <p className="mt-1 text-sm text-clinic-ink/60">{x.d}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

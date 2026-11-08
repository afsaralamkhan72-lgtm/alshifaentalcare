import { createClient } from '@/lib/supabase/server'
import { requireAnyPerm } from '@/lib/auth'
import { todayKarachi, numFmt } from '@/lib/karachi'
import ClosingPanel, { type Summary, type ClosingRow } from '@/components/admin/ClosingPanel'
import SectionTabs from '@/components/admin/SectionTabs'

export default async function ClosingPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAnyPerm('billing.collect', 'reports.view')
  const sp = await searchParams
  const today = todayKarachi()
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? '') && (sp.date as string) <= today ? (sp.date as string) : today

  const supabase = await createClient()
  const { data: summary, error } = await supabase.rpc('day_summary', { p_date: date })
  if (error || !summary) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Din ki Closing</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">Supabase mein <strong>phase8-closing.sql</strong> chalayein (pehle test project par).</p>
        </div>
      </div>
    )
  }
  const { data: history } = await supabase
    .from('day_closings')
    .select('close_date, expected_cash, counted_cash, difference, note, closed_by_name')
    .order('close_date', { ascending: false })
    .limit(60)

  // Closing ke BAAD aayi hui payments (closing ka hisaab un ke bina bana tha)
  let late = { n: 0, cash: 0, total: 0 }
  const { data: closed } = await supabase.from('day_closings').select('closed_at').eq('close_date', date).maybeSingle()
  if (closed?.closed_at) {
    const { data: lp } = await supabase.from('payments').select('amount, method, kind').eq('paid_on', date).gt('created_at', closed.closed_at as string)
    for (const r of (lp ?? []) as { amount: number; method: string; kind: string }[]) {
      if (r.kind === 'refund') continue
      late = { n: late.n + 1, cash: late.cash + (r.method === 'cash' ? Number(r.amount) : 0), total: late.total + Number(r.amount) }
    }
  }

  return (
    <div>
      <SectionTabs which="accounts" />
      {late.n > 0 && (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Dhyan dein: is din ki closing ke baad {late.n} payment aayi (kul Rs. {numFmt(late.total)}, us mein cash Rs. {numFmt(late.cash)}). Closing ka hisaab in ke bina bana tha, is liye drawer ki ginti mein itna farq ho sakta hai.
        </p>
      )}
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Din ki Closing</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">Raat ko drawer ka cash gin kar system ke hisaab se milayein.</p>
      <div className="mt-6">
        <ClosingPanel summary={summary as Summary} history={(history ?? []) as ClosingRow[]} today={today} />
      </div>
    </div>
  )
}

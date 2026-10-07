import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import { todayKarachi } from '@/lib/karachi'
import ClosingPanel, { type Summary, type ClosingRow } from '@/components/admin/ClosingPanel'

export default async function ClosingPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireOwner()
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

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Din ki Closing</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">Raat ko drawer ka cash gin kar system ke hisaab se milayein.</p>
      <div className="mt-6">
        <ClosingPanel summary={summary as Summary} history={(history ?? []) as ClosingRow[]} today={today} />
      </div>
    </div>
  )
}

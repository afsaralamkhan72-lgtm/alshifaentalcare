import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import { todayKarachi } from '@/lib/karachi'
import SummaryReport, { type ReportData } from '@/components/admin/SummaryReport'

export default async function SummaryPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireOwner()
  const sp = await searchParams
  const today = todayKarachi()
  const ok = (s?: string) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '')
  const from = ok(sp.from) ? (sp.from as string) : `${today.slice(0, 7)}-01`
  const to = ok(sp.to) ? (sp.to as string) : today

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_summary', { p_from: from, p_to: to })

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Munafa / Nuqsan Report</h1>
      <form className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label className="text-xs text-clinic-ink/50">Se</label>
          <input type="date" name="from" defaultValue={from} className="block rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-clinic-ink/50">Tak</label>
          <input type="date" name="to" defaultValue={to} className="block rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
        </div>
        <button className="rounded-lg bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">Dekhein</button>
      </form>
      <div className="mt-6">
        {error || !data ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            {error?.message?.includes('Tareekh') || error?.message?.includes('lambi')
              ? error.message
              : 'Database setup baaki hai: phase8-closing.sql chalayein.'}
          </div>
        ) : (
          <SummaryReport d={data as ReportData} />
        )}
      </div>
    </div>
  )
}

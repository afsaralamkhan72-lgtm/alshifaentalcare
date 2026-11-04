import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import { getPrintCfg } from '@/lib/printSettings'
import SheetPrintButton from '@/components/admin/SheetPrintButton'
import SalarySlip, { type SlipData } from '@/components/print/SalarySlip'
import { timingsLine } from '@/clinic.config'

export const dynamic = 'force-dynamic'

/** Staff ki salary parchi (print / PDF): minute ke hisab se tankhwah, katauti, overtime, advance aur baqaya. */
export default async function SlipPage({ searchParams }: { searchParams: Promise<{ staff?: string; m?: string }> }) {
  await requireOwner()
  const sp = await searchParams
  if (!sp.staff || !sp.m || !/^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m)) notFound()
  const supabase = await createClient()

  const [calcRes, perRes, ledRes, cfg, clinicRes] = await Promise.all([
    supabase.rpc('payroll_calc', { p_period: sp.m, p_staff: sp.staff }),
    supabase.from('payroll_periods').select('snapshot, finalized_at').eq('staff_id', sp.staff).eq('period', sp.m).maybeSingle(),
    supabase
      .from('staff_ledger')
      .select('entry_date, kind, amount, note, method')
      .eq('staff_id', sp.staff)
      .eq('period', sp.m)
      .order('entry_date')
      .order('created_at'),
    getPrintCfg(),
    supabase.from('site_settings').select('value').eq('key', 'clinic_info').maybeSingle(),
  ])
  const live = ((calcRes.data ?? []) as Record<string, unknown>[])[0]
  const snap = (perRes.data?.snapshot ?? null) as Record<string, unknown> | null
  const row = snap ?? live
  if (!row) notFound()
  const num = (k: string) => Number(row[k] ?? 0)
  const info = (clinicRes.data?.value ?? {}) as { logo_url?: string; closed_day?: string }

  const data: SlipData = {
    period: sp.m,
    name: String(row.full_name),
    title: (row.title as string | null) ?? null,
    finalized: !!snap,
    salary: num('monthly_salary'),
    monthMin: num('month_min'),
    effMin: num('eff_min'),
    effFrom: String(row.eff_from),
    rate: num('rate_per_min'),
    entitled: num('entitled'),
    present: num('present'),
    absent: num('absent'),
    leaveUnpaid: num('leave_unpaid'),
    lateMin: num('late_min'),
    earlyMin: num('early_min'),
    absentMin: num('absent_min'),
    otMin: num('ot_min'),
    cutLate: num('cut_late'),
    cutEarly: num('cut_early'),
    cutAbsent: num('cut_absent'),
    otAmount: num('ot_amount'),
    net: num('net'),
    entries: (ledRes.data ?? []).map((l) => ({ date: l.entry_date as string, kind: l.kind as string, amount: Number(l.amount), note: (l.note as string | null) ?? null })),
    timings: timingsLine(info.closed_day),
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/attendance?t=mahina&m=${sp.m}`} className="text-sm text-clinic-ink/50 hover:text-clinic-teal">← Hazri</Link>
        <SheetPrintButton />
      </div>
      <SalarySlip d={data} logo={cfg.logo} logoUrl={info.logo_url ?? null} layout={cfg.layout} />
    </div>
  )
}

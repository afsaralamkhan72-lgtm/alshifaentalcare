import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { money } from '@/lib/karachi'

interface Summary {
  cash_in: number
  cash_out: number
  expected_cash: number
  other_in: number
  invoices_count: number
  invoices_total: number
  closed: boolean
  difference: number | null
  late_entries: number
}

/** Sirf doctor/admin ke dashboard par: aaj ka cash, closing ki halat, lab/staff ko dena, taza activity */
export default async function OwnerToday() {
  const supabase = await createClient()
  const { data: s } = await supabase.rpc('day_summary')
  const sum = (s ?? null) as Summary | null

  const [labRes, staffRes, actRes, lastCloseRes] = await Promise.all([
    supabase.from('lab_cases').select('cost, lab_paid').is('deleted_at', null).gt('cost', 0),
    supabase.from('staff_balances').select('balance'),
    supabase
      .from('audit_log')
      .select('id, created_at, actor_name, action, table_name, new_data, old_data')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('day_closings').select('close_date').order('close_date', { ascending: false }).limit(1),
  ])

  if (!sum) return null // phase8 SQL abhi nahi chali

  const labOwed = (labRes.data ?? []).reduce((a, r) => a + Math.max(0, Number(r.cost) - Number(r.lab_paid)), 0)
  const staffOwed = (staffRes.data ?? []).reduce((a, r) => a + Math.max(0, Number(r.balance)), 0)
  const lastClose = lastCloseRes.data?.[0]?.close_date as string | undefined

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-5 lg:col-span-2">
        <div className="flex items-center justify-between">
          <p className="font-display font-semibold text-clinic-ink">Aaj ka hisaab</p>
          <Link href="/admin/closing" className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white">
            {sum.closed ? 'Closing dekhein' : 'Din band karein'}
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="Cash aaya" value={money(sum.cash_in)} tone="green" />
          <Mini label="Cash gaya" value={money(sum.cash_out)} tone="red" />
          <Mini label="Cash hona chahiye" value={money(sum.expected_cash)} />
          <Mini label="Bank/Wallet aaya" value={money(sum.other_in)} />
        </div>
        <p className="mt-3 text-xs text-clinic-ink/50">
          Aaj {sum.invoices_count} invoice, kul {money(sum.invoices_total)}.{' '}
          {sum.closed
            ? Number(sum.difference ?? 0) === 0
              ? 'Closing ho chuki, cash bilkul theek.'
              : `Closing ho chuki, farq ${money(sum.difference)}.`
            : lastClose
              ? `Akhri closing: ${lastClose}.`
              : 'Abhi tak koi closing nahi hui.'}
          {sum.late_entries > 0 && (
            <span className="font-semibold text-amber-700"> Closing ke baad {sum.late_entries} nayi entry aayi.</span>
          )}
        </p>
      </section>

      <section className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
        <p className="font-display font-semibold text-clinic-ink">Dena hai</p>
        <div className="mt-3 grid gap-2 text-sm">
          <Link href="/admin/lab" className="flex justify-between">
            <span className="text-clinic-ink/60">Lab ko</span>
            <span className="font-semibold text-clinic-ink">{money(labOwed)}</span>
          </Link>
          <Link href="/admin/payroll" className="flex justify-between">
            <span className="text-clinic-ink/60">Staff ko</span>
            <span className="font-semibold text-clinic-ink">{money(staffOwed)}</span>
          </Link>
        </div>
      </section>

      {(actRes.data ?? []).length > 0 && (
        <section className="rounded-2xl border border-clinic-teal/10 bg-white p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <p className="font-display font-semibold text-clinic-ink">Taza activity</p>
            <Link href="/admin/audit" className="text-xs text-clinic-teal underline">Poora Audit Log</Link>
          </div>
          <div className="mt-3 divide-y divide-clinic-teal/10 text-sm">
            {(actRes.data ?? []).map((r) => {
              const d = (r.new_data ?? r.old_data ?? {}) as Record<string, unknown>
              const label = String(d.full_name ?? d.treatment_name ?? d.title ?? d.item_name ?? d.invoice_number ?? '')
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span className="text-clinic-ink/80">
                    <span className="font-medium">{r.actor_name ?? 'System'}</span> · {r.action} · {r.table_name}
                    {label ? ` · ${label}` : ''}
                  </span>
                  <span className="text-xs text-clinic-ink/40">
                    {new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', hour12: true })}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  const c = tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-600' : 'text-clinic-ink'
  return (
    <div className="rounded-xl bg-clinic-mint/60 p-3">
      <p className={`font-display font-semibold ${c}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-clinic-ink/50">{label}</p>
    </div>
  )
}

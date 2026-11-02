import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAnyPerm } from '@/lib/auth'
import { todayKarachi, addDays, money } from '@/lib/karachi'
import DocLink from '@/components/admin/DocLink'
import PrintButton from '@/components/admin/PrintButton'

export const dynamic = 'force-dynamic'

type Mv = { id: number; created_at: string; qty_change: number; total_cost: number | null; inventory: { item_name: string; unit: string | null } | { item_name: string; unit: string | null }[] | null }
type Meta = { movement_id: number; supplier: string | null; company: string | null; bill_no: string | null; bill_path: string | null; packs: number | null; units_per_pack: number | null; expiry_date: string | null }

export default async function PurchaseReportPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireAnyPerm('inventory.manage', 'reports.view')
  const sp = await searchParams
  const today = todayKarachi()
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? (sp.month as string) : today.slice(0, 7)
  const next = addDays(`${month}-28`, 5).slice(0, 7)
  const prev = addDays(`${month}-01`, -1).slice(0, 7)
  const sb = await createClient()
  const { data } = await sb
    .from('inventory_movements')
    .select('id, created_at, qty_change, total_cost, inventory(item_name, unit)')
    .eq('kind', 'purchase')
    .gte('created_at', `${month}-01T00:00:00+05:00`)
    .lt('created_at', `${next}-01T00:00:00+05:00`)
    .order('created_at', { ascending: false })
    .limit(1000)
  const mv = (data ?? []) as unknown as Mv[]
  const ids = mv.map((m) => m.id)
  const metaRes = ids.length ? await sb.from('inventory_purchase_meta').select('movement_id, supplier, company, bill_no, bill_path, packs, units_per_pack, expiry_date').in('movement_id', ids) : { data: [] as Meta[] }
  const meta = new Map<number, Meta>(((metaRes.data ?? []) as Meta[]).map((m) => [m.movement_id, m]))
  const one = <T,>(x: T | T[] | null) => (Array.isArray(x) ? x[0] ?? null : x)
  const total = mv.reduce((s, m) => s + Number(m.total_cost ?? 0), 0)
  const bySupplier = new Map<string, number>()
  for (const m of mv) { const k = meta.get(m.id)?.supplier ?? 'Supplier nahi likha'; bySupplier.set(k, (bySupplier.get(k) ?? 0) + Number(m.total_cost ?? 0)) }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Kharid ki report</h1>
          <p className="mt-1 text-sm text-clinic-ink/60"><Link href="/admin/inventory" className="underline">← Stock</Link></p>
        </div>
        <div className="flex items-center gap-2 text-sm print:hidden">
          <Link href={`/admin/inventory/purchases?month=${prev}`} className="rounded-full border border-clinic-teal/20 px-3 py-1">← {prev}</Link>
          <span className="rounded-full bg-clinic-teal px-3 py-1 text-white">{month}</span>
          {next <= today.slice(0, 7) && <Link href={`/admin/inventory/purchases?month=${next}`} className="rounded-full border border-clinic-teal/20 px-3 py-1">{next} →</Link>}
        </div>
      </div>
      <p className="mt-4 text-sm">Is mahine ki kul kharid: <strong data-testid="purchase-total">{money(total)}</strong> ({mv.length} entries)</p>
      {bySupplier.size > 0 && <p className="mt-1 text-xs text-clinic-ink/60">{[...bySupplier.entries()].map(([k, v]) => `${k}: ${money(v)}`).join(' · ')}</p>}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60"><tr><th className="px-3 py-2">Tareekh</th><th className="px-3 py-2">Cheez</th><th className="px-3 py-2">Pack / Qty</th><th className="px-3 py-2">Supplier / Company</th><th className="px-3 py-2">Bill</th><th className="px-3 py-2 text-right">Raqam</th></tr></thead>
          <tbody>
            {mv.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-clinic-ink/50">Is mahine koi kharid nahi.</td></tr>}
            {mv.map((m) => {
              const x = meta.get(m.id); const it = one(m.inventory)
              return (
                <tr key={m.id} className="border-t border-clinic-teal/10">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(m.created_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' })}</td>
                  <td className="px-3 py-2">{it?.item_name}</td>
                  <td className="px-3 py-2">{x?.packs ? `${Number(x.packs)} × ${Number(x.units_per_pack)} = ` : ''}{Number(m.qty_change)} {it?.unit}{x?.expiry_date ? ` · exp ${x.expiry_date}` : ''}</td>
                  <td className="px-3 py-2">{[x?.supplier, x?.company].filter(Boolean).join(' / ') || '—'}</td>
                  <td className="px-3 py-2">{x?.bill_no ?? ''} {x?.bill_path && <DocLink path={x.bill_path} label="Photo" />}</td>
                  <td className="px-3 py-2 text-right">{m.total_cost ? money(Number(m.total_cost)) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <PrintButton />
    </div>
  )
}

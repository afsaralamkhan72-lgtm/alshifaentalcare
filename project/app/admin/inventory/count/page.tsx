import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import StockCountForm, { type CountItem } from '@/components/admin/StockCountForm'
import { fmtDate } from '@/lib/karachi'

export default async function StockCountPage() {
  await requireOwner()
  const supabase = await createClient()

  const [itemsRes, countsRes] = await Promise.all([
    supabase.from('inventory').select('id, item_name, unit, quantity, is_active').order('item_name'),
    supabase
      .from('stock_counts')
      .select('id, counted_on, expected, actual, diff, note, counted_by_name, inventory(item_name, unit)')
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  if (itemsRes.error || countsRes.error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Stock Ginti</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase mein <strong>phase5-inventory.sql</strong> chalayein (pehle test project par).
          </p>
        </div>
      </div>
    )
  }

  const items = (itemsRes.data ?? [])
    .filter((i) => i.is_active !== false)
    .map((i) => ({ id: i.id, item_name: i.item_name, unit: i.unit, quantity: Number(i.quantity) })) as CountItem[]

  const counts = (countsRes.data ?? []) as unknown as {
    id: number
    counted_on: string
    expected: number
    actual: number
    diff: number
    counted_by_name: string | null
    inventory: { item_name: string; unit: string | null } | null
  }[]

  return (
    <div>
      <Link href="/admin/inventory" className="text-sm text-clinic-ink/50 hover:text-clinic-teal">← Inventory</Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-clinic-ink">Stock Ginti</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Shelf par jo asal mein hai wo likhein. System ke hisaab se jo hona chahiye tha uska farq record hota hai, taake
        kam hone wala samaan nazar aaye.
      </p>

      <div className="mt-6">
        <StockCountForm items={items} />
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold text-clinic-ink">Pichli ginti</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60">
            <tr>
              <th className="px-4 py-3">Tareekh</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">System</th>
              <th className="px-4 py-3 text-right">Asal</th>
              <th className="px-4 py-3 text-right">Farq</th>
              <th className="px-4 py-3">Kis ne</th>
            </tr>
          </thead>
          <tbody>
            {counts.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-clinic-ink/50">Abhi koi ginti nahi hui.</td></tr>
            )}
            {counts.map((c) => (
              <tr key={c.id} className="border-t border-clinic-teal/10">
                <td className="px-4 py-2">{fmtDate(c.counted_on)}</td>
                <td className="px-4 py-2">{c.inventory?.item_name ?? '—'}</td>
                <td className="px-4 py-2 text-right">{Number(c.expected)}</td>
                <td className="px-4 py-2 text-right">{Number(c.actual)}</td>
                <td className={`px-4 py-2 text-right font-semibold ${Number(c.diff) === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {Number(c.diff) > 0 ? '+' : ''}{Number(c.diff)}
                </td>
                <td className="px-4 py-2">{c.counted_by_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

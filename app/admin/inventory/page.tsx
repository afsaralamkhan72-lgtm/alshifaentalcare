import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import InventoryManager from '@/components/admin/InventoryManager'
import { getStaffProfile, isOwnerRole, requirePerm } from '@/lib/auth'

async function getInventory() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inventory')
    .select('id, item_name, category, quantity, unit, reorder_level, expiry_date, supplier')
    .order('item_name', { ascending: true })
  // is_active column Phase 5 se aata hai; null/true dono dikhein
  const { data: hidden } = await supabase.from('inventory').select('id').eq('is_active', false)
  const off = new Set((hidden ?? []).map((h) => h.id))
  const { data: meta } = await supabase.from('inventory_meta').select('inventory_id, company, is_qualitative')
  const { data: grp } = await supabase.from('inventory').select('id, item_group')
  const gmap = new Map((grp ?? []).map((g) => [g.id as string, ((g as { item_group?: string | null }).item_group ?? null) as string | null]))
  const m = new Map((meta ?? []).map((x) => [x.inventory_id as string, x]))
  // description / deleted_at / merged_into part4 SQL ke baad aate hain; na hon to error ko nazar-andaz karein
  const { data: desc } = await supabase.from('inventory').select('id, description')
  const dmap = new Map(((desc ?? []) as { id: string; description: string | null }[]).map((d) => [d.id, d.description]))
  return (data ?? []).filter((i) => !off.has(i.id)).map((i) => ({ ...i, item_group: gmap.get(i.id) ?? null, description: dmap.get(i.id) ?? null, qualitative: Boolean(m.get(i.id)?.is_qualitative), company: (m.get(i.id)?.company as string | null) ?? null }))
}

async function getArchivedAndFlags() {
  const supabase = await createClient()
  const [arch, flags] = await Promise.all([
    supabase.from('inventory').select('id, item_name, category, quantity, unit').eq('is_active', false).is('deleted_at', null).is('merged_into', null).order('item_name'),
    supabase.rpc('inventory_item_flags'),
  ])
  const flagsOk = !flags.error
  const hasHistory: Record<string, boolean> = {}
  for (const f of (flags.data ?? []) as { inventory_id: string; has_history: boolean }[]) hasHistory[f.inventory_id] = f.has_history
  return { archived: (arch.error ? [] : (arch.data ?? [])) as { id: string; item_name: string; category: string; quantity: number; unit: string | null }[], hasHistory, flagsOk }
}

export default async function InventoryPage() {
  await requirePerm('inventory.view')
  const profile = await getStaffProfile()
  const canManage = isOwnerRole(profile.role)
  const items = await getInventory()
  const extra = canManage ? await getArchivedAndFlags() : { archived: [], hasHistory: {} as Record<string, boolean>, flagsOk: false }
  // Pichle 30 din ka istemal dekh kar andaza: stock kitne din chalega
  const forecast: Record<string, number> = {}
  if (canManage) {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const { data: mv } = await (await createClient()).from('inventory_movements').select('inventory_id, qty_change').eq('kind', 'usage').gte('created_at', since)
    const used = new Map<string, number>()
    for (const m of mv ?? []) used.set(m.inventory_id as string, (used.get(m.inventory_id as string) ?? 0) + Math.abs(Number(m.qty_change)))
    for (const i of items) {
      const u = used.get(i.id) ?? 0
      if (u > 0 && Number(i.quantity) > 0) forecast[i.id] = Number(i.quantity) / (u / 30)
    }
  }

  const gapRes = canManage ? await (await createClient()).rpc('inventory_reconcile') : { data: [] as unknown[] }
  const gaps = ((gapRes.data ?? []) as { inventory_id: string; item_name: string; quantity: number; movements_sum: number; opening_gap: number }[])

  const lowStock = items.filter((i) => Number(i.reorder_level) > 0 && Number(i.quantity) <= Number(i.reorder_level))
  const expiringSoon = items.filter((i) => {
    if (!i.expiry_date) return false
    const days = (new Date(i.expiry_date).getTime() - Date.now()) / 86_400_000
    return days <= 30
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/dashboard" className="mb-2 inline-block text-sm text-clinic-ink/50 hover:text-clinic-teal">← Home</Link>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Stock</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">
            Dental materials aur homeopathic medicines ka stock.
          </p>
        </div>
        {canManage && (
          <>
          <Link href="/admin/inventory/purchases" className="mr-2 rounded-full border border-clinic-teal px-5 py-2.5 text-sm font-semibold text-clinic-teal">
            Kharid ki report
          </Link>
          <Link href="/admin/inventory/count" className="rounded-full border border-clinic-teal px-5 py-2.5 text-sm font-semibold text-clinic-teal">
            Stock Ginti
          </Link>
          </>
        )}
      </div>

      {(lowStock.length > 0 || expiringSoon.length > 0) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {lowStock.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                {lowStock.length} item(s) low stock par hain
              </p>
              <p className="mt-1 text-xs text-red-600">
                {lowStock.map((i) => i.item_name).join(', ')}
              </p>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-700">
                {expiringSoon.length} item(s) 30 din mein expire ho rahe hain
              </p>
              <p className="mt-1 text-xs text-amber-600">
                {expiringSoon.map((i) => i.item_name).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
      {gaps.length > 0 && (
        <details className="mt-3 rounded-xl border border-clinic-teal/15 bg-white p-3 text-sm" data-testid="stock-gap">
          <summary className="cursor-pointer font-semibold text-clinic-ink/80">{gaps.length} item ka purana (opening) stock movement ke baghair darj hai</summary>
          <p className="mt-2 text-xs text-clinic-ink/60">Ye purana stock hai jo pehle seedha likha gaya tha. Kuch badla nahi gaya. Agar ginti theek hai to &quot;Stock ginti&quot; karein, taake record saaf ho jaye.</p>
          <ul className="mt-2 space-y-0.5 text-xs">
            {gaps.map((g) => (<li key={g.inventory_id}>{g.item_name}: stock {Number(g.quantity)}, movements {Number(g.movements_sum)}, purana stock {Number(g.opening_gap)}</li>))}
          </ul>
        </details>
      )}

        <InventoryManager items={items} canManage={canManage} forecast={forecast} archived={extra.archived} hasHistory={extra.hasHistory} flagsOk={extra.flagsOk} />
      </div>
    </div>
  )
}

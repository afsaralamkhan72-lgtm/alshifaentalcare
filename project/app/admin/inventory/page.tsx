import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import InventoryManager from '@/components/admin/InventoryManager'
import { getStaffProfile, isOwnerRole } from '@/lib/auth'

async function getInventory() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inventory')
    .select('id, item_name, category, quantity, unit, reorder_level, expiry_date, supplier')
    .order('item_name', { ascending: true })
  // is_active column Phase 5 se aata hai; null/true dono dikhein
  const { data: hidden } = await supabase.from('inventory').select('id').eq('is_active', false)
  const off = new Set((hidden ?? []).map((h) => h.id))
  return (data ?? []).filter((i) => !off.has(i.id))
}

export default async function InventoryPage() {
  const profile = await getStaffProfile()
  const canManage = isOwnerRole(profile.role)
  const items = await getInventory()

  const lowStock = items.filter((i) => Number(i.quantity) <= Number(i.reorder_level))
  const expiringSoon = items.filter((i) => {
    if (!i.expiry_date) return false
    const days = (new Date(i.expiry_date).getTime() - Date.now()) / 86_400_000
    return days <= 30
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Inventory &amp; Stock</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">
            Dental materials aur homeopathic medicines ka stock.
          </p>
        </div>
        {canManage && (
          <Link href="/admin/inventory/count" className="rounded-full border border-clinic-teal px-5 py-2.5 text-sm font-semibold text-clinic-teal">
            Stock Ginti
          </Link>
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
        <InventoryManager items={items} canManage={canManage} />
      </div>
    </div>
  )
}

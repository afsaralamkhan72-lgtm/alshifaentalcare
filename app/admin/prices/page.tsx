import { createClient } from '@/lib/supabase/server'
import { requireAnyPerm } from '@/lib/auth'
import PriceListManager, { type CatalogRow } from '@/components/admin/PriceListManager'

export default async function PricesPage() {
  await requireAnyPerm('settings.manage')
  const supabase = await createClient()

  const listQuery = (cols: string) =>
    supabase.from('treatment_catalog').select(cols).order('is_active', { ascending: false }).order('sort_order').order('name')
  const [catWith, counterRes, invRes] = await Promise.all([
    listQuery('id, name, department, price, is_active, category, sort_order, applies_to, price_note'),
    supabase.from('invoice_counter').select('prefix, next_no').eq('id', 1).maybeSingle(),
    supabase.from('inventory').select('id, item_name, unit').order('item_name'),
  ])

  // Naya column (applies_to) abhi database mein na ho (SQL baad mein chali) to purani list hi dikhao
  const catRes = catWith.error ? await listQuery('id, name, department, price, is_active, category, sort_order') : catWith // (price_note na ho to purani list)

  if (catRes.error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Treatment Prices</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase mein <strong>phase3-prices-invoices.sql</strong> chalayein (pehle test project par).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Treatment Prices</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Doctor ki qeematein. Nayi treatment chunte hi yahin se qeemat aati hai (treatment par badal bhi sakte hain). Qeemat badalne se purane bill nahi badalte.
      </p>
      <PriceListManager
        inventory={(invRes.data ?? []) as { id: string; item_name: string; unit: string | null }[]}
        rows={((catRes.data ?? []) as unknown as CatalogRow[]).map((r) => ({ ...r, price: Number(r.price) }))}
        hasAppliesTo={!catWith.error}
        nextInvoice={counterRes.data ? { prefix: counterRes.data.prefix, next_no: counterRes.data.next_no } : null}
      />
    </div>
  )
}

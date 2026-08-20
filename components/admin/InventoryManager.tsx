'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface InventoryItem {
  id: string
  item_name: string
  category: 'dental' | 'homeopathic' | 'general'
  quantity: number
  unit: string | null
  reorder_level: number
  expiry_date: string | null
  supplier: string | null
}

const INITIAL = {
  item_name: '',
  category: 'dental' as InventoryItem['category'],
  quantity: '',
  unit: 'pcs',
  reorder_level: '5',
  expiry_date: '',
  supplier: '',
}

export default function InventoryManager({ items }: { items: InventoryItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: insertError } = await supabase.from('inventory').insert({
      item_name: form.item_name,
      category: form.category,
      quantity: Number(form.quantity || 0),
      unit: form.unit || 'pcs',
      reorder_level: Number(form.reorder_level || 0),
      expiry_date: form.expiry_date || null,
      supplier: form.supplier || null,
    })

    setSaving(false)
    if (insertError) {
      setError('Item save nahi hua.')
      return
    }

    setForm(INITIAL)
    setOpen(false)
    router.refresh()
  }

  // Quick +/- stock adjustment straight from the table
  async function adjust(item: InventoryItem, delta: number) {
    const next = Math.max(0, Number(item.quantity) + delta)
    setBusyId(item.id)

    const supabase = createClient()
    await supabase
      .from('inventory')
      .update({ quantity: next, last_updated: new Date().toISOString() })
      .eq('id', item.id)

    setBusyId(null)
    router.refresh()
  }

  const inputClass =
    'w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light"
      >
        + Add Item
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">Add Inventory Item</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40 hover:text-clinic-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleAdd} className="mt-4 grid gap-3">
              <input
                required
                placeholder="Item Name"
                value={form.item_name}
                onChange={(e) => update('item_name', e.target.value)}
                className={inputClass}
              />
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value as InventoryItem['category'])}
                className={inputClass}
              >
                <option value="dental">Dental Material</option>
                <option value="homeopathic">Homeopathic Medicine</option>
                <option value="general">General</option>
              </select>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Qty"
                  value={form.quantity}
                  onChange={(e) => update('quantity', e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Unit"
                  value={form.unit}
                  onChange={(e) => update('unit', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Alert at"
                  value={form.reorder_level}
                  onChange={(e) => update('reorder_level', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-clinic-ink/50">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => update('expiry_date', e.target.value)}
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <input
                placeholder="Supplier (optional)"
                value={form.supplier}
                onChange={(e) => update('supplier', e.target.value)}
                className={inputClass}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Item'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3 text-right">Adjust</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const low = Number(item.quantity) <= Number(item.reorder_level)
              const expired = item.expiry_date && new Date(item.expiry_date) < new Date()

              return (
                <tr key={item.id} className="border-t border-clinic-teal/10">
                  <td className="px-4 py-3 font-medium text-clinic-ink">{item.item_name}</td>
                  <td className="px-4 py-3 capitalize text-clinic-ink/60">{item.category}</td>
                  <td className="px-4 py-3">
                    <span className={low ? 'font-semibold text-red-600' : 'text-clinic-ink'}>
                      {Number(item.quantity)} {item.unit}
                    </span>
                    {low && (
                      <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        Low Stock
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.expiry_date ? (
                      <span className={expired ? 'font-semibold text-red-600' : 'text-clinic-ink/60'}>
                        {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                        {expired && ' (expired)'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-clinic-ink/60">{item.supplier ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => adjust(item, -1)}
                        disabled={busyId === item.id}
                        className="h-7 w-7 rounded-full bg-clinic-mint font-semibold text-clinic-teal disabled:opacity-40"
                      >
                        −
                      </button>
                      <button
                        onClick={() => adjust(item, 1)}
                        disabled={busyId === item.id}
                        className="h-7 w-7 rounded-full bg-clinic-mint font-semibold text-clinic-teal disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-clinic-ink/50">
                  Koi item add nahi hua abhi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

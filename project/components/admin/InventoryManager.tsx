'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface InventoryItem {
  id: string
  item_name: string
  category: 'dental' | 'homeopathic' | 'general'
  quantity: number
  unit: string | null
  reorder_level: number
  expiry_date: string | null
  supplier: string | null
}

interface Movement {
  id: number
  created_at: string
  kind: string
  qty_change: number
  qty_after: number
  total_cost: number | null
  note: string | null
  created_by_name: string | null
}

const KIND_LABEL: Record<string, string> = {
  opening: 'Opening stock',
  purchase: 'Kharid',
  usage: 'Istemal',
  count_correction: 'Ginti ki durusti',
}

const INITIAL = {
  item_name: '',
  category: 'dental' as InventoryItem['category'],
  opening: '',
  unit: 'pcs',
  reorder_level: '5',
  expiry_date: '',
  supplier: '',
}

type Panel = { id: string; mode: 'use' | 'buy' | 'history' } | null

/**
 * Stock ab seedha +/- nahi hota. Har tabdeeli ek record (movement) banati hai:
 * kharid, istemal ya ginti. Reception sirf "Istemal" likh sakti hai.
 */
export default function InventoryManager({
  items,
  canManage,
}: {
  items: InventoryItem[]
  canManage: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [method, setMethod] = useState('cash')
  const [supplier, setSupplier] = useState('')
  const [rowMsg, setRowMsg] = useState('')
  const [moves, setMoves] = useState<Record<string, Movement[]>>({})

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { data: created, error: insertError } = await supabase
      .from('inventory')
      .insert({
        item_name: form.item_name.trim(),
        category: form.category,
        quantity: 0,
        unit: form.unit || 'pcs',
        reorder_level: Number(form.reorder_level || 0),
        expiry_date: form.expiry_date || null,
        supplier: form.supplier || null,
      })
      .select('id')
      .single()

    if (insertError || !created) {
      setSaving(false)
      setError('Item save nahi hua.')
      return
    }

    if (Number(form.opening) > 0) {
      const { error: openErr } = await supabase.rpc('record_purchase', {
        p_inventory_id: created.id,
        p_qty: Number(form.opening),
        p_total_cost: 0,
        p_kind: 'opening',
        p_key: crypto.randomUUID(),
      })
      if (openErr) {
        setSaving(false)
        setError(`Item ban gaya, par opening stock nahi likha gaya: ${openErr.message}`)
        router.refresh()
        return
      }
    }

    setSaving(false)
    setForm(INITIAL)
    setOpen(false)
    router.refresh()
  }

  function openPanel(id: string, mode: 'use' | 'buy' | 'history', item?: InventoryItem) {
    setRowMsg('')
    setQty('')
    setCost('')
    setSupplier(item?.supplier ?? '')
    setPanel({ id, mode })
    if (mode === 'history') loadHistory(id)
  }

  async function loadHistory(id: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('inventory_movements')
      .select('id, created_at, kind, qty_change, qty_after, total_cost, note, created_by_name')
      .eq('inventory_id', id)
      .order('created_at', { ascending: false })
      .limit(40)
    setMoves((m) => ({ ...m, [id]: (data ?? []) as Movement[] }))
  }

  async function submitUse(item: InventoryItem) {
    const n = Number(qty)
    if (!n || n <= 0) return setRowMsg('Qty likhein.')
    setSaving(true)
    setRowMsg('')
    const supabase = createClient()
    const { error: err } = await supabase.rpc('record_usage', {
      p_items: [{ inventory_id: item.id, qty: n }],
      p_note: 'Haath se istemal',
      p_key: crypto.randomUUID(),
    })
    setSaving(false)
    if (err) return setRowMsg(err.message)
    setPanel(null)
    router.refresh()
  }

  async function submitBuy(item: InventoryItem) {
    const n = Number(qty)
    if (!n || n <= 0) return setRowMsg('Qty likhein.')
    setSaving(true)
    setRowMsg('')
    const supabase = createClient()
    const { error: err } = await supabase.rpc('record_purchase', {
      p_inventory_id: item.id,
      p_qty: n,
      p_total_cost: Number(cost || 0),
      p_method: method,
      p_supplier: supplier || null,
      p_kind: 'purchase',
      p_key: crypto.randomUUID(),
    })
    setSaving(false)
    if (err) return setRowMsg(err.message)
    setPanel(null)
    router.refresh()
  }

  async function deactivate(item: InventoryItem) {
    if (!window.confirm(`"${item.item_name}" ko list se hata dein? Record rehta hai.`)) return
    const supabase = createClient()
    await supabase.from('inventory').update({ is_active: false }).eq('id', item.id)
    router.refresh()
  }

  const inputClass =
    'w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'
  const smallInput =
    'rounded-lg border border-clinic-teal/30 px-3 py-1.5 text-sm outline-none focus:border-clinic-teal'

  return (
    <>
      {canManage && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light"
        >
          + Naya Item
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">Naya Inventory Item</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40 hover:text-clinic-ink">✕</button>
            </div>

            <form onSubmit={handleAdd} className="mt-4 grid gap-3">
              <input required placeholder="Item ka naam" value={form.item_name} onChange={(e) => update('item_name', e.target.value)} className={inputClass} />
              <select value={form.category} onChange={(e) => update('category', e.target.value as InventoryItem['category'])} className={inputClass}>
                <option value="dental">Dental Material</option>
                <option value="homeopathic">Homeopathic Medicine</option>
                <option value="general">General</option>
              </select>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" step="0.01" min={0} placeholder="Abhi kitna hai" value={form.opening} onChange={(e) => update('opening', e.target.value)} className={inputClass} />
                <input placeholder="Unit" value={form.unit} onChange={(e) => update('unit', e.target.value)} className={inputClass} />
                <input type="number" step="0.01" placeholder="Alert at" value={form.reorder_level} onChange={(e) => update('reorder_level', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-clinic-ink/50">Expiry Date (optional)</label>
                <input type="date" value={form.expiry_date} onChange={(e) => update('expiry_date', e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
              <input placeholder="Supplier (optional)" value={form.supplier} onChange={(e) => update('supplier', e.target.value)} className={inputClass} />
              <p className="text-xs text-clinic-ink/50">"Abhi kitna hai" opening stock ke tor par likha jata hai (kharcha nahi banta).</p>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={saving} className="mt-2 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
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
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const low = Number(item.quantity) <= Number(item.reorder_level)
              const negative = Number(item.quantity) < 0
              const expired = item.expiry_date && new Date(item.expiry_date) < new Date()
              const p = panel?.id === item.id ? panel : null

              return (
                <Fragment key={item.id}>
                  <tr className="border-t border-clinic-teal/10">
                    <td className="px-4 py-3 font-medium text-clinic-ink">{item.item_name}</td>
                    <td className="px-4 py-3 capitalize text-clinic-ink/60">{item.category}</td>
                    <td className="px-4 py-3">
                      <span className={low ? 'font-semibold text-red-600' : 'text-clinic-ink'}>
                        {Number(item.quantity)} {item.unit}
                      </span>
                      {negative ? (
                        <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Ginti karein</span>
                      ) : low ? (
                        <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Low Stock</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {item.expiry_date ? (
                        <span className={expired ? 'font-semibold text-red-600' : 'text-clinic-ink/60'}>
                          {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                          {expired && ' (expired)'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-clinic-ink/60">{item.supplier ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3 text-xs font-semibold text-clinic-teal">
                        <button onClick={() => openPanel(item.id, 'use')}>Istemal</button>
                        {canManage && <button onClick={() => openPanel(item.id, 'buy', item)}>Kharid</button>}
                        {canManage && <button onClick={() => openPanel(item.id, 'history')}>History</button>}
                        {canManage && <button onClick={() => deactivate(item)} className="text-clinic-ink/40">Band</button>}
                      </div>
                    </td>
                  </tr>

                  {p?.mode === 'use' && (
                    <tr className="bg-clinic-sand/60">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-clinic-ink/60">Kitna istemal hua ({item.unit}):</span>
                          <input autoFocus type="number" step="0.01" min={0} value={qty} onChange={(e) => setQty(e.target.value)} className={`${smallInput} w-28`} />
                          <button onClick={() => submitUse(item)} disabled={saving} className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                          <button onClick={() => setPanel(null)} className="text-xs text-clinic-ink/50">Cancel</button>
                          {rowMsg && <span className="text-xs text-red-600">{rowMsg}</span>}
                        </div>
                      </td>
                    </tr>
                  )}

                  {p?.mode === 'buy' && (
                    <tr className="bg-clinic-sand/60">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input autoFocus type="number" step="0.01" min={0} value={qty} onChange={(e) => setQty(e.target.value)} placeholder={`Qty (${item.unit})`} className={`${smallInput} w-28`} />
                          <input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Kul qeemat Rs." className={`${smallInput} w-36`} />
                          <select value={method} onChange={(e) => setMethod(e.target.value)} className={smallInput}>
                            <option value="cash">Cash</option>
                            <option value="bank">Bank</option>
                            <option value="easypaisa">EasyPaisa</option>
                            <option value="jazzcash">JazzCash</option>
                          </select>
                          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier" className={`${smallInput} w-40`} />
                          <button onClick={() => submitBuy(item)} disabled={saving} className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Stock + Kharcha Save</button>
                          <button onClick={() => setPanel(null)} className="text-xs text-clinic-ink/50">Cancel</button>
                          {rowMsg && <span className="w-full text-xs text-red-600">{rowMsg}</span>}
                        </div>
                        <p className="mt-1 text-[11px] text-clinic-ink/50">Ek hi entry: stock barhta hai aur kharcha (Expenses mein) khud likha jata hai. Qeemat khali chhoray to kharcha nahi banega.</p>
                      </td>
                    </tr>
                  )}

                  {p?.mode === 'history' && (
                    <tr className="bg-clinic-sand/60">
                      <td colSpan={6} className="px-4 py-3 text-xs text-clinic-ink/70">
                        {(moves[item.id] ?? []).length === 0 && 'Koi record nahi.'}
                        {(moves[item.id] ?? []).map((m) => (
                          <p key={m.id}>
                            {new Date(m.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })} · {KIND_LABEL[m.kind] ?? m.kind} ·{' '}
                            <span className={Number(m.qty_change) < 0 ? 'text-red-700' : 'text-emerald-700'}>
                              {Number(m.qty_change) > 0 ? '+' : ''}{Number(m.qty_change)}
                            </span>{' '}
                            → {Number(m.qty_after)}
                            {m.total_cost ? ` · Rs. ${Number(m.total_cost).toLocaleString()}` : ''} · {m.created_by_name ?? '—'}
                            {m.note ? ` · ${m.note}` : ''}
                          </p>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-clinic-ink/50">Koi item add nahi hua abhi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DocUpload from '@/components/admin/DocUpload'

export interface InventoryItem {
  id: string
  item_name: string
  category: 'dental' | 'homeopathic' | 'general'
  quantity: number
  unit: string | null
  reorder_level: number
  expiry_date: string | null
  supplier: string | null
  qualitative?: boolean
  company?: string | null
  item_group?: string | null
  description?: string | null
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
  merge_in: 'Merge (doosre item se aaya)',
  merge_out: 'Merge (is item mein mil gaya)',
  return_supplier: 'Supplier ko wapas',
  damaged: 'Kharab / toota',
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

type Panel = { id: string; mode: 'use' | 'buy' | 'history' | 'ret' } | null

/**
 * Stock ab seedha +/- nahi hota. Har tabdeeli ek record (movement) banati hai:
 * kharid, istemal ya ginti. Reception sirf "Istemal" likh sakti hai.
 */
export default function InventoryManager({
  items,
  canManage,
  forecast = {},
  archived = [],
  hasHistory = {},
  flagsOk = false,
}: {
  items: InventoryItem[]
  archived?: { id: string; item_name: string; category: string; quantity: number; unit: string | null }[]
  hasHistory?: Record<string, boolean>
  flagsOk?: boolean
  canManage: boolean
  /** item id -> kitne din ka stock bacha (pichle 30 din ke istemal ke hisaab se) */
  forecast?: Record<string, number>
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
  const [upp, setUpp] = useState('1')
  const [company, setCompany] = useState('')
  const [billNo, setBillNo] = useState('')
  const [expiry, setExpiry] = useState('')
  const [billPath, setBillPath] = useState<string | null>(null)
  const [rowMsg, setRowMsg] = useState('')
  const [retKind, setRetKind] = useState<'damaged' | 'return_supplier'>('damaged')
  const [retNote, setRetNote] = useState('')
  const [retKey, setRetKey] = useState('')
  const [moves, setMoves] = useState<Record<string, Movement[]>>({})

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const nm = form.item_name.trim().toLowerCase()
    if (items.some((i) => i.category === form.category && i.item_name.trim().toLowerCase() === nm)) {
      setError('Ye item is category mein pehle se maujood hai. Dohra na banayein: list mein usi item par "Kharid" ya "Badlein" karein.')
      return
    }
    setSaving(true)

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

  function openPanel(id: string, mode: 'use' | 'buy' | 'history' | 'ret', item?: InventoryItem) {
    setRowMsg('')
    setRetKind('damaged'); setRetNote(''); setRetKey(crypto.randomUUID())
    setQty('')
    setCost('')
    setSupplier(item?.supplier ?? '')
    setUpp('1'); setCompany(''); setBillNo(''); setExpiry(''); setBillPath(null)
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

  async function submitReturn(item: InventoryItem) {
    const n = Number(qty)
    if (!n || n <= 0) return setRowMsg('Qty likhein.')
    if (n > Number(item.quantity)) return setRowMsg(`Itna stock maujood nahi (${item.quantity}).`)
    if (retKind === 'damaged' && !retNote.trim()) return setRowMsg('Kharabi ki wajah likhein.')
    if (retKind === 'return_supplier' && Number(cost || 0) < 0) return setRowMsg('Raqam ghalat hai.')
    setSaving(true)
    setRowMsg('')
    const { error: err } = await createClient().rpc('stock_return_or_damage', {
      p_inventory_id: item.id,
      p_qty: n,
      p_kind: retKind,
      p_refund: retKind === 'return_supplier' ? Number(cost || 0) : 0,
      p_method: method,
      p_note: retNote.trim() || null,
      p_key: retKey || null,
    })
    setSaving(false)
    if (err) return setRowMsg(err.message)
    setPanel(null)
    router.refresh()
  }

  async function submitBuy(item: InventoryItem) {
    const n = Number(qty)
    const u = Number(upp || 1)
    if (!n || n <= 0) return setRowMsg('Packs likhein.')
    if (!u || u <= 0) return setRowMsg('Har pack mein kitni cheezen likhein.')
    if (Number(cost || 0) < 0) return setRowMsg('Qeemat ghalat hai.')
    setSaving(true)
    setRowMsg('')
    const supabase = createClient()
    const { error: err } = await supabase.rpc('record_purchase_pack', {
      p_inventory_id: item.id,
      p_packs: n,
      p_units_per_pack: u,
      p_total_cost: Number(cost || 0),
      p_method: method,
      p_supplier: supplier || null,
      p_company: company || null,
      p_bill_no: billNo || null,
      p_bill_path: billPath,
      p_expiry: expiry || null,
      p_key: crypto.randomUUID(),
    })
    setSaving(false)
    if (err) return setRowMsg(err.message)
    setPanel(null)
    router.refresh()
  }

  const [edit, setEdit] = useState<null | { id: string; item_name: string; category: InventoryItem['category']; unit: string; reorder_level: string; supplier: string; item_group: string; description: string }>(null)
  const [mergeFor, setMergeFor] = useState<string | null>(null)
  const [mergeKeep, setMergeKeep] = useState('')
  const [itemMsg, setItemMsg] = useState('')

  async function saveEdit() {
    if (!edit) return
    setSaving(true)
    setItemMsg('')
    const { error: err } = await createClient().rpc('update_inventory_item', {
      p_id: edit.id, p_name: edit.item_name, p_category: edit.category, p_unit: edit.unit,
      p_reorder: Number(edit.reorder_level || 0), p_supplier: edit.supplier, p_group: edit.item_group, p_description: edit.description,
    })
    setSaving(false)
    if (err) return setItemMsg(err.message)
    setEdit(null)
    router.refresh()
  }

  async function itemRpc(fn: string, args: Record<string, unknown>, confirmText: string) {
    if (!window.confirm(confirmText)) return
    setItemMsg('')
    const { error: err } = await createClient().rpc(fn, args)
    if (err) return setItemMsg(err.message)
    setMergeFor(null)
    router.refresh()
  }

  async function deactivate(item: InventoryItem) {
    await itemRpc('set_inventory_active', { p_id: item.id, p_active: false }, `"${item.item_name}" ko band (archive) karein? Stock aur purana record mehfooz rehta hai, sirf list se hat jata hai. Archived list se wapas la sakte hain.`)
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
              const low = Number(item.reorder_level) > 0 && Number(item.quantity) <= Number(item.reorder_level)
              const negative = Number(item.quantity) < 0
              const expired = item.expiry_date && new Date(item.expiry_date) < new Date()
              const p = panel?.id === item.id ? panel : null

              return (
                <Fragment key={item.id}>
                  <tr className="border-t border-clinic-teal/10">
                    <td className="px-4 py-3 font-medium text-clinic-ink">{item.item_name}{item.item_group && <span className="block text-[11px] font-normal text-clinic-ink/50">{item.item_group}</span>}</td>
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
                      {forecast[item.id] != null && forecast[item.id] <= 30 && !low && !negative && (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">~{Math.max(1, Math.round(forecast[item.id]))} din ka stock</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.expiry_date ? (
                        <span className={expired ? 'font-semibold text-red-600' : 'text-clinic-ink/60'}>
                          {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                          {expired && ' (expired)'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-clinic-ink/60">{item.supplier ?? '—'}{item.company ? <span className="block text-[11px] text-clinic-ink/40">{item.company}</span> : null}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3 text-xs font-semibold text-clinic-teal">
                        {canManage && <button onClick={() => openPanel(item.id, 'use')}>Istemal</button>}
                        {canManage && <button onClick={() => openPanel(item.id, 'buy', item)}>Kharid</button>}
                        {canManage && <button onClick={() => openPanel(item.id, 'ret')} data-testid="item-return">Wapas / Kharab</button>}
                        {canManage && <button onClick={() => openPanel(item.id, 'history')}>History</button>}
                        {canManage && (
                          <button
                            title="On karne par visit mein '+ Samaan' ki list mein ye cheez aayegi: doctor khud chun kar miqdar likhta hai (jaise cotton, gauze). Off ho to ye cheez sirf treatment ki recipe se kam hoti hai."
                            onClick={async () => {
                              const { error: e } = await createClient().from('inventory_meta').upsert({ inventory_id: item.id, is_qualitative: !item.qualitative, updated_at: new Date().toISOString() })
                              if (e) setRowMsg(e.message); else router.refresh()
                            }}
                            className={item.qualitative ? 'text-amber-700' : 'text-clinic-ink/40'}
                          >
                            {item.qualitative ? 'Visit mein doctor chunta ✓' : 'Visit mein doctor chune'}
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => setEdit({ id: item.id, item_name: item.item_name, category: item.category, unit: item.unit ?? '', reorder_level: String(item.reorder_level ?? 0), supplier: item.supplier ?? '', item_group: item.item_group ?? '', description: item.description ?? '' })}
                            data-testid="item-edit"
                          >
                            Badlein
                          </button>
                        )}
                        {canManage && flagsOk && <button onClick={() => { setMergeFor(mergeFor === item.id ? null : item.id); setMergeKeep(''); setItemMsg('') }} data-testid="item-merge" className="text-clinic-ink/60">Milayein</button>}
                        {canManage && <button onClick={() => deactivate(item)} className="text-clinic-ink/40">Band</button>}
                        {canManage && flagsOk && !hasHistory[item.id] && (
                          <button onClick={() => itemRpc('delete_inventory_item', { p_id: item.id }, `"${item.item_name}" delete karein? Is par koi record nahi, ye Recycle Bin mein chala jayega.`)} data-testid="item-delete" className="text-red-600">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {edit?.id === item.id && (
                    <tr className="bg-clinic-sand/60">
                      <td colSpan={6} className="px-4 py-3" data-testid="item-edit-form">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <input value={edit.item_name} onChange={(e) => setEdit({ ...edit, item_name: e.target.value })} placeholder="Item ka naam" aria-label="Item ka naam" className={smallInput} />
                          <select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as InventoryItem['category'] })} aria-label="Category" className={smallInput}>
                            <option value="dental">Dental</option>
                            <option value="homeopathic">Homeopathic</option>
                            <option value="general">General</option>
                          </select>
                          <input value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} placeholder="Unit (pcs, box...)" aria-label="Unit" className={smallInput} />
                          <input type="number" step="0.01" min={0} value={edit.reorder_level} onChange={(e) => setEdit({ ...edit, reorder_level: e.target.value })} placeholder="Alert at" aria-label="Alert at" className={smallInput} />
                          <input value={edit.supplier} onChange={(e) => setEdit({ ...edit, supplier: e.target.value })} placeholder="Supplier" aria-label="Supplier" className={smallInput} />
                          <input value={edit.item_group} onChange={(e) => setEdit({ ...edit, item_group: e.target.value })} placeholder="Group" aria-label="Group" className={smallInput} />
                          <input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Tafseel (optional)" aria-label="Tafseel" className={`${smallInput} sm:col-span-2`} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button onClick={saveEdit} disabled={saving || !edit.item_name.trim()} className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                          <button onClick={() => { setEdit(null); setItemMsg('') }} className="text-xs text-clinic-ink/50">Cancel</button>
                          {itemMsg && <span className="text-xs text-red-600">{itemMsg}</span>}
                        </div>
                        <p className="mt-1 text-[11px] text-clinic-ink/50">Naam ya tafseel badalne se purane kharid, istemal aur stock ke record nahi badlte; wo isi item se jude rehte hain. Stock yahan se nahi badalta (kharid / istemal / ginti se badalta hai).</p>
                      </td>
                    </tr>
                  )}

                  {mergeFor === item.id && (
                    <tr className="bg-clinic-sand/60">
                      <td colSpan={6} className="px-4 py-3" data-testid="item-merge-form">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-clinic-ink/70">&quot;{item.item_name}&quot; dohra hai. Ise is item mein milayein:</span>
                          <select value={mergeKeep} onChange={(e) => setMergeKeep(e.target.value)} aria-label="Asli item" className={smallInput}>
                            <option value="">Asli item chunein</option>
                            {items.filter((o) => o.id !== item.id && o.category === item.category && (o.unit ?? '') === (item.unit ?? '')).map((o) => (
                              <option key={o.id} value={o.id}>{o.item_name} ({Number(o.quantity)} {o.unit})</option>
                            ))}
                          </select>
                          <button
                            disabled={!mergeKeep}
                            onClick={() => itemRpc('merge_inventory_items', { p_keep: mergeKeep, p_remove: item.id }, `"${item.item_name}" ka ${Number(item.quantity)} ${item.unit ?? ''} stock chune hue asli item mein jur jayega. "${item.item_name}" band ho jayega, lekin uski kharid/istemal ki puri history mehfooz rahegi. Merge karein?`)}
                            className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                          >
                            Milayein
                          </button>
                          <button onClick={() => setMergeFor(null)} className="text-xs text-clinic-ink/50">Cancel</button>
                          {itemMsg && <span className="text-xs text-red-600">{itemMsg}</span>}
                        </div>
                        <p className="mt-1 text-[11px] text-clinic-ink/50">Sirf wohi items dikhte hain jin ki category aur unit aik jaisi hai.</p>
                      </td>
                    </tr>
                  )}

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

                  {p?.mode === 'ret' && (
                    <tr className="bg-clinic-sand/60">
                      <td colSpan={6} className="px-4 py-3" data-testid="item-return-form">
                        <div className="flex flex-wrap items-center gap-2">
                          <select value={retKind} onChange={(e) => setRetKind(e.target.value as 'damaged' | 'return_supplier')} aria-label="Qism" className={smallInput}>
                            <option value="damaged">Kharab / toota / expire</option>
                            <option value="return_supplier">Supplier ko wapas kiya</option>
                          </select>
                          <input autoFocus type="number" step="0.01" min={0} value={qty} onChange={(e) => setQty(e.target.value)} placeholder={`Kitna (${item.unit})`} aria-label="Kitna" className={`${smallInput} w-28`} />
                          {retKind === 'return_supplier' && (
                            <>
                              <input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Wapas mili raqam Rs." aria-label="Wapas mili raqam" className={`${smallInput} w-40`} />
                              <select value={method} onChange={(e) => setMethod(e.target.value)} className={smallInput}>
                                <option value="cash">Cash</option>
                                <option value="bank">Bank</option>
                                <option value="easypaisa">EasyPaisa</option>
                                <option value="jazzcash">JazzCash</option>
                              </select>
                            </>
                          )}
                          <input value={retNote} onChange={(e) => setRetNote(e.target.value)} placeholder={retKind === 'damaged' ? 'Wajah (zaroori)' : 'Wajah / bill (optional)'} aria-label="Wajah" className={`${smallInput} w-56`} />
                          <button onClick={() => submitReturn(item)} disabled={saving} className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                          <button onClick={() => setPanel(null)} className="text-xs text-clinic-ink/50">Cancel</button>
                          {rowMsg && <span className="w-full text-xs text-red-600">{rowMsg}</span>}
                        </div>
                        <p className="mt-1 text-[11px] text-clinic-ink/50">Stock kam hota hai aur History mein likha jata hai. Supplier se paise wapas mile to wo Income (Supplier Refund) mein likhe jate hain (sirf owner). Kharab maal par naya kharcha nahi banta kyunki kharid ka kharcha pehle likha ja chuka hai.</p>
                      </td>
                    </tr>
                  )}

                  {p?.mode === 'buy' && (
                    <tr className="bg-clinic-sand/60">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input autoFocus type="number" step="0.01" min={0} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Kitne pack" aria-label="Kitne pack" className={`${smallInput} w-24`} />
                          <input type="number" step="0.01" min={0} value={upp} onChange={(e) => setUpp(e.target.value)} placeholder={`Har pack mein (${item.unit})`} aria-label="Har pack mein kitne" className={`${smallInput} w-32`} />
                          <span className="text-xs text-clinic-ink/60">= {Math.round(Number(qty || 0) * Number(upp || 0) * 100) / 100} {item.unit}</span>
                          <input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Kul qeemat Rs." className={`${smallInput} w-36`} />
                          <select value={method} onChange={(e) => setMethod(e.target.value)} className={smallInput}>
                            <option value="cash">Cash</option>
                            <option value="bank">Bank</option>
                            <option value="easypaisa">EasyPaisa</option>
                            <option value="jazzcash">JazzCash</option>
                          </select>
                          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier (dukaan)" className={`${smallInput} w-40`} />
                          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (brand)" aria-label="Company" className={`${smallInput} w-36`} />
                          <input value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="Bill number" aria-label="Bill number" className={`${smallInput} w-32`} />
                          <label className="text-xs text-clinic-ink/60">Expiry <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} aria-label="Expiry" className={smallInput} /></label>
                          <DocUpload folder="purchases" value={billPath} onChange={setBillPath} />
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
      {canManage && archived.length > 0 && (
        <details className="mt-4 rounded-2xl border border-clinic-teal/10 bg-white p-4" data-testid="archived-items">
          <summary className="cursor-pointer text-sm font-semibold text-clinic-ink/70">Band (archived) items: {archived.length}</summary>
          <ul className="mt-2 space-y-1 text-sm">
            {archived.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{a.item_name} <span className="text-xs text-clinic-ink/50">({Number(a.quantity)} {a.unit})</span></span>
                <button onClick={() => itemRpc('set_inventory_active', { p_id: a.id, p_active: true }, `"${a.item_name}" dobara chalu karein?`)} className="text-xs font-semibold text-clinic-teal">Dobara chalu karein</button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {itemMsg && !edit && !mergeFor && <p className="mt-2 text-sm text-red-600">{itemMsg}</p>}
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface InvOption {
  id: string
  item_name: string
  unit: string | null
}

interface Row {
  inventory_id: string
  default_qty: number
  inventory: { item_name: string; unit: string | null } | null
}

/** Is treatment mein aam taur par kaun sa samaan lagta hai (invoice banate waqt tick-list isi se aati hai) */
export default function TreatmentMaterials({
  treatmentId,
  options,
  others = [],
}: {
  treatmentId: string
  options: InvOption[]
  /** Dusre treatments jin se recipe copy ho sakti hai */
  others?: { id: string; name: string }[]
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [pick, setPick] = useState('')
  const [qty, setQty] = useState('1')
  const [msg, setMsg] = useState('')
  const [copyFrom, setCopyFrom] = useState('')

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('treatment_materials')
      .select('inventory_id, default_qty, inventory(item_name, unit)')
      .eq('treatment_id', treatmentId)
    setRows((data ?? []) as unknown as Row[])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatmentId])

  async function add() {
    if (!pick || !Number(qty)) return
    setMsg('')
    const supabase = createClient()
    const { error } = await supabase
      .from('treatment_materials')
      .upsert({ treatment_id: treatmentId, inventory_id: pick, default_qty: Number(qty) }, { onConflict: 'treatment_id,inventory_id' })
    if (error) return setMsg(error.message)
    setPick('')
    setQty('1')
    load()
  }

  async function copy() {
    if (!copyFrom) return
    setMsg('')
    const supabase = createClient()
    const { data, error } = await supabase.from('treatment_materials').select('inventory_id, default_qty').eq('treatment_id', copyFrom)
    if (error) return setMsg(error.message)
    const have = new Set(rows.map((r) => r.inventory_id))
    const add = (data ?? []).filter((d) => !have.has(d.inventory_id as string)).map((d) => ({ treatment_id: treatmentId, inventory_id: d.inventory_id, default_qty: d.default_qty }))
    if (add.length === 0) return setMsg('Copy karne ko kuch naya nahi (khali ya pehle se maujood).')
    const { error: e2 } = await supabase.from('treatment_materials').insert(add)
    if (e2) return setMsg(e2.message)
    setCopyFrom('')
    load()
  }

  async function remove(inventoryId: string) {
    const supabase = createClient()
    await supabase.from('treatment_materials').delete().eq('treatment_id', treatmentId).eq('inventory_id', inventoryId)
    load()
  }

  const used = new Set(rows.map((r) => r.inventory_id))

  return (
    <div className="text-xs text-clinic-ink/70">
      {rows.length === 0 && <p>Abhi koi samaan set nahi.</p>}
      {rows.map((r) => (
        <p key={r.inventory_id} className="flex items-center gap-3">
          <span>{r.inventory?.item_name} × {Number(r.default_qty)} {r.inventory?.unit}</span>
          <button onClick={() => remove(r.inventory_id)} className="text-red-600">Hatayein</button>
        </p>
      ))}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className="rounded-lg border border-clinic-teal/30 px-2 py-1">
          <option value="">Samaan chunein...</option>
          {options.filter((o) => !used.has(o.id)).map((o) => (
            <option key={o.id} value={o.id}>{o.item_name}</option>
          ))}
        </select>
        <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" step="0.01" min={0} className="w-20 rounded-lg border border-clinic-teal/30 px-2 py-1" />
        <button onClick={add} className="font-semibold text-clinic-teal">Add</button>
        {msg && <span className="text-red-600">{msg}</span>}
      </div>
      {others.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select aria-label="Recipe copy karein" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="rounded-lg border border-clinic-teal/30 px-2 py-1">
            <option value="">Kisi aur treatment se copy karein...</option>
            {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button onClick={copy} disabled={!copyFrom} className="font-semibold text-clinic-teal disabled:opacity-40">Copy</button>
        </div>
      )}
    </div>
  )
}

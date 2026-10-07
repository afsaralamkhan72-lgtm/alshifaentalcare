'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TreatmentMaterials, { type InvOption } from '@/components/admin/TreatmentMaterials'

export interface CatalogRow {
  id: string
  name: string
  department: string | null
  price: number
  is_active: boolean
}

interface HistoryRow {
  old_price: number | null
  new_price: number
  changed_by_name: string | null
  changed_at: string
}

export default function PriceListManager({
  rows,
  nextInvoice,
  inventory = [],
}: {
  inventory?: InvOption[]
  rows: CatalogRow[]
  nextInvoice: { prefix: string; next_no: number } | null
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [dept, setDept] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [history, setHistory] = useState<Record<string, HistoryRow[]>>({})
  const [openHist, setOpenHist] = useState<string | null>(null)
  const [openMat, setOpenMat] = useState<string | null>(null)
  const [nextNo, setNextNo] = useState(String(nextInvoice?.next_no ?? 1001))

  const inputClass =
    'rounded-lg border border-clinic-teal/30 px-3 py-1.5 text-sm outline-none focus:border-clinic-teal'

  async function add() {
    if (!name.trim() || price === '') {
      setMsg('Naam aur qeemat likhein.')
      return
    }
    setBusy(true)
    setMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('treatment_catalog').insert({
      name: name.trim(),
      price: Number(price),
      department: dept || null,
    })
    setBusy(false)
    if (error) {
      setMsg(error.code === '23505' ? 'Ye treatment pehle se list mein hai.' : error.message)
      return
    }
    setName('')
    setPrice('')
    router.refresh()
  }

  async function savePrice(id: string) {
    setBusy(true)
    setMsg('')
    const supabase = createClient()
    const { error } = await supabase
      .from('treatment_catalog')
      .update({ price: Number(editPrice) })
      .eq('id', id)
    setBusy(false)
    if (error) {
      setMsg(error.message)
      return
    }
    setEditing(null)
    setHistory((h) => {
      const c = { ...h }
      delete c[id]
      return c
    })
    router.refresh()
  }

  async function toggleActive(r: CatalogRow) {
    const supabase = createClient()
    await supabase.from('treatment_catalog').update({ is_active: !r.is_active }).eq('id', r.id)
    router.refresh()
  }

  async function showHistory(id: string) {
    if (openHist === id) {
      setOpenHist(null)
      return
    }
    setOpenHist(id)
    if (history[id]) return
    const supabase = createClient()
    const { data } = await supabase
      .from('treatment_price_history')
      .select('old_price, new_price, changed_by_name, changed_at')
      .eq('treatment_id', id)
      .order('changed_at', { ascending: false })
    setHistory((h) => ({ ...h, [id]: (data ?? []) as HistoryRow[] }))
  }

  async function seed() {
    setBusy(true)
    setMsg('')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('seed_treatment_catalog_from_history')
    setBusy(false)
    setMsg(error ? error.message : `${data ?? 0} purane treatment naam list mein aa gaye. Qeematein check kar lein.`)
    router.refresh()
  }

  async function saveNext() {
    setMsg('')
    const supabase = createClient()
    const { error } = await supabase.rpc('set_next_invoice_number', { p_next: Number(nextNo) })
    setMsg(error ? error.message : 'Agla invoice number set ho gaya.')
    router.refresh()
  }

  return (
    <div>
      {msg && <p className="mt-4 rounded-xl bg-clinic-mint px-4 py-2 text-sm text-clinic-ink">{msg}</p>}

      <div className="mt-6 rounded-2xl border border-clinic-teal/10 bg-white p-4">
        <p className="font-display font-semibold text-clinic-ink">Naya treatment</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Treatment ka naam" className={`${inputClass} min-w-[220px] flex-1`} />
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={0} placeholder="Qeemat (Rs.)" className={`${inputClass} w-36`} />
          <select value={dept} onChange={(e) => setDept(e.target.value)} className={inputClass}>
            <option value="">Department</option>
            <option value="dental">Dental</option>
            <option value="homeopathic">Homeopathic</option>
            <option value="general">General</option>
          </select>
          <button onClick={add} disabled={busy} className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Add
          </button>
        </div>
        {rows.length === 0 && (
          <button onClick={seed} disabled={busy} className="mt-3 text-sm font-semibold text-clinic-teal hover:underline">
            Purane records se treatment naam utha kar list banayein
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60">
            <tr>
              <th className="px-4 py-3">Treatment</th>
              <th className="px-4 py-3">Dept</th>
              <th className="px-4 py-3 text-right">Qeemat</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-clinic-ink/50">
                  Abhi koi treatment nahi.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className={`border-t border-clinic-teal/10 ${r.is_active ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-3 font-medium text-clinic-ink">{r.name}</td>
                  <td className="px-4 py-3 capitalize">{r.department ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {editing === r.id ? (
                      <span className="inline-flex items-center gap-2">
                        <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} type="number" min={0} className={`${inputClass} w-28`} autoFocus />
                        <button onClick={() => savePrice(r.id)} disabled={busy} className="text-xs font-semibold text-clinic-teal">Save</button>
                        <button onClick={() => setEditing(null)} className="text-xs text-clinic-ink/50">Cancel</button>
                      </span>
                    ) : (
                      <>Rs. {Number(r.price).toLocaleString()}</>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex gap-3 text-xs font-semibold text-clinic-teal">
                      <button onClick={() => { setEditing(r.id); setEditPrice(String(r.price)) }}>Qeemat badlein</button>
                      <button onClick={() => showHistory(r.id)}>History</button>
                      <button onClick={() => setOpenMat(openMat === r.id ? null : r.id)}>Samaan</button>
                      <button onClick={() => toggleActive(r)}>{r.is_active ? 'Band' : 'Chalu'}</button>
                    </span>
                  </td>
                </tr>
                {openHist === r.id && (
                  <tr key={`${r.id}-h`} className="bg-clinic-sand/60">
                    <td colSpan={4} className="px-4 py-3 text-xs text-clinic-ink/70">
                      {(history[r.id] ?? []).length === 0 && 'Koi history nahi.'}
                      {(history[r.id] ?? []).map((h, i) => (
                        <p key={i}>
                          {new Date(h.changed_at).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })} ·{' '}
                          {h.old_price == null ? 'Shuru' : `Rs. ${Number(h.old_price).toLocaleString()}`} → Rs.{' '}
                          {Number(h.new_price).toLocaleString()} · {h.changed_by_name ?? '—'}
                        </p>
                      ))}
                    </td>
                  </tr>
                )}
                {openMat === r.id && (
                  <tr className="bg-clinic-sand/60">
                    <td colSpan={4} className="px-4 py-3">
                      <TreatmentMaterials treatmentId={r.id} options={inventory} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-clinic-ink/50">
        Qeemat badalne se purane invoice nahi badalte. Treatment delete nahi hota, sirf band hota hai.
      </p>

      <div className="mt-8 rounded-2xl border border-clinic-teal/10 bg-white p-4">
        <p className="font-display font-semibold text-clinic-ink">Invoice number</p>
        <p className="mt-1 text-sm text-clinic-ink/60">
          Agla invoice: <strong>{nextInvoice ? `${nextInvoice.prefix}${nextInvoice.next_no}` : '—'}</strong>. Ye number jari
          ho chuke number se bara hi rakha ja sakta hai.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input value={nextNo} onChange={(e) => setNextNo(e.target.value)} type="number" min={1} className={`${inputClass} w-36`} />
          <button onClick={saveNext} className="rounded-full border border-clinic-teal px-4 py-1.5 text-sm font-semibold text-clinic-teal">
            Set karein
          </button>
        </div>
      </div>
    </div>
  )
}

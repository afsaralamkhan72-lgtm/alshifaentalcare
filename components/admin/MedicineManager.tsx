'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/karachi'

export interface Medicine {
  id: string
  category: 'dental' | 'homeopathic'
  name: string
  generic_name: string | null
  brand_name: string | null
  med_type: string | null
  strength: string | null
  dosage_form: string | null
  potency: string | null
  pack: string | null
  default_dose: string | null
  default_frequency: string | null
  default_duration: string | null
  instructions: string | null
  price: number
  available: boolean
  stock_qty: number | null
  is_active: boolean
}

const EMPTY = {
  name: '', generic_name: '', brand_name: '', med_type: '', strength: '', dosage_form: '', potency: '', pack: '',
  default_dose: '', default_frequency: '', default_duration: '', instructions: '', price: '', available: false, stock_qty: '',
}
type Form = typeof EMPTY

const DENTAL_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Gel', 'Mouthwash', 'Ointment', 'Injection', 'Drops', 'Toothpaste']
const HOMEO_FORMS = ['Globules', 'Drops (Dilution)', 'Mother Tincture', 'Tablet', 'Biochemic', 'Ointment', 'Syrup']

/** Settings: Dental ya Homeopathic dawaiyon ki list (alag-alag). Delete nahi, sirf band (purani prescriptions safe). */
export default function MedicineManager({ category, rows }: { category: 'dental' | 'homeopathic'; rows: Medicine[] }) {
  const router = useRouter()
  const homeo = category === 'homeopathic'
  const [q, setQ] = useState('')
  const [editId, setEditId] = useState<string | null>(null) // 'new' = naya
  const [f, setF] = useState<Form>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [showOff, setShowOff] = useState(false)

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows
      .filter((r) => showOff || r.is_active)
      .filter((r) => !t || [r.name, r.generic_name, r.brand_name, r.med_type].some((x) => (x ?? '').toLowerCase().includes(t)))
  }, [rows, q, showOff])

  function open(r?: Medicine) {
    setMsg('')
    if (!r) {
      setEditId('new')
      setF(EMPTY)
      return
    }
    setEditId(r.id)
    setF({
      name: r.name, generic_name: r.generic_name ?? '', brand_name: r.brand_name ?? '', med_type: r.med_type ?? '',
      strength: r.strength ?? '', dosage_form: r.dosage_form ?? '', potency: r.potency ?? '', pack: r.pack ?? '',
      default_dose: r.default_dose ?? '', default_frequency: r.default_frequency ?? '', default_duration: r.default_duration ?? '',
      instructions: r.instructions ?? '', price: String(r.price ?? ''), available: r.available, stock_qty: r.stock_qty == null ? '' : String(r.stock_qty),
    })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!f.name.trim()) return setMsg('Dawa ka naam likhein')
    setBusy(true)
    setMsg('')
    const n = (v: string) => (v.trim() ? v.trim() : null)
    const payload = {
      category,
      name: f.name.trim(),
      generic_name: n(f.generic_name), brand_name: n(f.brand_name), med_type: n(f.med_type), strength: n(f.strength),
      dosage_form: n(f.dosage_form), potency: n(f.potency), pack: n(f.pack), default_dose: n(f.default_dose),
      default_frequency: n(f.default_frequency), default_duration: n(f.default_duration), instructions: n(f.instructions),
      price: Number(f.price) || 0, available: f.available, stock_qty: f.stock_qty.trim() === '' ? null : Number(f.stock_qty),
    }
    const supabase = createClient()
    const { error } = editId === 'new' ? await supabase.from('medicines').insert(payload) : await supabase.from('medicines').update(payload).eq('id', editId!)
    setBusy(false)
    if (error) return setMsg(error.code === '23505' ? 'Ye dawa (isi strength/potency ke saath) pehle se list mein hai' : error.message)
    setEditId(null)
    router.refresh()
  }

  async function toggle(r: Medicine) {
    const { error } = await createClient().from('medicines').update({ is_active: !r.is_active }).eq('id', r.id)
    if (error) return setMsg(error.message)
    router.refresh()
  }

  const input = 'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'
  const field = (k: keyof Form, label: string, ph = '') => (
    <div>
      <label className="text-xs font-medium text-clinic-ink/70">{label}</label>
      <input value={f[k] as string} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} className={input} />
    </div>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dawa talash karein..." className="w-64 rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
        <label className="flex items-center gap-1.5 text-xs text-clinic-ink/60">
          <input type="checkbox" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} /> Band wali bhi
        </label>
        <button onClick={() => open()} className="ml-auto rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
          + Nayi dawa
        </button>
      </div>
      {msg && !editId && <p className="mt-2 text-sm text-red-600">{msg}</p>}

      {editId && (
        <form onSubmit={save} className="mt-3 grid gap-3 rounded-2xl border-2 border-clinic-teal/25 bg-white p-4 sm:grid-cols-3">
          {field('name', 'Dawa ka naam *', homeo ? 'Arnica Montana' : 'Amoxicillin')}
          {homeo ? field('potency', 'Potency', '30C / 200C / 1M') : field('strength', 'Strength', '500mg')}
          <div>
            <label className="text-xs font-medium text-clinic-ink/70">{homeo ? 'Form' : 'Dosage form'}</label>
            <input list={`forms-${category}`} value={f.dosage_form} onChange={(e) => setF({ ...f, dosage_form: e.target.value })} className={input} />
            <datalist id={`forms-${category}`}>
              {(homeo ? HOMEO_FORMS : DENTAL_FORMS).map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </div>
          {homeo ? field('pack', 'Quantity / Pack', '30ml / 2 dram') : field('med_type', 'Type', 'Antibiotic / Painkiller')}
          {!homeo && field('generic_name', 'Generic naam (optional)')}
          {!homeo && field('brand_name', 'Brand (optional)')}
          {field('default_dose', 'Aam dose (optional)', homeo ? '4 goliyan' : '1 tablet')}
          {field('default_frequency', 'Kitni baar (optional)', '3 dafa roz')}
          {field('default_duration', 'Kitne din (optional)', '5 din')}
          <div className="sm:col-span-3">{field('instructions', 'Hidayat (optional)', 'Khane ke baad')}</div>
          {field('price', 'Qeemat (Rs.) — clinic se dene par', '0')}
          {field('stock_qty', 'Stock (khali = na ginein)', '')}
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={f.available} onChange={(e) => setF({ ...f, available: e.target.checked })} />
            Clinic mein milti hai (de sakte hain)
          </label>
          {msg && <p className="text-sm text-red-600 sm:col-span-3">{msg}</p>}
          <div className="flex gap-2 sm:col-span-3">
            <button disabled={busy} className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? 'Save...' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditId(null)} className="text-sm text-clinic-ink/60">
              Wapas
            </button>
          </div>
        </form>
      )}

      <div className="mt-3 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-clinic-mint text-left text-xs text-clinic-ink/60">
            <tr>
              <th className="px-3 py-2">Dawa</th>
              <th className="px-3 py-2">{homeo ? 'Form / Pack' : 'Form / Type'}</th>
              <th className="px-3 py-2">Aam dose</th>
              <th className="px-3 py-2 text-right">Qeemat</th>
              <th className="px-3 py-2 text-center">Clinic mein</th>
              <th className="px-3 py-2 text-right">Stock</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-clinic-ink/50">
                  Abhi koi dawa nahi. &quot;+ Nayi dawa&quot; dabayein.
                </td>
              </tr>
            )}
            {list.map((r) => (
              <tr key={r.id} className={`border-t border-clinic-teal/10 ${r.is_active ? '' : 'opacity-50'}`}>
                <td className="px-3 py-2 font-medium text-clinic-ink">
                  {r.name} <span className="text-clinic-teal">{homeo ? r.potency : r.strength}</span>
                  {r.generic_name && <span className="block text-xs text-clinic-ink/50">{r.generic_name}</span>}
                </td>
                <td className="px-3 py-2 text-xs text-clinic-ink/70">{[r.dosage_form, homeo ? r.pack : r.med_type].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-3 py-2 text-xs text-clinic-ink/70">{[r.default_dose, r.default_frequency, r.default_duration].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-3 py-2 text-right">{money(r.price)}</td>
                <td className="px-3 py-2 text-center">{r.available ? '✓' : '—'}</td>
                <td className={`px-3 py-2 text-right ${r.stock_qty != null && r.stock_qty <= 5 ? 'font-semibold text-red-600' : ''}`}>{r.stock_qty ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold text-clinic-teal">
                  <button onClick={() => open(r)} className="mr-3">
                    Badlein
                  </button>
                  <button onClick={() => toggle(r)}>{r.is_active ? 'Band' : 'Chalu'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

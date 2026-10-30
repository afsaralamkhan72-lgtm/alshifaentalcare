'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addDays, money, todayKarachi } from '@/lib/karachi'

export interface CatalogItem {
  id: string
  name: string
  price: number
  department: string | null
}

export interface TodayInvoice {
  id: string
  invoice_number: string
  total: number
  status: string
}

interface Line {
  key: string
  treatment_id: string | null
  name: string
  tooth: string
  qty: string
  unit_price: string
  listPrice: number | null
}

export interface MaterialRef {
  inventory_id: string
  name: string
  unit: string | null
  default_qty: number
}

export interface InventoryRef {
  id: string
  name: string
  unit: string | null
}

interface Props {
  materials?: Record<string, MaterialRef[]>
  inventory?: InventoryRef[]
  patientId: string
  patientName: string
  defaultDoctor: string | null
  doctors: string[]
  catalog: CatalogItem[]
  todayInvoices: TodayInvoice[]
}

const METHODS = [
  ['cash', 'Cash'],
  ['bank', 'Bank'],
  ['easypaisa', 'EasyPaisa'],
  ['jazzcash', 'JazzCash'],
]

/** "Complete + Charge": aik hi screen se treatments, discount, payment aur invoice */
export default function ChargeBuilder({
  patientId,
  patientName,
  defaultDoctor,
  doctors,
  catalog,
  todayInvoices,
  materials = {},
  inventory = [],
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const keyRef = useRef('')

  const [lines, setLines] = useState<Line[]>([])
  const [pick, setPick] = useState('')
  const [discountPct, setDiscountPct] = useState('0')
  const [paid, setPaid] = useState<string | null>(null) // null = poora total
  const [method, setMethod] = useState('cash')
  const [doctor, setDoctor] = useState(defaultDoctor ?? '')
  const [due, setDue] = useState(addDays(todayKarachi(), 7))
  const [notes, setNotes] = useState('')
  const [ticked, setTicked] = useState<Record<string, boolean>>({})
  const [qtyOv, setQtyOv] = useState<Record<string, string>>({})
  const [extraIds, setExtraIds] = useState<string[]>([])
  const [extraPick, setExtraPick] = useState('')

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0),
    [lines]
  )
  // Treatments ke hisaab se suggested samaan (default qty x treatment qty) + haath se add kiya hua
  const stock = useMemo(() => {
    const m = new Map<string, { id: string; name: string; unit: string | null; qty: number }>()
    for (const l of lines) {
      if (!l.treatment_id) continue
      for (const mat of materials[l.treatment_id] ?? []) {
        const cur = m.get(mat.inventory_id)
        const add = mat.default_qty * (Number(l.qty) || 1)
        m.set(mat.inventory_id, {
          id: mat.inventory_id,
          name: mat.name,
          unit: mat.unit,
          qty: (cur?.qty ?? 0) + add,
        })
      }
    }
    for (const id of extraIds) {
      if (m.has(id)) continue
      const inv = inventory.find((x) => x.id === id)
      if (inv) m.set(id, { id, name: inv.name, unit: inv.unit, qty: 1 })
    }
    return [...m.values()]
  }, [lines, materials, extraIds, inventory])

  const pct = Math.min(100, Math.max(0, Number(discountPct) || 0))
  const discount = Math.round(subtotal * pct) / 100
  const total = subtotal - discount
  const paidNum = paid === null ? total : Number(paid) || 0
  const remaining = total - paidNum

  function openIt() {
    keyRef.current = crypto.randomUUID()
    setError('')
    setOpen(true)
  }

  function addCatalog() {
    const c = catalog.find((x) => x.id === pick)
    if (!c) return
    setLines((l) => [
      ...l,
      {
        key: crypto.randomUUID(),
        treatment_id: c.id,
        name: c.name,
        tooth: '',
        qty: '1',
        unit_price: String(c.price),
        listPrice: c.price,
      },
    ])
    setPick('')
  }

  function addCustom() {
    setLines((l) => [
      ...l,
      { key: crypto.randomUUID(), treatment_id: null, name: '', tooth: '', qty: '1', unit_price: '', listPrice: null },
    ])
  }

  function patchLine(key: string, patch: Partial<Line>) {
    setLines((l) => l.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  }

  async function save() {
    if (saving) return
    setError('')

    if (lines.length === 0) return setError('Kam az kam aik treatment chunein.')
    if (lines.some((l) => !l.name.trim() || l.unit_price === '' || Number(l.qty) < 1))
      return setError('Har treatment ka naam, qty aur qeemat bharein.')
    if (paidNum < 0 || paidNum > total) return setError('Mili hui raqam total se zyada nahi ho sakti.')

    setSaving(true)
    const supabase = createClient()
    const { data, error: err } = await supabase.rpc('create_invoice', {
      p_patient_id: patientId,
      p_items: lines.map((l) => ({
        treatment_id: l.treatment_id,
        name: l.name.trim(),
        tooth: l.tooth.trim() || null,
        qty: Number(l.qty),
        unit_price: Number(l.unit_price),
      })),
      p_discount_percent: pct,
      p_paid: paidNum,
      p_method: method,
      p_doctor: doctor.trim() || null,
      p_due_date: remaining > 0 ? due : null,
      p_notes: notes.trim() || null,
      p_idempotency_key: keyRef.current,
    })

    if (err || !data) {
      setSaving(false)
      setError(err?.message ?? 'Invoice nahi bana, dobara koshish karein.')
      return
    }

    // Tick kiya hua samaan stock se kam karein (dobara dabane par bhi sirf aik baar kam hota hai)
    const used = stock
      .filter((s) => ticked[s.id])
      .map((s) => ({ inventory_id: s.id, qty: Number(qtyOv[s.id] ?? s.qty) }))
      .filter((u) => u.qty > 0)
    if (used.length > 0) {
      const { error: useErr } = await supabase.rpc('record_usage', {
        p_items: used,
        p_patient_id: patientId,
        p_invoice_id: data,
        p_note: 'Invoice ke saath',
        p_key: `inv-use:${keyRef.current}`,
      })
      if (useErr) {
        setSaving(false)
        setError(`Invoice ban gaya, par samaan stock se kam nahi hua: ${useErr.message}. Dobara "Invoice Banayein" dabayein, invoice dohra nahi banega.`)
        return
      }
    }
    setSaving(false)
    setOpen(false)
    router.push(`/admin/invoices/${data}`)
    router.refresh()
  }

  const inputClass =
    'w-full rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <>
      <button
        onClick={openIt}
        className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-clinic-teal-light"
      >
        Complete + Charge
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-clinic-ink">Naya Invoice</p>
                <p className="text-xs text-clinic-ink/60">{patientName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40">✕</button>
            </div>

            {todayInvoices.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                Aaj is patient ka invoice pehle ban chuka hai:{' '}
                {todayInvoices.map((i) => `${i.invoice_number} (${money(i.total)})`).join(', ')}. Naya sirf tab banayein jab
                alag kaam hua ho.
              </div>
            )}

            {/* Treatments */}
            <div className="mt-4 flex flex-wrap gap-2">
              <select value={pick} onChange={(e) => setPick(e.target.value)} className={`${inputClass} flex-1`}>
                <option value="">Treatment chunein...</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {money(c.price)}
                  </option>
                ))}
              </select>
              <button onClick={addCatalog} disabled={!pick} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                Add
              </button>
              <button onClick={addCustom} className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal">
                + Alag naam
              </button>
            </div>
            {catalog.length === 0 && (
              <p className="mt-2 text-xs text-amber-700">Price list khali hai. Treatment Prices page se banayein, ya "Alag naam" use karein.</p>
            )}

            <div className="mt-3 grid gap-2">
              {lines.map((l) => (
                <div key={l.key} className="grid grid-cols-[1fr_70px_60px_110px_auto] items-center gap-2">
                  <input
                    value={l.name}
                    onChange={(e) => patchLine(l.key, { name: e.target.value })}
                    readOnly={l.treatment_id !== null}
                    placeholder="Treatment"
                    className={inputClass}
                  />
                  <input value={l.tooth} onChange={(e) => patchLine(l.key, { tooth: e.target.value })} placeholder="Daant" className={inputClass} />
                  <input value={l.qty} onChange={(e) => patchLine(l.key, { qty: e.target.value })} type="number" min={1} className={inputClass} />
                  <input value={l.unit_price} onChange={(e) => patchLine(l.key, { unit_price: e.target.value })} type="number" min={0} placeholder="Rs." className={inputClass} />
                  <button onClick={() => setLines((x) => x.filter((y) => y.key !== l.key))} className="text-clinic-ink/40 hover:text-red-600">✕</button>
                  {l.listPrice != null && Number(l.unit_price) !== l.listPrice && (
                    <p className="col-span-5 -mt-1 text-[11px] text-amber-700">
                      List price {money(l.listPrice)} thi, aap ne badli hai.
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Kaun sa samaan istemal hua */}
            {inventory.length > 0 && (
              <div className="mt-5 rounded-xl border border-clinic-teal/15 p-3">
                <p className="text-xs font-semibold text-clinic-ink">Kaun sa samaan istemal hua? (tick karein)</p>
                <div className="mt-2 grid gap-1.5">
                  {stock.length === 0 && (
                    <p className="text-xs text-clinic-ink/50">Treatment chunne par uska aam samaan yahan aa jayega, ya neeche se khud add karein.</p>
                  )}
                  {stock.map((s) => (
                    <label key={s.id} className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={!!ticked[s.id]} onChange={(e) => setTicked((t) => ({ ...t, [s.id]: e.target.checked }))} />
                      <span className="flex-1">{s.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={qtyOv[s.id] ?? String(s.qty)}
                        onChange={(e) => setQtyOv((q) => ({ ...q, [s.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-clinic-teal/30 px-2 py-1 text-right text-sm"
                      />
                      <span className="w-14 text-xs text-clinic-ink/50">{s.unit}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <select value={extraPick} onChange={(e) => setExtraPick(e.target.value)} className="flex-1 rounded-lg border border-clinic-teal/30 px-2 py-1.5 text-xs">
                    <option value="">+ Aur samaan...</option>
                    {inventory.filter((i) => !stock.some((s) => s.id === i.id)).map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                  <button
                    disabled={!extraPick}
                    onClick={() => {
                      setExtraIds((e) => [...e, extraPick])
                      setTicked((t) => ({ ...t, [extraPick]: true }))
                      setExtraPick('')
                    }}
                    className="text-xs font-semibold text-clinic-teal disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Discount / paise */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-clinic-ink/70">Discount % (doctor)</label>
                <input value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} type="number" min={0} max={100} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-clinic-ink/70">Treating doctor</label>
                <input value={doctor} onChange={(e) => setDoctor(e.target.value)} list="charge-doctors" className={inputClass} />
                <datalist id="charge-doctors">{doctors.map((d) => <option key={d} value={d} />)}</datalist>
              </div>
              <div>
                <label className="text-xs font-medium text-clinic-ink/70">Kitne mile</label>
                <input
                  value={paid === null ? String(total) : paid}
                  onChange={(e) => setPaid(e.target.value)}
                  type="number"
                  min={0}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-clinic-ink/70">Tareeqa</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                  {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {remaining > 0 && (
                <div>
                  <label className="text-xs font-medium text-clinic-ink/70">Baqaya kab tak dega</label>
                  <input value={due} onChange={(e) => setDue(e.target.value)} type="date" className={inputClass} />
                </div>
              )}
              <div className={remaining > 0 ? '' : 'sm:col-span-2'}>
                <label className="text-xs font-medium text-clinic-ink/70">Note (optional)</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Total */}
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-clinic-mint p-4 text-sm sm:grid-cols-4">
              <div><p className="text-xs text-clinic-ink/60">Subtotal</p><p className="font-semibold">{money(subtotal)}</p></div>
              <div><p className="text-xs text-clinic-ink/60">Discount</p><p className="font-semibold">− {money(discount)}</p></div>
              <div><p className="text-xs text-clinic-ink/60">Total</p><p className="font-semibold text-clinic-teal">{money(total)}</p></div>
              <div>
                <p className="text-xs text-clinic-ink/60">Baqaya</p>
                <p className={`font-semibold ${remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{money(Math.max(0, remaining))}</p>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={save}
              disabled={saving}
              className="mt-4 w-full rounded-full bg-clinic-teal px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Ban raha hai...' : 'Invoice Banayein'}
            </button>
            <p className="mt-2 text-center text-xs text-clinic-ink/50">Ek dafa dabayein. Dobara click se doosra invoice nahi banega.</p>
          </div>
        </div>
      )}
    </>
  )
}

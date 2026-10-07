'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money, fmtDate } from '@/lib/karachi'

export interface ExpenseRow {
  id: string
  transaction_date: string
  category: string | null
  amount: number
  payment_method: string | null
  description: string | null
  source: string | null
}
export interface CategoryRow {
  id: string
  name: string
  is_active: boolean
}

export default function ExpenseManager({
  today,
  rows,
  categories,
}: {
  today: string
  rows: ExpenseRow[]
  categories: CategoryRow[]
}) {
  const router = useRouter()
  const active = categories.filter((c) => c.is_active)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(active[0]?.name ?? '')
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [newCat, setNewCat] = useState('')
  // Ek hi form-submit = ek hi key. Dobara click se dohra kharcha nahi banta.
  const [key, setKey] = useState(() => crypto.randomUUID())

  const input = 'rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.rpc('add_expense', {
      p_amount: Number(amount),
      p_category: category,
      p_method: method,
      p_note: note || null,
      p_date: date,
      p_key: key,
    })
    setBusy(false)
    if (error) {
      setMsg({ ok: false, text: error.message })
      return
    }
    setAmount('')
    setNote('')
    setKey(crypto.randomUUID())
    setMsg({ ok: true, text: 'Kharcha likh diya gaya.' })
    router.refresh()
  }

  async function voidRow(id: string) {
    const reason = window.prompt('Cancel karne ki wajah likhein (zaroori):')
    if (!reason || !reason.trim()) return
    const supabase = createClient()
    const { error } = await supabase.rpc('void_expense', { p_tx_id: id, p_reason: reason.trim() })
    if (error) {
      setMsg({ ok: false, text: error.message })
      return
    }
    router.refresh()
  }

  async function addCategory() {
    const name = newCat.trim()
    if (!name) return
    const supabase = createClient()
    const { error } = await supabase.from('expense_categories').insert({ name, sort_order: 200 })
    if (error) {
      setMsg({ ok: false, text: error.code === '23505' ? 'Ye category pehle se hai.' : 'Category save nahi hui.' })
      return
    }
    setNewCat('')
    router.refresh()
  }

  async function toggleCategory(c: CategoryRow) {
    const supabase = createClient()
    await supabase.from('expense_categories').update({ is_active: !c.is_active }).eq('id', c.id)
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={save} className="rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
        <p className="font-display font-semibold text-clinic-ink">Naya kharcha</p>
        <p className="mt-1 text-xs text-clinic-ink/50">Chai ke Rs. 1 se le kar kiraye tak, sab yahin likhein.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="Raqam (Rs.)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={input}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
            {active.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={input}>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="jazzcash">JazzCash</option>
          </select>
          <input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className={input} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            disabled={busy}
            className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Saving...' : 'Kharcha likhein'}
          </button>
          {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-clinic-teal/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-clinic-mint text-left text-clinic-ink/60">
              <tr>
                <th className="px-4 py-2">Tareekh</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Tafseel</th>
                <th className="px-4 py-2 text-right">Raqam</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-clinic-ink/50">
                    Is mahine koi kharcha nahi.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const cancelled = Number(r.amount) === 0
                return (
                  <tr key={r.id} className="border-t border-clinic-teal/10">
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDate(r.transaction_date)}</td>
                    <td className="px-4 py-2">
                      {r.category ?? '—'}
                      {r.source && (
                        <span className="ml-2 rounded-full bg-clinic-mint px-2 py-0.5 text-[10px] text-clinic-ink/50">
                          auto: {r.source}
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-2 ${cancelled ? 'text-clinic-ink/40 line-through' : ''}`}>
                      {r.description ?? ''}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">{money(r.amount)}</td>
                    <td className="px-4 py-2 text-right">
                      {!r.source && !cancelled && (
                        <button onClick={() => voidRow(r.id)} className="text-xs text-red-600 hover:underline">
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <details className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-clinic-ink">Categories badlein</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCategory(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                c.is_active ? 'bg-clinic-teal text-white' : 'bg-clinic-mint text-clinic-ink/40 line-through'
              }`}
              title={c.is_active ? 'Band karne ke liye dabayein' : 'Dobara chalu karne ke liye dabayein'}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input placeholder="Nayi category" value={newCat} onChange={(e) => setNewCat(e.target.value)} className={input} />
          <button onClick={addCategory} className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal">
            Add
          </button>
        </div>
        <p className="mt-2 text-xs text-clinic-ink/50">Category delete nahi hoti, sirf band hoti hai taake purana record na bigre.</p>
      </details>
    </div>
  )
}

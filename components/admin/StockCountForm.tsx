'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface CountItem {
  id: string
  item_name: string
  unit: string | null
  quantity: number
}

/** Ginti: system kya kehta hai (expected) aur asal mein kitna hai (actual). Farq record ho jata hai. */
export default function StockCountForm({ items }: { items: CountItem[] }) {
  const router = useRouter()
  const [actual, setActual] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const filled = items.filter((i) => (actual[i.id] ?? '') !== '')
  const diffs = filled.filter((i) => Number(actual[i.id]) !== Number(i.quantity))

  async function submit() {
    if (filled.length === 0) return setMsg('Kam az kam aik item ki ginti likhein.')
    if (diffs.length > 0 && !window.confirm(`${diffs.length} item ka stock ginti ke mutabiq badal jayega. Theek hai?`)) return
    setSaving(true)
    setMsg('')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('record_stock_count', {
      p_counts: filled.map((i) => ({ inventory_id: i.id, actual: actual[i.id] })),
      p_note: note || null,
    })
    setSaving(false)
    if (error) return setMsg(error.message)
    setMsg(`Ginti save ho gayi. ${data ?? 0} item mein farq tha aur theek kar diya gaya.`)
    setActual({})
    setNote('')
    router.refresh()
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">System ke mutabiq</th>
              <th className="px-4 py-3 text-right">Asal ginti</th>
              <th className="px-4 py-3 text-right">Farq</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const a = actual[i.id] ?? ''
              const d = a === '' ? null : Number(a) - Number(i.quantity)
              return (
                <tr key={i.id} className="border-t border-clinic-teal/10">
                  <td className="px-4 py-2 font-medium text-clinic-ink">{i.item_name}</td>
                  <td className="px-4 py-2 text-right">{Number(i.quantity)} {i.unit}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={a}
                      onChange={(e) => setActual((s) => ({ ...s, [i.id]: e.target.value }))}
                      className="w-28 rounded-lg border border-clinic-teal/30 px-3 py-1.5 text-right text-sm outline-none focus:border-clinic-teal"
                    />
                  </td>
                  <td className={`px-4 py-2 text-right font-semibold ${d == null ? 'text-clinic-ink/30' : d === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {d == null ? '—' : d > 0 ? `+${d}` : d}
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-clinic-ink/50">Koi item nahi.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="min-w-[200px] flex-1 rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm" />
        <button onClick={submit} disabled={saving} className="rounded-full bg-clinic-teal px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Save...' : 'Ginti Save Karein'}
        </button>
      </div>
      <p className="mt-2 text-xs text-clinic-ink/50">Jis item ki ginti nahi ki, usay khali chhor dein, wo nahi badlega.</p>
      {msg && <p className="mt-3 rounded-xl bg-clinic-mint px-4 py-2 text-sm text-clinic-ink">{msg}</p>}
    </div>
  )
}

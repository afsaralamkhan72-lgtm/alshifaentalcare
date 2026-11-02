'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/karachi'

export type BudgetRow = { id: string; category: string; monthly_amount: number; note: string | null; is_active: boolean; spent: number }

export default function BudgetPanel({ rows, categories, owner }: { rows: BudgetRow[]; categories: string[]; owner: boolean }) {
  const router = useRouter()
  const [cat, setCat] = useState(categories[0] ?? '')
  const [amt, setAmt] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const input = 'rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'
  const active = rows.filter((r) => r.is_active)
  const totalBudget = active.reduce((s, r) => s + r.monthly_amount, 0)
  const within = active.reduce((s, r) => s + Math.min(r.spent, r.monthly_amount), 0)
  const over = active.reduce((s, r) => s + Math.max(r.spent - r.monthly_amount, 0), 0)

  async function save() {
    setMsg('')
    const a = Number(amt)
    if (!cat) return setMsg('Category chunein.')
    if (!(a > 0)) return setMsg('Budget ki raqam likhein.')
    const sb = createClient()
    const existing = rows.find((r) => r.category.toLowerCase() === cat.toLowerCase())
    const res = existing
      ? await sb.from('expense_budgets').update({ monthly_amount: a, note: note || null, is_active: true }).eq('id', existing.id)
      : await sb.from('expense_budgets').insert({ category: cat, monthly_amount: a, note: note || null })
    if (res.error) return setMsg(res.error.message)
    setAmt(''); setNote(''); router.refresh()
  }

  return (
    <details open={active.length > 0} className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-clinic-ink">Mahana budget (category ke hisaab se)</summary>
      {active.length === 0 && <p className="mt-3 text-sm text-clinic-ink/60">Abhi koi budget nahi lagaya.{owner ? ' Neeche se likhein.' : ''}</p>}
      {active.length > 0 && (
        <>
          <p className="mt-3 text-sm">Kul budget <strong>{money(totalBudget)}</strong> · budget ke andar kharch <strong>{money(within)}</strong>{over > 0 && <> · <span className="font-semibold text-red-600">budget se zyada {money(over)}</span></>}</p>
          <ul className="mt-2 divide-y divide-clinic-teal/10 text-sm">
            {active.map((r) => {
              const left = r.monthly_amount - r.spent
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{r.category}{r.note ? <span className="text-clinic-ink/50"> · {r.note}</span> : null}</span>
                  <span>{money(r.spent)} / {money(r.monthly_amount)} — {left >= 0 ? <span className="text-emerald-700">{money(left)} bacha</span> : <span className="font-semibold text-red-600">{money(-left)} zyada</span>}
                    {owner && <button className="ml-3 text-xs underline" onClick={async () => { await createClient().from('expense_budgets').update({ is_active: false }).eq('id', r.id); router.refresh() }}>Hatayein</button>}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {owner && (
        <div className="mt-3 flex flex-wrap gap-2">
          <select aria-label="Budget category" value={cat} onChange={(e) => setCat(e.target.value)} className={input}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          <input aria-label="Budget raqam" type="number" min={1} placeholder="Mahana budget Rs." value={amt} onChange={(e) => setAmt(e.target.value)} className={input} />
          <input aria-label="Budget note" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className={input} />
          <button onClick={save} className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal">Budget lagayein</button>
          {msg && <p role="alert" className="w-full text-sm text-red-600">{msg}</p>}
        </div>
      )}
    </details>
  )
}

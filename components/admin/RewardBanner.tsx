'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { money } from '@/lib/karachi'
import type { ReadyReward } from '@/lib/rewards'

const kt = (k: string, v: number | null) => (k === 'percent' ? `${v}% chhoot` : k === 'amount' ? `Rs.${v} chhoot` : 'Muft')

/** Tayyar inaam. invoice di ho to "Chhoot lagayein" ka button bhi (sirf us bill ki inaam wali treatments par). */
export default function RewardBanner({ rewards, invoice }: { rewards: ReadyReward[]; invoice?: { id: string; open: boolean; items: { name: string; line_total: number }[] } }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  if (rewards.length === 0) return null

  function preview(r: ReadyReward) {
    if (!invoice) return null
    const base = invoice.items
      .filter((i) => r.treatments.length === 0 || r.treatments.some((n) => n.trim() && i.name.toLowerCase().includes(n.trim().toLowerCase())))
      .reduce((s, i) => s + Number(i.line_total), 0)
    const d = r.kind === 'percent' ? Math.round(base * Number(r.value ?? 0)) / 100 : Math.min(Number(r.value ?? 0), base)
    return { base, d }
  }

  async function apply(r: ReadyReward) {
    if (!invoice) return
    setBusy(true); setMsg('')
    const { error } = await createClient().rpc('apply_reward_discount', { p_invoice: invoice.id, p_source: r.source, p_reward: r.id })
    setBusy(false)
    if (error) return setMsg('❌ ' + friendlyError(error.message))
    setMsg('✓ Chhoot lag gayi')
    router.refresh()
  }

  return (
    <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 print:hidden">
      <p className="font-semibold text-amber-900">🎁 Is marez ka loyalty inaam tayyar hai</p>
      <ul className="mt-2 grid gap-2 text-sm">
        {rewards.map((r) => {
          const p = preview(r)
          const disc = r.kind === 'percent' || r.kind === 'amount'
          return (
            <li key={r.source + r.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{r.title}</strong> — {kt(r.kind, r.value)}
                {r.treatments.length ? ` (sirf: ${r.treatments.join(', ')})` : ' (us din ke bill par)'}
                {r.expires_at ? ` · ${r.expires_at.slice(0, 10)} tak` : ''}
                {p && disc && (p.base > 0 ? <span className="block text-xs text-amber-800">Is bill par {money(p.base)} ka {kt(r.kind, r.value)} = <b>{money(p.d)}</b> kam</span> : <span className="block text-xs text-red-700">Is bill mein inaam wali treatment nahi</span>)}
                {!disc && <span className="block text-xs text-amber-800">Ye chhoot nahi, haath se dein aur Loyalty page par &quot;Inaam diya&quot; dabayein.</span>}
              </span>
              {invoice?.open && disc && p && p.base > 0 && (
                <button disabled={busy} onClick={() => apply(r)} className="rounded-full bg-clinic-teal px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">Chhoot lagayein</button>
              )}
            </li>
          )
        })}
      </ul>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  )
}

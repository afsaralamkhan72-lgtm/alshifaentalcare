'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getReadyRewards, type ReadyReward } from '@/lib/rewards'
import RewardBanner from '@/components/admin/RewardBanner'

/**
 * Visit page par loyalty inaam ka asaan raasta.
 * - Visit shuru/chalte waqt (visitId nahi): sirf yaad-dahani ke inaam tayyar hai, aur kya karna hai.
 * - Visit mukammal hone ke baad (visitId): us visit ke bill par "Discount lagayein" ka button
 *   (wohi tested apply_reward_discount, jo discount, discount log aur "inaam diya" aik sath karta hai).
 * Inaam na ho to kuch nahi dikhta.
 */
export default function VisitRewards({ patientId, visitId }: { patientId: string; visitId?: string }) {
  const [rewards, setRewards] = useState<ReadyReward[]>([])
  const [inv, setInv] = useState<{ id: string; open: boolean; items: { name: string; line_total: number }[] } | undefined>()

  const load = useCallback(async () => {
    const sb = createClient()
    const rw = await getReadyRewards(sb, patientId)
    setRewards(rw)
    if (!visitId || rw.length === 0) return setInv(undefined)
    const { data: i } = await sb
      .from('invoices')
      .select('id, status, total, paid_amount')
      .eq('clinical_visit_id', visitId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!i) return setInv(undefined)
    const { data: items } = await sb.from('invoice_items').select('name, line_total').eq('invoice_id', i.id)
    setInv({ id: i.id, open: Number(i.total) - Number(i.paid_amount) > 0, items: (items ?? []) as { name: string; line_total: number }[] })
  }, [patientId, visitId])

  useEffect(() => {
    void load()
  }, [load])

  if (rewards.length === 0) return null

  if (!visitId) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-semibold">🎁 Is marez ka loyalty inaam tayyar hai</p>
        <ul className="mt-1 list-disc pl-5">
          {rewards.map((r) => (
            <li key={r.source + r.id}>
              {r.title}
              {r.kind === 'percent' ? ` (${r.value}% discount)` : r.kind === 'amount' ? ` (Rs.${r.value} discount)` : ' (muft)'}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs">
          Discount lagane ka tareeqa: neeche &quot;kitne paise mile&quot; mein abhi kuch na likhein, visit mukammal karein, phir aane wali screen par
          &quot;Discount lagayein&quot; dabayein. Uske baad baqi paise lein.
        </p>
      </div>
    )
  }

  return (
    <div onClickCapture={() => setTimeout(() => void load(), 1200)}>
      <RewardBanner rewards={rewards} invoice={inv} />
      {inv && !inv.open && (
        <p className="mt-1 text-xs text-amber-800">Is bill ka baqaya 0 hai, is liye discount nahi lag sakti. Agli visit par lagayein.</p>
      )}
    </div>
  )
}

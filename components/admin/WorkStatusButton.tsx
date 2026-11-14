'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'

/** Kaam mukammal karna / dobara kholna. Baqaya ho to pehle poochta hai. */
export default function WorkStatusButton({ treatmentId, status, balance }: { treatmentId: string; status: string; balance: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [ask, setAsk] = useState(false)
  const [err, setErr] = useState('')
  const done = status === 'completed'
  async function go() {
    setBusy(true)
    setErr('')
    const { error } = await createClient().rpc('set_treatment_status', { p_treatment_id: treatmentId, p_status: done ? 'active' : 'completed' })
    setBusy(false)
    if (error) return setErr(friendlyError(error.message))
    setAsk(false)
    router.refresh()
  }
  const btn = 'inline-flex min-h-[40px] items-center rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50'
  return (
    <div className="grid gap-1">
      {!ask && (
        <button
          type="button"
          disabled={busy}
          data-testid={done ? 'work-reopen' : 'work-done'}
          onClick={() => (!done && balance > 0 ? setAsk(true) : go())}
          className={btn + (done ? ' border border-clinic-teal text-clinic-teal' : ' bg-emerald-600 text-white')}
        >
          {done ? 'Dobara kholein' : 'Ilaaj mukammal karein'}
        </button>
      )}
      {ask && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900" data-testid="work-done-confirm">
          Is kaam ka Rs. {Math.round(balance).toLocaleString('en-PK')} baqaya hai. Phir bhi mukammal karein?
          <span className="mt-1 flex gap-2">
            <button type="button" disabled={busy} data-testid="work-done-yes" onClick={go} className={btn + ' bg-emerald-600 text-white'}>
              Haan, mukammal
            </button>
            <button type="button" onClick={() => setAsk(false)} className={btn + ' border border-clinic-ink/20'}>
              Nahi
            </button>
          </span>
        </div>
      )}
      {err && <p className="text-xs text-red-700">{err}</p>}
    </div>
  )
}

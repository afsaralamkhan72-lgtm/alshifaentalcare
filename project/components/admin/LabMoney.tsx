'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/karachi'

interface Props {
  caseId: string
  status: string
  cost: number
  labPaid: number
}

/**
 * Lab ka 2-step flow:
 *  1) "Lab ko bhej diya"  (pending -> sent)
 *  2) "Lab se wapas aa gaya" -> sirf lab ka bill likhein; kharcha khud ban jata hai.
 * Baad mein lab ko payment "Lab ko payment" se.
 */
export default function LabMoney({ caseId, status, cost, labPaid }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState<null | 'receive' | 'pay'>(null)
  const [c, setC] = useState(cost > 0 ? String(cost) : '')
  const [paid, setPaid] = useState('')
  const [method, setMethod] = useState('cash')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [key, setKey] = useState(() => crypto.randomUUID())

  const received = status === 'received' || status === 'fitted'
  const owed = Math.max(0, cost - labPaid)
  const input = 'mt-1 w-full rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  async function setStatus(next: string) {
    setBusy(true)
    setErr('')
    const supabase = createClient()
    const { error } = await supabase.from('lab_cases').update({ status: next }).eq('id', caseId)
    setBusy(false)
    if (error) setErr(error.message)
    else router.refresh()
  }

  async function submit() {
    setBusy(true)
    setErr('')
    const supabase = createClient()
    const res =
      open === 'receive'
        ? await supabase.rpc('receive_lab_case', {
            p_case_id: caseId,
            p_cost: Number(c || 0),
            p_paid: Number(paid || 0),
            p_method: method,
            p_note: null,
            p_key: key,
          })
        : await supabase.rpc('pay_lab_case', {
            p_case_id: caseId,
            p_amount: Number(paid || 0),
            p_method: method,
            p_key: key,
          })
    setBusy(false)
    if (res.error) {
      setErr(res.error.message)
      return
    }
    setOpen(null)
    setPaid('')
    setKey(crypto.randomUUID())
    router.refresh()
  }

  return (
    <div className="mb-4 rounded-2xl border border-clinic-teal/10 bg-white p-4 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-clinic-ink/50">Lab ka hisaab</p>
          <p className="font-display font-semibold text-clinic-ink">
            Bill {money(cost)} · Diya {money(labPaid)} ·{' '}
            <span className={owed > 0 ? 'text-red-600' : 'text-emerald-700'}>Baqaya {money(owed)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === 'pending' && (
            <button disabled={busy} onClick={() => setStatus('sent')} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Lab ko bhej diya
            </button>
          )}
          {!received && (
            <button disabled={busy} onClick={() => setOpen('receive')} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
              Lab se wapas aa gaya
            </button>
          )}
          {received && status !== 'fitted' && (
            <button disabled={busy} onClick={() => setStatus('fitted')} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Patient ko lag gaya
            </button>
          )}
          {received && owed > 0 && (
            <button onClick={() => setOpen('pay')} className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal">
              Lab ko payment
            </button>
          )}
        </div>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">
                {open === 'receive' ? 'Lab se wapas aa gaya' : 'Lab ko payment'}
              </p>
              <button onClick={() => setOpen(null)} className="text-clinic-ink/40">✕</button>
            </div>
            <div className="mt-4 grid gap-3">
              {open === 'receive' && (
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Lab ka bill (Rs.)</label>
                  <input type="number" min="0" inputMode="decimal" value={c} onChange={(e) => setC(e.target.value)} className={input} />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-clinic-ink">
                  {open === 'receive' ? 'Abhi lab ko kitne diye (agar diye)' : `Kitne dene hain (max ${money(owed)})`}
                </label>
                <input type="number" min="0" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} className={input} />
              </div>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={input}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="easypaisa">Easypaisa</option>
                <option value="jazzcash">JazzCash</option>
              </select>
              <p className="text-xs text-clinic-ink/50">Jo raqam di jayegi wo khud &quot;Lab&quot; kharche mein likh jayegi.</p>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button disabled={busy} onClick={submit} className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

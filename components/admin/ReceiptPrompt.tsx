'use client'

import { useState } from 'react'
import { openFresh } from '@/lib/openFresh'
import { numFmt } from '@/lib/karachi'

/** Payment save hote hi: patient ko rasid (kitna mila, kitna baqi) WhatsApp par bhejne ka mauqa. */
export default function ReceiptPrompt({
  patientId,
  amount,
  method,
  onClose,
}: {
  patientId: string
  amount: number
  method?: string | null
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function send() {
    setBusy(true)
    setErr('')
    try {
      const q = new URLSearchParams({ patient: patientId, amount: String(amount), fresh: '1' })
      if (method) q.set('method', method)
      await openFresh(`/api/messages/receipt?${q.toString()}`)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Message nahi ban saka')
    }
    setBusy(false)
  }

  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
      <p className="font-semibold text-emerald-800">✓ Payment save ho gayi: Rs. {numFmt(amount)}</p>
      <p className="mt-1 text-sm text-emerald-900/80">Patient ko rasid bhej dein, taake usay mila hua aur baqi dono nazar aayein.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={send} className="rounded-full bg-whatsapp px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Ban raha hai...' : 'Rasid bhejein (WhatsApp)'}
        </button>
        <button type="button" onClick={onClose} className="rounded-full border border-emerald-300 px-5 py-2 text-sm text-emerald-900">
          Baad mein
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
    </div>
  )
}

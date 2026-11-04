'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'

/**
 * Patient ke apne record ka QR. Link sirf "QR banao" dabane par banta hai (har dafa page kholne par nahi),
 * taake bekar links na banein. Link ki muddat aur last-4 ki hifazat Settings se.
 */
export default function ShareQr({ patientId, size = 96, label = 'Apna hisaab khud dekhein, QR scan karein' }: { patientId: string; size?: number; label?: string }) {
  const [qr, setQr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function make() {
    setBusy(true)
    setErr('')
    const { data, error } = await createClient().rpc('create_share_link', { p_patient: patientId, p_prescription: null })
    if (error || !data) {
      setBusy(false)
      return setErr(friendlyError(error?.message ?? 'Link nahi bana'))
    }
    setQr(await QRCode.toDataURL(`${window.location.origin}/r/${data as string}`, { margin: 1, width: 300 }))
    setBusy(false)
  }

  if (!qr) {
    return (
      <div className="print:hidden" style={{ fontSize: 12 }}>
        <button type="button" onClick={make} disabled={busy} className="rounded-full border border-clinic-teal px-4 py-1.5 text-xs font-semibold text-clinic-teal disabled:opacity-50">
          {busy ? 'Bana raha hai…' : 'QR banao'}
        </button>
        {err && <p className="mt-1 text-red-600">{err}</p>}
      </div>
    )
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="QR" style={{ width: size, height: size }} />
      <p style={{ fontSize: 11, maxWidth: 130, lineHeight: 1.4 }}>{label}</p>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'

/** Bill / nuskhe ka "asli hai" QR: scan karne par sirf verify page khulta hai (koi tafseel nahi). Khud ban jata hai. */
export default function VerifyQr({ table, id, size = 72 }: { table: 'invoices' | 'prescriptions'; id: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const { data } = await createClient().from(table).select('verify_code').eq('id', id).maybeSingle()
        const code = (data as { verify_code?: string | null } | null)?.verify_code
        if (!code) return
        const url = await QRCode.toDataURL(`${window.location.origin}/verify/${code}`, { margin: 1, width: 240 })
        if (live) setSrc(url)
      } catch {}
    })()
    return () => {
      live = false
    }
  }, [table, id])
  if (!src) return null
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, breakInside: 'avoid' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Verify QR" style={{ width: size, height: size }} />
      <span style={{ fontSize: 10, lineHeight: 1.4, maxWidth: 90 }}>Asli hone ki tasdeeq ke liye scan karein</span>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { toInternationalPKNumber } from '@/lib/phone'

/** #print-sheet ko PDF banata hai (tasveer ki shakal mein, is liye Urdu bhi waisi hi aati hai jaisi screen par) */
async function makePdf(targetId: string): Promise<Blob> {
  const el = document.getElementById(targetId)
  if (!el) throw new Error('Kaghaz nahi mila')
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')])
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: Math.max(el.scrollWidth, 794) })
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  const m = 8
  const w = pw - m * 2
  const pxPerMm = canvas.width / w
  const pageH = Math.floor((ph - m * 2) * pxPerMm)
  let y = 0
  let first = true
  while (y < canvas.height) {
    const h = Math.min(pageH, canvas.height - y)
    const part = document.createElement('canvas')
    part.width = canvas.width
    part.height = h
    const ctx = part.getContext('2d')
    if (!ctx) throw new Error('PDF nahi ban saka')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, part.width, part.height)
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
    if (!first) pdf.addPage()
    pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, w, h / pxPerMm)
    first = false
    y += h
  }
  return pdf.output('blob')
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * Invoice / Prescription ke page par: "PDF download karein" aur "WhatsApp par bhejein".
 * Mobile: PDF seedha share (WhatsApp chunein). Laptop, ya jahan share na chale: message mein mehfooz link.
 */
export default function DocShare({
  targetId = 'print-sheet',
  fileName,
  patientId,
  rxId = null,
  phone,
  message,
}: {
  targetId?: string
  fileName: string
  patientId: string
  rxId?: string | null
  phone: string | null
  message: string
}) {
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const digits = phone ? toInternationalPKNumber(phone) : ''

  async function download() {
    setBusy('pdf')
    setErr('')
    setNote('')
    try {
      const blob = await makePdf(targetId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      setNote('PDF download ho gaya.')
    } catch (e) {
      setErr('PDF nahi ban saka: ' + (e instanceof Error ? e.message : 'dobara koshish karein') + '. "Print / PDF" wala button istemal karein.')
    }
    setBusy('')
  }

  async function viaLink() {
    const { data, error } = await createClient().rpc('create_share_link', { p_patient: patientId, p_prescription: rxId })
    if (error || !data) throw new Error(friendlyError(error?.message ?? 'Link nahi bana'))
    const url = window.location.origin + '/r/' + (data as string)
    const text = message + '\n\n' + url
    window.open('https://wa.me/' + digits + '?text=' + encodeURIComponent(text), '_blank', 'noopener')
  }

  async function whatsapp() {
    setBusy('wa')
    setErr('')
    setNote('')
    try {
      if (isMobile() && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
        const blob = await makePdf(targetId)
        const file = new File([blob], fileName, { type: 'application/pdf' })
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], text: message })
            setBusy('')
            return
          } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
              setBusy('')
              return
            }
          }
        }
      }
      await viaLink()
      setNote('WhatsApp khul gaya. Message mein mehfooz link hai.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'WhatsApp nahi khul saka')
    }
    setBusy('')
  }

  const btn = 'inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50'
  return (
    <div className="grid gap-1 print:hidden" data-testid="doc-share">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={download} disabled={Boolean(busy)} data-testid="doc-pdf" className={btn + ' bg-clinic-teal text-white'}>
          {busy === 'pdf' ? 'PDF ban raha hai…' : 'PDF download karein'}
        </button>
        {digits ? (
          <button type="button" onClick={whatsapp} disabled={Boolean(busy)} data-testid="doc-wa" className={btn + ' bg-whatsapp text-white'}>
            {busy === 'wa' ? 'Tayyar ho raha hai…' : 'WhatsApp par bhejein'}
          </button>
        ) : (
          <span className="self-center text-xs text-clinic-ink/60">Phone number nahi hai, WhatsApp nahi ho sakta.</span>
        )}
      </div>
      {note && <p className="text-xs text-emerald-700">{note}</p>}
      {err && <p className="text-xs text-red-700">{err}</p>}
    </div>
  )
}

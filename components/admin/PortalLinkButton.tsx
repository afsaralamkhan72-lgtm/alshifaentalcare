'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppLink } from '@/lib/whatsapp'

interface Props {
  patientId: string
  patientName: string
  patientPhone: string
  portalCode: string | null
}

export default function PortalLinkButton({
  patientId,
  patientName,
  patientPhone,
  portalCode,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // Built in the browser so it always matches the deployed domain
  const url =
    typeof window !== 'undefined' && portalCode
      ? `${window.location.origin}/portal/${portalCode}`
      : ''

  const link = portalCode
    ? buildWhatsAppLink({
        phoneOverride: patientPhone,
        customMessage: [
          `Assalam o Alaikum ${patientName},`,
          '',
          'Al Shifa Health Care mein aap ka record online dekha ja sakta hai ·',
          'appointment, agla visit aur payment ki tafseel.',
          '',
          url,
          '',
          `Aap ka code: ${portalCode}`,
          '',
          'Ye link zaati hai, kisi aur ke sath share na karein.',
          '',
          'Al Shifa Health Care · 0342-2078639',
        ].join('\n'),
      })
    : null

  /** If a code is ever shared by mistake, a new one invalidates the old link */
  async function regenerate() {
    if (
      !confirm(
        'Naya code banayein? Purana link kaam karna band kar dega, patient ko naya link bhejna hoga.'
      )
    )
      return

    setBusy(true)
    const supabase = createClient()
    const { data } = await supabase.rpc('generate_portal_code')

    if (data) {
      await supabase.from('patients').update({ portal_code: data }).eq('id', patientId)
    }

    setBusy(false)
    router.refresh()
  }

  if (!portalCode) {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Portal code nahi, phase7.sql chalayein
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal"
      >
        Patient Portal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">Patient Portal</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40">
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm text-clinic-ink/60">
              Patient apna appointment aur payment record dekh sakta hai.
            </p>

            <div className="mt-4 rounded-xl bg-clinic-mint p-4 text-center">
              <p className="text-xs text-clinic-ink/50">Access Code</p>
              <p className="mt-1 font-display text-xl font-semibold tracking-wide text-clinic-teal">
                {portalCode}
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-whatsapp px-5 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Send Link on WhatsApp
                </a>
              )}

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-clinic-teal px-5 py-2.5 text-center text-sm font-semibold text-clinic-teal"
              >
                Preview Portal
              </a>

              <button
                onClick={regenerate}
                disabled={busy}
                className="rounded-full px-5 py-2 text-xs text-red-600 hover:underline disabled:opacity-40"
              >
                {busy ? 'Working...' : 'Naya code banayein (purana band ho jayega)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

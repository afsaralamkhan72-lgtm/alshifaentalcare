'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppLink } from '@/lib/whatsapp'

interface PopupSettings {
  enabled: boolean
  delay_seconds: number
  title: string
  message: string
  button_text: string
}

// Fallback values — used if CMS hasn't loaded yet or is offline
const DEFAULT_SETTINGS: PopupSettings = {
  enabled: true,
  delay_seconds: 10,
  title: 'Emergency? Need Consultation?',
  message: 'Abhi WhatsApp par doctor se raabta karein',
  button_text: 'Chat on WhatsApp',
}

export default function EmergencyPopup() {
  const [settings, setSettings] = useState<PopupSettings>(DEFAULT_SETTINGS)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Pull live text/timing from CMS (site_settings.emergency_popup)
  // so Dr. Sahib's "Edit Website" changes apply without redeploying
  useEffect(() => {
    let active = true
    async function loadSettings() {
      const supabase = createClient()
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'emergency_popup')
        .single()

      if (active && data?.value) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.value })
      }
    }
    loadSettings()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!settings.enabled) return
    if (sessionStorage.getItem('as_popup_dismissed') === '1') return

    const timer = setTimeout(() => setVisible(true), settings.delay_seconds * 1000)
    return () => clearTimeout(timer)
  }, [settings.enabled, settings.delay_seconds])

  function handleDismiss() {
    setVisible(false)
    setDismissed(true)
    sessionStorage.setItem('as_popup_dismissed', '1')
  }

  if (!visible || dismissed) return null

  const whatsappHref = buildWhatsAppLink({
    customMessage: 'Asalam-o-Alaikum Dr. Sahib, mujhe emergency consultation chahiye.',
  })

  return (
    <div
      role="dialog"
      aria-label={settings.title}
      className="fixed bottom-6 left-1/2 z-50 w-[92%] max-w-sm -translate-x-1/2 animate-slide-up rounded-2xl border border-clinic-teal/10 bg-white p-4 shadow-2xl shadow-black/10 sm:left-auto sm:right-6 sm:translate-x-0"
    >
      <button
        onClick={handleDismiss}
        aria-label="Close"
        className="absolute right-3 top-3 text-clinic-ink/40 transition-colors hover:text-clinic-ink"
      >
        ✕
      </button>

      <div className="flex items-start gap-3 pr-5">
        {/* Signature "vital pulse" dot — ties popup to a heartbeat/vitals motif */}
        <span className="relative mt-1 flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-clinic-amber motion-reduce:animate-none" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-clinic-amber" />
        </span>

        <div className="flex-1">
          <p className="font-display text-base font-semibold text-clinic-ink">{settings.title}</p>
          <p className="mt-1 text-sm text-clinic-ink/70">{settings.message}</p>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-whatsapp px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1EBE5A]"
          >
            {settings.button_text}
          </a>
        </div>
      </div>
    </div>
  )
}

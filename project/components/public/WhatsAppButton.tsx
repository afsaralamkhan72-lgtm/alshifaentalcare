'use client'

import { buildWhatsAppLink } from '@/lib/whatsapp'

interface WhatsAppButtonProps {
  treatmentName?: string
  customMessage?: string
  variant?: 'floating' | 'inline'
  label?: string
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5C10.3 9 9.8 7.8 9.6 7.3c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.2-.2-.5-.4z" />
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.8-1.5c1.5.8 3.3 1.3 5.2 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.1c-1.7 0-3.4-.5-4.8-1.3l-.3-.2-3.4 1 1-3.3-.2-.3C3.5 14.6 3 13.3 3 12c0-4.9 4-8.9 9-8.9s9 4 9 8.9-4 9.1-9 9.1z" />
    </svg>
  )
}

/**
 * variant="inline"   -> small pill button, use next to each treatment/service
 * variant="floating" -> persistent bottom-right circular button, site-wide
 */
export default function WhatsAppButton({
  treatmentName,
  customMessage,
  variant = 'inline',
  label,
}: WhatsAppButtonProps) {
  const href = buildWhatsAppLink({ treatmentName, customMessage })

  if (variant === 'floating') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-teal"
      >
        <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-whatsapp motion-reduce:animate-none" />
        <WhatsAppIcon className="relative h-7 w-7" />
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1EBE5A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-teal"
    >
      <WhatsAppIcon className="h-4 w-4" />
      {label ?? 'Book on WhatsApp'}
    </a>
  )
}

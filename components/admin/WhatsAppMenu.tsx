'use client'

import { useState } from 'react'
import { openFresh } from '@/lib/openFresh'

/** Aik WhatsApp button, click par tayyar messages ki list (sab sirf WhatsApp kholte hain) */
export default function WhatsAppMenu({ items, label = 'WhatsApp', size = 'sm' }: { items: { label: string; href?: string; endpoint?: string }[]; label?: string; size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')
  const pad = size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)} className={`rounded-full bg-whatsapp font-semibold text-white ${pad}`}>
        {label} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-clinic-teal/15 bg-white shadow-lg">
            {items.map((it) =>
              it.endpoint ? (
                <button
                  key={it.label}
                  type="button"
                  onClick={async () => {
                    setErr('')
                    setOpen(false)
                    try {
                      await openFresh(it.endpoint!)
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : 'Message nahi ban saka')
                    }
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-clinic-ink hover:bg-clinic-mint"
                >
                  {it.label}
                </button>
              ) : (
                <a
                  key={it.label}
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm text-clinic-ink hover:bg-clinic-mint"
                >
                  {it.label}
                </a>
              )
            )}
          </div>
        </>
      )}
      {err && <p className="absolute right-0 z-30 mt-1 w-56 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}
    </div>
  )
}

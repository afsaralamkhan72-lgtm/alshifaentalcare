'use client'

import { useState } from 'react'

export interface ReminderRow {
  key: string
  name: string
  phone: string
  dept: string
  note: string
  text: string
}

function digits(p: string) {
  return p.replace(/\D/g, '').replace(/^0/, '92')
}

export default function ReminderList({ rows, empty }: { rows: ReminderRow[]; empty: string }) {
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [sent, setSent] = useState<Set<string>>(new Set())
  if (!rows.length) return <p className="rounded-2xl border border-clinic-teal/10 bg-white p-5 text-sm text-clinic-ink/60">{empty}</p>
  return (
    <div className="grid gap-2">
      {rows.map((r) => {
        const text = texts[r.key] ?? r.text
        const d = digits(r.phone)
        return (
          <div key={r.key} className="rounded-2xl border border-clinic-teal/10 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-clinic-ink">
                  {r.name} <span className="rounded-full bg-clinic-mint px-2 py-0.5 text-[11px] font-normal capitalize text-clinic-ink/60">{r.dept}</span>
                </p>
                <p className="text-xs text-clinic-ink/60">{r.note}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setOpen(open === r.key ? null : r.key)} className="text-xs text-clinic-teal underline">
                  {open === r.key ? 'band' : 'message dekhein/badlein'}
                </button>
                {d ? (
                  <a
                    href={`https://wa.me/${d}?text=${encodeURIComponent(text)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSent((s) => new Set(s).add(r.key))}
                    className="rounded-full bg-whatsapp px-4 py-1.5 text-sm font-semibold text-white"
                  >
                    WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-red-600">phone nahi</span>
                )}
                {sent.has(r.key) && <span className="text-[11px] text-emerald-700">khul gaya</span>}
              </div>
            </div>
            {open === r.key && (
              <textarea dir="auto" rows={10} value={text} onChange={(e) => setTexts({ ...texts, [r.key]: e.target.value })} className="mt-2 w-full rounded-lg border border-clinic-teal/25 p-2 text-sm" />
            )}
          </div>
        )
      })}
    </div>
  )
}

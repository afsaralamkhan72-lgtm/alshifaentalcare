'use client'

import { useEffect, useState } from 'react'
import { messageLink } from '@/lib/messages'

export interface VisitDone {
  title: string
  warn?: string
  visit_id?: string | null
  prescription_id?: string | null
  hasInvoice?: boolean
  sum: Record<string, string>
  at: number
}

export const doneKey = (treatmentId: string) => 'visit-done:' + treatmentId

export function saveVisitDone(treatmentId: string, d: VisitDone) {
  try {
    sessionStorage.setItem(doneKey(treatmentId), JSON.stringify(d))
  } catch {}
}

/** Visit khatam hone ke foran baad ilaaj ke page par: hari patti + Invoice | Prescription | WhatsApp */
export default function VisitDoneBanner({ treatmentId, patient, tpl }: { treatmentId: string; patient: { full_name: string; phone: string | null; gender: string | null }; tpl: Record<string, string> }) {
  const [d, setD] = useState<VisitDone | null>(null)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(doneKey(treatmentId))
      if (!raw) return
      const v = JSON.parse(raw) as VisitDone
      if (Date.now() - v.at < 6 * 60 * 60 * 1000) setD(v)
    } catch {}
  }, [treatmentId])
  if (!d) return null
  const btn = 'inline-flex min-h-[44px] items-center rounded-full px-5 py-2 text-sm font-semibold'
  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4" data-testid="visit-done-banner">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-display text-lg font-semibold text-emerald-900">✓ {d.title}</p>
        <button
          type="button"
          aria-label="Band karein"
          onClick={() => {
            try {
              sessionStorage.removeItem(doneKey(treatmentId))
            } catch {}
            setD(null)
          }}
          className="text-sm text-emerald-900/70 underline"
        >
          Band karein
        </button>
      </div>
      {d.warn && <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">{d.warn}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {d.hasInvoice && d.visit_id && (
          <a href={'/admin/visits/' + d.visit_id + '/invoice'} target="_blank" data-testid="done-invoice" className={btn + ' bg-clinic-teal text-white'}>
            Invoice
          </a>
        )}
        {d.prescription_id && (
          <a href={'/admin/prescriptions/' + d.prescription_id + '/print'} target="_blank" data-testid="done-rx" className={btn + ' bg-clinic-teal text-white'}>
            Prescription
          </a>
        )}
        {patient.phone && (
          <a href={messageLink('visit_summary', { full_name: patient.full_name, phone: patient.phone, gender: patient.gender }, d.sum, tpl)} target="_blank" rel="noreferrer" data-testid="done-wa" className={btn + ' bg-emerald-600 text-white'}>
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}

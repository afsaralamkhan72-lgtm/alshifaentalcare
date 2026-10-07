'use client'

import Link from 'next/link'
import { toothLabel } from '@/lib/teeth'

export interface Episode {
  id: string
  title: string
  tooth_numbers: string[] | null
  doctor_name: string | null
  started_on: string | null
  completed_on: string
  visit_count: number
  total_charged: number
  total_paid: number
  balance_left: number
  summary: string | null
  photos_cleared_at: string | null
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'
}

export default function PastTreatments({
  patientId,
  episodes,
}: {
  patientId: string
  episodes: Episode[]
}) {
  // Phase 0: photos ka auto-delete BAND. Photos ab sirf haath se (Photo Gallery se)
  // hataai ja sakti hain, kabhi khud nahi.

  if (episodes.length === 0) return null

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-clinic-ink">Purane Treatments</h2>
      <p className="text-sm text-clinic-ink/60">
        Mukammal ho chuke treatments ka khulasa. Ye hamesha mehfooz rehta hai.
      </p>

      <div className="mt-4 grid gap-3">
        {episodes.map((e) => {
          const teeth = e.tooth_numbers ?? []
          return (
            <div
              key={e.id}
              className="rounded-2xl border border-clinic-teal/15 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="font-display font-semibold text-clinic-ink">{e.title}</p>
                    {teeth.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-clinic-teal/40 px-1.5 py-0.5 text-xs font-semibold text-clinic-teal"
                      >
                        {toothLabel(t)}
                      </span>
                    ))}
                  </div>

                  <p className="mt-1 text-sm text-clinic-ink/70">
                    {fmt(e.started_on)} se {fmt(e.completed_on)} · {e.visit_count} visits
                    {e.doctor_name ? ` · ${e.doctor_name}` : ''}
                  </p>

                  <p className="mt-1 text-sm text-clinic-ink/70">
                    Charge Rs. {Number(e.total_charged).toLocaleString()} · Paid Rs.{' '}
                    {Number(e.total_paid).toLocaleString()}
                    {Number(e.balance_left) > 0 && (
                      <span className="font-semibold text-amber-700">
                        {' '}
                        · Baqaya Rs. {Number(e.balance_left).toLocaleString()}
                      </span>
                    )}
                  </p>

                  {e.summary && (
                    <p className="mt-1 text-sm text-clinic-ink/60">{e.summary}</p>
                  )}
                </div>

                <Link
                  href={`/admin/patients/${patientId}/summary/${e.id}`}
                  className="shrink-0 rounded-full border border-clinic-teal px-4 py-2 text-xs font-semibold text-clinic-teal"
                >
                  File Dekhein
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

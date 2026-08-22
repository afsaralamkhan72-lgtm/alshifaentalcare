'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

/** Treatment band hone ke kitne din baad photos saaf hongi */
const CLEANUP_AFTER_DAYS = 4

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
  const router = useRouter()

  // Purane treatments ki photos khud saaf ho jayein, taake storage bhare na.
  // Text record (payments, visits, summary) waisa hi rehta hai.
  useEffect(() => {
    const cutoff = Date.now() - CLEANUP_AFTER_DAYS * 86_400_000
    const stale = episodes.filter(
      (e) => !e.photos_cleared_at && new Date(e.completed_on).getTime() < cutoff
    )
    if (stale.length === 0) return

    async function cleanup() {
      const supabase = createClient()

      const { data: photos } = await supabase
        .from('patient_photos')
        .select('id, storage_path')
        .eq('patient_id', patientId)

      if (photos && photos.length > 0) {
        await supabase.storage.from('patient-media').remove(photos.map((p) => p.storage_path))
        await supabase
          .from('patient_photos')
          .delete()
          .in('id', photos.map((p) => p.id))
      }

      await supabase
        .from('treatment_episodes')
        .update({ photos_cleared_at: new Date().toISOString() })
        .in('id', stale.map((e) => e.id))

      router.refresh()
    }

    cleanup()
  }, [episodes, patientId, router])

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

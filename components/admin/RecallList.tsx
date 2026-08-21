'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppLink } from '@/lib/whatsapp'

export interface RecallRow {
  id: string
  recall_type: string
  interval_months: number
  last_done: string | null
  next_due: string
  reminders_sent: number
  last_reminded: string | null
  patients: {
    id: string
    full_name: string
    phone: string
    mr_number: string | null
    deleted_at: string | null
  } | null
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB') : '—'
}

export default function RecallList({
  rows,
  overdue = false,
}: {
  rows: RecallRow[]
  overdue?: boolean
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  /** Patient came in — push the next due date forward by the interval */
  async function markDone(r: RecallRow) {
    setBusyId(r.id)
    const today = new Date()
    const next = new Date(today)
    next.setMonth(next.getMonth() + r.interval_months)

    const supabase = createClient()
    await supabase
      .from('recalls')
      .update({
        last_done: today.toISOString().slice(0, 10),
        next_due: next.toISOString().slice(0, 10),
        reminders_sent: 0,
        last_reminded: null,
      })
      .eq('id', r.id)

    setBusyId(null)
    router.refresh()
  }

  /** Not now — push it out by one month */
  async function snooze(r: RecallRow) {
    setBusyId(r.id)
    const next = new Date(r.next_due)
    next.setMonth(next.getMonth() + 1)

    const supabase = createClient()
    await supabase
      .from('recalls')
      .update({ next_due: next.toISOString().slice(0, 10) })
      .eq('id', r.id)

    setBusyId(null)
    router.refresh()
  }

  async function stop(r: RecallRow) {
    if (!confirm(`${r.patients?.full_name} ka "${r.recall_type}" recall band karein?`)) return
    setBusyId(r.id)
    const supabase = createClient()
    await supabase.from('recalls').update({ status: 'stopped' }).eq('id', r.id)
    setBusyId(null)
    router.refresh()
  }

  /** Record that we messaged, so repeated nagging is visible */
  async function logReminder(r: RecallRow) {
    const supabase = createClient()
    await supabase
      .from('recalls')
      .update({
        reminders_sent: (r.reminders_sent ?? 0) + 1,
        last_reminded: new Date().toISOString().slice(0, 10),
      })
      .eq('id', r.id)
    router.refresh()
  }

  if (rows.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 px-4 py-6 text-center text-sm text-clinic-ink/50">
        Koi recall nahi.
      </div>
    )
  }

  return (
    <div className="mt-3 grid gap-3">
      {rows.map((r) => {
        const p = r.patients
        if (!p) return null

        const link = buildWhatsAppLink({
          phoneOverride: p.phone,
          customMessage: [
            `Assalam o Alaikum ${p.full_name},`,
            '',
            `Aap ka ${r.recall_type} due ho gaya hai${
              r.last_done ? ` (pichli baar ${fmt(r.last_done)})` : ''
            }.`,
            `Baraye meherbani appointment ke liye raabta karein.`,
            '',
            'Al Shifa Health Care',
            'Dr. Muhammad Khalid Mahmood',
            'Numaish, Nizami Road, Karachi · 0342-2078639',
          ].join('\n'),
        })

        return (
          <div
            key={r.id}
            className={`rounded-2xl border bg-white p-4 ${
              overdue ? 'border-red-200' : 'border-clinic-teal/10'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/patients/${p.id}`}
                  className="font-medium text-clinic-ink hover:text-clinic-teal"
                >
                  {p.full_name}
                </Link>
                <p className="text-xs text-clinic-ink/50">
                  {p.mr_number} · {p.phone}
                </p>
                <p className="mt-1 text-sm text-clinic-ink/70">
                  {r.recall_type} · har {r.interval_months} mahine
                </p>
                {r.reminders_sent > 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    {r.reminders_sent} reminder bhej chuke ({fmt(r.last_reminded)})
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-xs text-clinic-ink/50">Due</p>
                <p
                  className={`font-display font-semibold ${
                    overdue ? 'text-red-700' : 'text-clinic-teal'
                  }`}
                >
                  {fmt(r.next_due)}
                </p>
                <p className="text-xs text-clinic-ink/40">Last: {fmt(r.last_done)}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-clinic-teal/10 pt-3">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => logReminder(r)}
                className="rounded-full bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white"
              >
                Send Reminder
              </a>
              <a
                href={`tel:${p.phone.replace(/[^0-9+]/g, '')}`}
                className="rounded-full border border-clinic-teal px-3 py-1.5 text-xs font-semibold text-clinic-teal"
              >
                Call
              </a>
              <button
                onClick={() => markDone(r)}
                disabled={busyId === r.id}
                className="rounded-full bg-clinic-teal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                Aa Gaya (Done)
              </button>
              <button
                onClick={() => snooze(r)}
                disabled={busyId === r.id}
                className="rounded-full bg-clinic-mint px-3 py-1.5 text-xs font-semibold text-clinic-teal disabled:opacity-40"
              >
                +1 Month
              </button>
              <button
                onClick={() => stop(r)}
                disabled={busyId === r.id}
                className="rounded-full px-3 py-1.5 text-xs text-red-600 hover:underline disabled:opacity-40"
              >
                Stop
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

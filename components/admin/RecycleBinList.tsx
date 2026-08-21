'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface BinPatient {
  id: string
  mr_number: string | null
  full_name: string
  phone: string
  department: string
  deleted_at: string
}

export interface BinAppointment {
  id: string
  patient_name: string
  phone: string
  preferred_date: string | null
  preferred_time: string | null
  status: string
  deleted_at: string
}

/** How many days before auto-purge removes this row */
function daysLeft(iso: string) {
  const gone = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return Math.max(0, 30 - gone)
}

function daysAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (diff === 0) return 'Aaj'
  if (diff === 1) return 'Kal'
  return `${diff} din pehle`
}

export default function RecycleBinList({
  patients,
  appointments,
}: {
  patients: BinPatient[]
  appointments: BinAppointment[]
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function restore(table: 'patients' | 'appointments', id: string) {
    setBusyId(id)
    const supabase = createClient()
    await supabase.from(table).update({ deleted_at: null }).eq('id', id)
    setBusyId(null)
    router.refresh()
  }

  async function purge(table: 'patients' | 'appointments', id: string, name: string) {
    const warning =
      table === 'patients'
        ? `${name} ko HAMESHA ke liye mitayein? Uska dental chart, treatment plans, payments aur history bhi chale jayenge. Ye wapas nahi aayega.`
        : `${name} ka appointment hamesha ke liye mitayein?`

    if (!confirm(warning)) return

    setBusyId(id)
    const supabase = createClient()
    await supabase.from(table).delete().eq('id', id)
    setBusyId(null)
    router.refresh()
  }

  const empty = patients.length === 0 && appointments.length === 0

  if (empty) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-10 text-center text-sm text-clinic-ink/50">
        Recycle Bin khali hai.
      </div>
    )
  }

  return (
    <div className="mt-6 grid gap-8">
      {patients.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-clinic-ink">
            Patients ({patients.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {patients.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clinic-teal/10 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-clinic-ink">{p.full_name}</p>
                  <p className="text-xs text-clinic-ink/50">
                    {p.mr_number} · {p.phone} · {p.department}
                  </p>
                  <p className="mt-1 text-xs text-clinic-ink/40">
                    Delete kiya: {daysAgo(p.deleted_at)} ·{' '}
                    <span className={daysLeft(p.deleted_at) <= 5 ? 'font-semibold text-red-600' : ''}>
                      {daysLeft(p.deleted_at)} din baad khud mit jayega
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restore('patients', p.id)}
                    disabled={busyId === p.id}
                    className="rounded-full bg-clinic-teal px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => purge('patients', p.id, p.full_name)}
                    disabled={busyId === p.id}
                    className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40"
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {appointments.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-clinic-ink">
            Appointments ({appointments.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {appointments.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clinic-teal/10 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-clinic-ink">{a.patient_name}</p>
                  <p className="text-xs text-clinic-ink/50">
                    {a.phone}
                    {a.preferred_date
                      ? ` · ${new Date(a.preferred_date).toLocaleDateString('en-GB')}`
                      : ''}
                    {a.preferred_time ? ` ${a.preferred_time}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-clinic-ink/40">
                    Delete kiya: {daysAgo(a.deleted_at)} ·{' '}
                    <span className={daysLeft(a.deleted_at) <= 5 ? 'font-semibold text-red-600' : ''}>
                      {daysLeft(a.deleted_at)} din baad khud mit jayega
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restore('appointments', a.id)}
                    disabled={busyId === a.id}
                    className="rounded-full bg-clinic-teal px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => purge('appointments', a.id, a.patient_name)}
                    disabled={busyId === a.id}
                    className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40"
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  patientId: string
  patientName: string
  /** Abhi tak ka hisaab, form mein pehle se bhar dene ke liye */
  suggested: {
    title: string
    charged: number
    paid: number
    balance: number
    visits: number
    startedOn: string | null
    doctor: string | null
    teeth: string[]
  }
}

export default function CloseTreatmentButton({ patientId, suggested }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState(suggested.title)
  const [summary, setSummary] = useState('')

  async function close() {
    if (!title.trim()) {
      setError('Treatment ka naam likhna zaroori hai.')
      return
    }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: episode, error: err } = await supabase
      .from('treatment_episodes')
      .insert({
        patient_id: patientId,
        title: title.trim(),
        tooth_numbers: suggested.teeth,
        doctor_name: suggested.doctor,
        started_on: suggested.startedOn,
        visit_count: suggested.visits,
        total_charged: suggested.charged,
        total_paid: suggested.paid,
        balance_left: suggested.balance,
        summary: summary.trim() || null,
        created_by: user?.id ?? null,
      })
      .select('id')
      .single()

    setSaving(false)

    if (err || !episode) {
      setError('Save nahi hua. Kya phase20.sql chalayi thi?')
      return
    }

    setOpen(false)
    // Seedha print-ready summary par le jayein
    router.push(`/admin/patients/${patientId}/summary/${episode.id}`)
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Treatment Mukammal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">
                Treatment Band Karein
              </p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40">
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-sm font-medium text-clinic-ink">Treatment ka naam</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="RCT left 6"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-clinic-ink">
                  Khulasa (optional)
                </label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Kaam theek hua, koi complication nahi. 6 mahine baad check-up."
                  className={inputClass}
                />
              </div>

              {/* Jo record hamesha ke liye mehfooz hoga */}
              <div className="rounded-xl bg-clinic-mint p-4 text-sm">
                <p className="font-semibold text-clinic-ink">Record mein ye mehfooz hoga:</p>
                <div className="mt-2 grid gap-1 text-clinic-ink/70">
                  <p>Visits: {suggested.visits}</p>
                  <p>Charge: Rs. {suggested.charged.toLocaleString()}</p>
                  <p>Paid: Rs. {suggested.paid.toLocaleString()}</p>
                  <p>Baqaya: Rs. {suggested.balance.toLocaleString()}</p>
                  {suggested.teeth.length > 0 && <p>Teeth: {suggested.teeth.join(', ')}</p>}
                  {suggested.doctor && <p>Doctor: {suggested.doctor}</p>}
                </div>
              </div>

              <p className="text-xs text-clinic-ink/50">
                Payment aur visit ka poora record waisa hi rahega. Sirf treatment ki
                photos 4 din baad khud saaf ho jayengi, taake storage bhare na.
              </p>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={close}
                disabled={saving}
                className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Band Karein aur File Banayein'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/** Lab se kaam aa jaye to: patient ko batana + fit ki appointment. Sirf "received" case par dikhta hai. */
export default function LabPatientNotify({
  caseId,
  patientId,
  waLink,
  notifiedAt,
  patient,
  workType,
}: {
  caseId: string
  patientId: string
  waLink: string | null
  notifiedAt: string | null
  patient: { name: string; phone: string; department: string } | null
  workType: string | null
}) {
  const [fitDate, setFitDate] = useState('')
  const [fitMsg, setFitMsg] = useState('')
  async function bookFit() {
    if (!patient || !fitDate) return setFitMsg('Pehle tareekh chunein.')
    const { error } = await createClient().from('appointments').insert({
      patient_id: patientId,
      patient_name: patient.name,
      phone: patient.phone,
      department: patient.department === 'homeopathic' ? 'homeopathic' : 'dental',
      preferred_date: fitDate,
      status: 'confirmed',
      treatment_name: `Fit: ${workType ?? 'lab ka kaam'}`,
      source: 'walk-in',
    })
    setFitMsg(error ? 'Appointment nahi bani: ' + error.message : 'Fit ki appointment ban gayi.')
    if (!error) router.refresh()
  }
  const router = useRouter()
  const [done, setDone] = useState(notifiedAt)
  async function notify() {
    window.open(waLink!, '_blank')
    const now = new Date().toISOString()
    const { error } = await createClient().from('lab_cases').update({ patient_notified_at: now }).eq('id', caseId)
    if (!error) {
      setDone(now)
      router.refresh()
    }
  }
  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 print:hidden">
      <p className="font-semibold text-emerald-900">Lab se kaam aa gaya — ab patient ko batayein</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {waLink && (
          <button onClick={notify} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            Patient ko WhatsApp
          </button>
        )}
        <input type="date" value={fitDate} onChange={(e) => setFitDate(e.target.value)} className="rounded-lg border border-emerald-300 px-2 py-1.5 text-sm" aria-label="Fit ki tareekh" />
        <button onClick={bookFit} className="rounded-full border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-800">
          Fit ki appointment banayein
        </button>
        <Link href={`/admin/patients/${patientId}`} className="text-xs text-emerald-800 underline">
          Patient profile
        </Link>
        {fitMsg && <span className="text-xs text-emerald-900">{fitMsg}</span>}
        {done && <span className="text-xs text-emerald-800">Patient ko bata diya gaya ({new Date(done).toLocaleDateString('en-GB')})</span>}
      </div>
    </div>
  )
}

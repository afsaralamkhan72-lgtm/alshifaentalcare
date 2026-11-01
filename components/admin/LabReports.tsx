'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPatientFiles } from '@/lib/upload'
import MediaStrip, { type MediaItem } from './MediaStrip'

/** Lab se aayi report / tasveer: clinic staff khud upload karta hai (tabhi "report aa gayi" mani jati hai) */
export default function LabReports({
  caseId,
  patientId,
  treatmentId,
  files,
  canUpload,
}: {
  caseId: string
  patientId: string | null
  treatmentId: string | null
  files: MediaItem[]
  canUpload: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!list.length || !patientId) return
    setBusy(true)
    setMsg('')
    const res = await uploadPatientFiles(createClient(), patientId, list, { category: 'lab', lab_case_id: caseId, treatment_id: treatmentId })
    setBusy(false)
    setMsg(res.error ? res.error : `${res.ok} file save ho gayi`)
    router.refresh()
  }

  return (
    <div className="mb-4 rounded-2xl border border-clinic-teal/10 bg-white p-4 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display font-semibold text-clinic-ink">Lab report / files ({files.length})</p>
          <p className="text-xs text-clinic-ink/50">Report aaye to yahan upload karein. Patient ki profile aur treatment mein bhi nazar aayegi.</p>
        </div>
        {canUpload && patientId && (
          <label className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-white ${busy ? 'bg-clinic-ink/40' : 'bg-clinic-teal'}`}>
            {busy ? 'Upload...' : '+ Report upload'}
            <input type="file" accept="image/*,application/pdf" multiple onChange={upload} disabled={busy} className="hidden" />
          </label>
        )}
      </div>
      {files.length === 0 ? <p className="mt-2 text-sm text-clinic-ink/50">Abhi koi report nahi.</p> : <MediaStrip items={files} size={72} />}
      {msg && <p className={`mt-2 text-sm ${msg.includes('save ho gayi') ? 'text-emerald-700' : 'text-red-600'}`}>{msg}</p>}
    </div>
  )
}

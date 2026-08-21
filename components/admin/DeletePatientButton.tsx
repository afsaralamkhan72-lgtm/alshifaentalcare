'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  patientId: string
  patientName: string
  mrNumber: string | null
}

/**
 * Deleting a patient also removes their dental chart, treatment plans,
 * installments, visit notes, prescriptions and history (ON DELETE CASCADE).
 * So we make the doctor type the name — no accidental clicks.
 */
export default function DeletePatientButton({ patientId, patientName, mrNumber }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const matches = typed.trim().toLowerCase() === patientName.trim().toLowerCase()

  async function handleDelete() {
    if (!matches) return
    setDeleting(true)
    setError('')

    const supabase = createClient()
    // Soft delete — row stays in the database and can be restored
    // from the Recycle Bin.
    const { error: err } = await supabase
      .from('patients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', patientId)

    if (err) {
      setDeleting(false)
      setError('Delete nahi hua. Dobara koshish karein.')
      return
    }

    router.push('/admin/patients')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <p className="font-display text-lg font-semibold text-clinic-ink">Patient Delete Karein?</p>

            <div className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">
                {patientName} {mrNumber ? `(${mrNumber})` : ''}
              </p>
              <p className="mt-2">Ye record aur us ka saara data chhup jayega:</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                <li>Dental chart</li>
                <li>Treatment plans aur sab installments</li>
                <li>Visit notes aur follow-ups</li>
                <li>Prescriptions</li>
                <li>Patient history</li>
              </ul>
              <p className="mt-2 text-xs font-semibold">
                Ghabrayein nahi — ye Recycle Bin mein chala jayega aur wahan se wapas laya
                ja sakta hai.
              </p>
            </div>

            <label className="mt-4 block text-sm text-clinic-ink">
              Tasdeeq ke liye patient ka pura naam likhein:
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={patientName}
              className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-red-400"
            />

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setOpen(false)
                  setTyped('')
                  setError('')
                }}
                className="rounded-full border border-clinic-teal/20 px-4 py-2 text-sm font-semibold text-clinic-ink/70"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!matches || deleting}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {deleting ? 'Deleting...' : 'Move to Recycle Bin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

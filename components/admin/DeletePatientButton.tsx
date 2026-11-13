'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { numFmt } from '@/lib/karachi'

interface Props {
  patientId: string
  patientName: string
  mrNumber: string | null
}

/**
 * Deleting a patient also removes their dental chart, treatment plans,
 * installments, visit notes, prescriptions and history (ON DELETE CASCADE).
 * So we make the doctor type the name, no accidental clicks.
 */
export default function DeletePatientButton({ patientId, patientName, mrNumber }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [owing, setOwing] = useState(0)
  const [mode, setMode] = useState<'bin' | 'forever'>('bin')
  // Baqaya wale patient ko hatane se pehle saaf warning
  useEffect(() => {
    if (!open) return
    createClient()
      .from('patient_balances')
      .select('balance')
      .eq('patient_id', patientId)
      .maybeSingle()
      .then(({ data }) => setOwing(Number((data as { balance?: number } | null)?.balance ?? 0)))
  }, [open, patientId])

  const matches = typed.trim().toLowerCase() === patientName.trim().toLowerCase()

  async function handleDelete() {
    if (!matches) return
    setDeleting(true)
    setError('')

    const supabase = createClient()
    // Soft delete, row stays in the database and can be restored
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

    if (mode === 'forever') {
      const { data, error: pErr } = await supabase.rpc('purge_patient', { p_id: patientId, p_confirm: 'DELETE' })
      if (pErr) {
        setDeleting(false)
        setError('Patient Recycle Bin mein chala gaya, lekin hamesha ke liye nahi hata: ' + pErr.message)
        return
      }
      const paths = ((data as { photo_paths?: string[] } | null)?.photo_paths ?? []).filter(Boolean)
      if (paths.length) await supabase.storage.from('patient-media').remove(paths)
    }

    router.push('/admin/patients')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="del-open"
        className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
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
            </div>

            <div className="mt-4 grid gap-2" data-testid="del-modes">
              <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${mode === 'bin' ? 'border-clinic-teal bg-clinic-mint/30' : 'border-clinic-teal/15'}`}>
                <input type="radio" name="del-mode" data-testid="del-bin" checked={mode === 'bin'} onChange={() => setMode('bin')} className="mt-1" />
                <span>
                  <span className="font-semibold text-clinic-ink">Recycle Bin mein bhejein</span>
                  <span className="block text-xs text-clinic-ink/60">Wapas aa sakta hai. Us ke paise hisaab mein rehte hain.</span>
                </span>
              </label>
              <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${mode === 'forever' ? 'border-red-400 bg-red-50' : 'border-clinic-teal/15'}`}>
                <input type="radio" name="del-mode" data-testid="del-forever" checked={mode === 'forever'} onChange={() => setMode('forever')} className="mt-1" />
                <span>
                  <span className="font-semibold text-red-700">Hamesha ke liye hatayein</span>
                  <span className="block text-xs text-clinic-ink/60">Sab record ke sath: bill, payments, prescriptions, visits, tasveerein. Wapas nahi aayega aur us ke paise hisaab se bhi nikal jayenge.</span>
                </span>
              </label>
            </div>

            {owing > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Dhyan dein: is patient ka Rs. {numFmt(owing)} baqaya hai. Recycle bin mein jane se wo Dues list mein nahi dikhega. Pehle baqaya wasool karein ya soch samajh kar hatayein.
              </p>
            )}
            <label className="mt-4 block text-sm text-clinic-ink">
              Tasdeeq ke liye patient ka pura naam likhein:
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={patientName}
              data-testid="del-name"
              className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-red-400"
            />

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setOpen(false)
                  setTyped('')
                  setError('')
                  setMode('bin')
                }}
                className="rounded-full border border-clinic-teal/20 px-4 py-2 text-sm font-semibold text-clinic-ink/70"
              >
                Wapas
              </button>
              <button
                onClick={handleDelete}
                disabled={!matches || deleting}
                data-testid="del-go"
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {deleting ? 'Ho raha hai...' : mode === 'forever' ? 'Hamesha ke liye hatayein' : 'Recycle bin mein bhejein'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

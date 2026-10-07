'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface PatientEditModalProps {
  patient: {
    id: string
    full_name: string
    phone: string
    department: 'dental' | 'homeopathic'
    age: number | null
    gender: string | null
    date_of_birth?: string | null
    address: string | null
    notes: string | null
  }
}

export default function PatientEditModal({ patient }: PatientEditModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    full_name: patient.full_name,
    phone: patient.phone,
    department: patient.department,
    age: patient.age?.toString() ?? '',
    gender: patient.gender ?? '',
    date_of_birth: patient.date_of_birth ?? '',
    address: patient.address ?? '',
    notes: patient.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('patients')
      .update({
        full_name: form.full_name,
        phone: form.phone,
        department: form.department,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        address: form.address || null,
        notes: form.notes || null,
      })
      .eq('id', patient.id)

    setSaving(false)
    if (updateError) {
      setError('Update nahi hua, dobara koshish karein.')
      return
    }

    setOpen(false)
    router.refresh()
  }

  const inputClass =
    'rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal transition-colors hover:bg-clinic-teal hover:text-white"
      >
        Edit Patient
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">Edit Patient</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40 hover:text-clinic-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
              <input
                required
                placeholder="Full Name"
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                className={inputClass}
              />
              <input
                required
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className={inputClass}
              />
              <select
                value={form.department}
                onChange={(e) => update('department', e.target.value as typeof form.department)}
                className={inputClass}
              >
                <option value="dental">Dental</option>
                <option value="homeopathic">Homeopathic</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Age"
                  value={form.age}
                  onChange={(e) => update('age', e.target.value)}
                  className={inputClass}
                />
                <select value={form.gender} onChange={(e) => update('gender', e.target.value)} className={inputClass}>
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-clinic-ink/50">Date of Birth (optional)</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => update('date_of_birth', e.target.value)}
                  className={inputClass}
                />
              </div>
              <textarea
                placeholder="Address"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                rows={2}
                className={inputClass}
              />
              <textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={2}
                className={inputClass}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Update Patient'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface FormState {
  full_name: string
  phone: string
  department: 'dental' | 'homeopathic'
  age: string
  gender: string
  address: string
}

const INITIAL: FormState = {
  full_name: '',
  phone: '',
  department: 'dental',
  age: '',
  gender: '',
  address: '',
}

export default function PatientsToolbar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: insertError } = await supabase.from('patients').insert({
      full_name: form.full_name,
      phone: form.phone,
      department: form.department,
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,
      address: form.address || null,
    })

    setSaving(false)
    if (insertError) {
      setError('Patient save nahi hua, dobara koshish karein.')
      return
    }

    setForm(INITIAL)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light"
      >
        + Add Patient
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">Add New Patient</p>
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
                className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
              />
              <input
                required
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
              />
              <select
                value={form.department}
                onChange={(e) => update('department', e.target.value as FormState['department'])}
                className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
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
                  className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                />
                <select
                  value={form.gender}
                  onChange={(e) => update('gender', e.target.value)}
                  className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                >
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <textarea
                placeholder="Address (optional)"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                rows={2}
                className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Patient'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

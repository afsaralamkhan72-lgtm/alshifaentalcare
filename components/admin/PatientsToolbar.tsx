'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface FormState {
  full_name: string
  phone: string
  department: 'dental' | 'homeopathic'
  age: string
  gender: string
  primary_doctor: string
  address: string
}

const INITIAL: FormState = {
  full_name: '',
  phone: '',
  department: 'dental',
  age: '',
  gender: '',
  primary_doctor: '',
  address: '',
}

export default function PatientsToolbar({
  knownDoctors = [],
}: {
  knownDoctors?: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState('')

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { data: created, error: insertError } = await supabase
      .from('patients')
      .insert({
        full_name: form.full_name,
        phone: form.phone,
        department: form.department,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        primary_doctor: form.primary_doctor || null,
        address: form.address || null,
      })
      .select('id')
      .single()

    setSaving(false)
    if (insertError || !created) {
      setError('Could not save the patient. Please try again.')
      return
    }

    if (form.primary_doctor.trim()) {
      await supabase.from('treating_doctors').insert({ name: form.primary_doctor.trim() })
    }

    setForm(INITIAL)
    setOpen(false)
    setCreated({ id: created.id, name: form.full_name })
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

      {created && (
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-lg sm:inset-x-auto sm:right-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium text-emerald-900">
              {created.name} register ho gaya
            </p>
            <button
              onClick={() => setCreated(null)}
              className="text-emerald-800/50 hover:text-emerald-900"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/admin/patients/${created.id}/invoice`}
              className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white"
            >
              Bill Banayein
            </Link>
            <Link
              href={`/admin/patients/${created.id}`}
              className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal"
            >
              Profile
            </Link>
            <button
              onClick={() => {
                setCreated(null)
                setOpen(true)
              }}
              className="rounded-full px-4 py-2 text-sm font-medium text-emerald-800/70 hover:underline"
            >
              Agla patient
            </button>
          </div>
        </div>
      )}

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
              <div>
                <label className="text-sm font-medium text-clinic-ink">Naam *</label>
                <input
                  required
                  autoFocus
                  placeholder="Patient ka poora naam"
                  value={form.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-clinic-ink">Phone *</label>
                <input
                  required
                  placeholder="03XX-XXXXXXX"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-clinic-ink">Department</label>
                <div className="mt-1 flex gap-2">
                  {(['dental', 'homeopathic'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => update('department', d)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${
                        form.department === d
                          ? 'bg-clinic-teal text-white'
                          : 'bg-clinic-mint text-clinic-ink/70'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
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
              <details className="rounded-xl bg-clinic-mint/40 p-3">
                <summary className="cursor-pointer text-sm font-medium text-clinic-teal">
                  Aur tafseel (optional)
                </summary>
                <div className="mt-3 grid gap-3">
              <div>
                <label className="text-xs text-clinic-ink/50">Treating Doctor</label>
                <input
                  list="toolbar-doctors"
                  placeholder="Doctor apna naam likhein"
                  value={form.primary_doctor}
                  onChange={(e) => update('primary_doctor', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                />
                <datalist id="toolbar-doctors">
                  {knownDoctors.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
                </div>
              </details>

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

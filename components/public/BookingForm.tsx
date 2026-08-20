'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppLink } from '@/lib/whatsapp'

interface FormState {
  patient_name: string
  phone: string
  department: 'dental' | 'homeopathic'
  treatment_name: string
  preferred_date: string
  preferred_time: string
}

const INITIAL_STATE: FormState = {
  patient_name: '',
  phone: '',
  department: 'dental',
  treatment_name: '',
  preferred_date: '',
  preferred_time: '',
}

export default function BookingForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')

    try {
      const supabase = createClient()
      const { error } = await supabase.from('appointments').insert({
        patient_name: form.patient_name,
        phone: form.phone,
        department: form.department,
        treatment_name: form.treatment_name || null,
        preferred_date: form.preferred_date || null,
        preferred_time: form.preferred_time || null,
        source: 'website',
      })
      if (error) throw error
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl bg-clinic-mint p-8 text-center">
        <p className="font-display text-lg font-semibold text-clinic-teal">
          Request Bhej Diya Gaya!
        </p>
        <p className="mt-2 text-sm text-clinic-ink/70">
          Hamari team jald aap se raabta karegi. Agar jaldi hai to abhi WhatsApp par bhi
          confirm kar sakte hain.
        </p>
        <a
          href={buildWhatsAppLink({ treatmentName: form.treatment_name || undefined })}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white"
        >
          Confirm on WhatsApp
        </a>
      </div>
    )
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm text-clinic-ink outline-none focus:border-clinic-teal'

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-clinic-teal/10 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <label className="text-sm font-medium text-clinic-ink">Full Name</label>
        <input
          required
          value={form.patient_name}
          onChange={(e) => update('patient_name', e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-clinic-ink">Phone Number</label>
        <input
          required
          type="tel"
          placeholder="03XX-XXXXXXX"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-clinic-ink">Department</label>
        <select
          value={form.department}
          onChange={(e) => update('department', e.target.value as FormState['department'])}
          className={inputClass}
        >
          <option value="dental">Dental</option>
          <option value="homeopathic">Homeopathic</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-clinic-ink">Treatment (optional)</label>
        <input
          value={form.treatment_name}
          onChange={(e) => update('treatment_name', e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-clinic-ink">Preferred Date</label>
          <input
            type="date"
            value={form.preferred_date}
            onChange={(e) => update('preferred_date', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-clinic-ink">Preferred Time</label>
          <input
            type="time"
            value={form.preferred_time}
            onChange={(e) => update('preferred_time', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">
          Kuch masla hua — dobara koshish karein ya seedha WhatsApp par message karein.
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-2 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light disabled:opacity-60"
      >
        {status === 'submitting' ? 'Sending...' : 'Request Appointment'}
      </button>
    </form>
  )
}

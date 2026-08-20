'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildPrescriptionWhatsAppLink } from '@/lib/whatsapp'

interface Patient {
  id: string
  full_name: string
  phone: string
  department: 'dental' | 'homeopathic'
  mr_number: string
}

interface Item {
  name_en: string
  name_ur: string
  potency: string
  dosage: string
  frequency: string
  duration: string
}

const EMPTY_ITEM: Item = {
  name_en: '',
  name_ur: '',
  potency: '',
  dosage: '',
  frequency: '',
  duration: '',
}

export default function PrescriptionForm({ patients }: { patients: Patient[] }) {
  const router = useRouter()
  const [patientId, setPatientId] = useState('')
  const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM }])
  const [notesEn, setNotesEn] = useState('')
  const [notesUr, setNotesUr] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedFor, setSavedFor] = useState<Patient | null>(null)

  const patient = patients.find((p) => p.id === patientId) ?? null
  const isHomeo = patient?.department === 'homeopathic'

  function updateItem(index: number, key: keyof Item, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patient) return
    setSaving(true)
    setError('')

    const cleanItems = items.filter((it) => it.name_en.trim() || it.name_ur.trim())
    if (cleanItems.length === 0) {
      setError('Kam az kam aik medicine/procedure likhein.')
      setSaving(false)
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('prescriptions').insert({
      patient_id: patient.id,
      department: patient.department,
      items: cleanItems,
      notes_en: notesEn || null,
      notes_ur: notesUr || null,
      prescribed_by: user?.id ?? null,
    })

    setSaving(false)
    if (insertError) {
      setError('Prescription save nahi hui, dobara koshish karein.')
      return
    }

    setSavedFor(patient)
    router.refresh()
  }

  function resetForm() {
    setSavedFor(null)
    setItems([{ ...EMPTY_ITEM }])
    setNotesEn('')
    setNotesUr('')
    setPatientId('')
  }

  const inputClass =
    'w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  // After saving, show the WhatsApp share step
  if (savedFor) {
    const link = buildPrescriptionWhatsAppLink({
      patientPhone: savedFor.phone,
      patientName: savedFor.full_name,
      items: items.filter((it) => it.name_en.trim() || it.name_ur.trim()),
      notesEn: notesEn || undefined,
    })

    return (
      <div className="rounded-2xl border border-clinic-teal/10 bg-white p-6 text-center">
        <p className="font-display text-lg font-semibold text-clinic-teal">Prescription Save Ho Gayi</p>
        <p className="mt-1 text-sm text-clinic-ink/60">
          {savedFor.full_name} ({savedFor.mr_number}) ke liye.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white"
          >
            Send on WhatsApp
          </a>
          <button
            onClick={resetForm}
            className="rounded-full border border-clinic-teal px-5 py-2.5 text-sm font-semibold text-clinic-teal"
          >
            New Prescription
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
      <label className="text-sm font-medium text-clinic-ink">Patient</label>
      <select
        required
        value={patientId}
        onChange={(e) => setPatientId(e.target.value)}
        className={`mt-1 ${inputClass}`}
      >
        <option value="">Select patient...</option>
        {patients.map((p) => (
          <option key={p.id} value={p.id}>
            {p.mr_number} — {p.full_name} ({p.department})
          </option>
        ))}
      </select>

      {patient && (
        <>
          <div className="mt-6 flex items-center justify-between">
            <p className="font-display font-semibold text-clinic-ink">
              {isHomeo ? 'Remedies' : 'Procedures / Medicines'}
            </p>
            <button
              type="button"
              onClick={addItem}
              className="rounded-full bg-clinic-mint px-3 py-1 text-xs font-semibold text-clinic-teal"
            >
              + Add Row
            </button>
          </div>

          <div className="mt-3 grid gap-4">
            {items.map((item, i) => (
              <div key={i} className="rounded-xl bg-clinic-mint/40 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-clinic-ink/50">#{i + 1}</p>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <input
                    placeholder={isHomeo ? 'Remedy (English)' : 'Procedure / Medicine (English)'}
                    value={item.name_en}
                    onChange={(e) => updateItem(i, 'name_en', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    dir="rtl"
                    placeholder="اردو نام"
                    value={item.name_ur}
                    onChange={(e) => updateItem(i, 'name_ur', e.target.value)}
                    className={`${inputClass} font-urdu`}
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {isHomeo && (
                    <input
                      placeholder="Potency (30C)"
                      value={item.potency}
                      onChange={(e) => updateItem(i, 'potency', e.target.value)}
                      className={inputClass}
                    />
                  )}
                  <input
                    placeholder={isHomeo ? 'Dosage (3 drops)' : 'Dosage'}
                    value={item.dosage}
                    onChange={(e) => updateItem(i, 'dosage', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    placeholder="Frequency (3x daily)"
                    value={item.frequency}
                    onChange={(e) => updateItem(i, 'frequency', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    placeholder="Duration (7 days)"
                    value={item.duration}
                    onChange={(e) => updateItem(i, 'duration', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <textarea
              placeholder="Notes (English)"
              value={notesEn}
              onChange={(e) => setNotesEn(e.target.value)}
              rows={3}
              className={inputClass}
            />
            <textarea
              dir="rtl"
              placeholder="ہدایات (اردو)"
              value={notesUr}
              onChange={(e) => setNotesUr(e.target.value)}
              rows={3}
              className={`${inputClass} font-urdu`}
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Prescription'}
          </button>
        </>
      )}
    </form>
  )
}

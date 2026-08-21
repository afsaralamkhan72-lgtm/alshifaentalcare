'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppLink } from '@/lib/whatsapp'

export interface Appointment {
  id: string
  patient_name: string
  phone: string
  department: string | null
  treatment_name: string | null
  preferred_date: string | null
  preferred_time: string | null
  status: string
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-clinic-teal/10 text-clinic-teal',
  cancelled: 'bg-red-50 text-red-700',
}

export default function AppointmentBoard({ appointments }: { appointments: Appointment[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    patient_name: '',
    phone: '',
    department: 'dental',
    treatment_name: '',
    preferred_date: new Date().toISOString().slice(0, 10),
    preferred_time: '',
  })

  async function setStatus(id: string, status: string) {
    setBusyId(id)
    const supabase = createClient()
    await supabase.from('appointments').update({ status }).eq('id', id)
    setBusyId(null)
    router.refresh()
  }

  async function remove(id: string, name: string) {
    if (!confirm(`${name} ka appointment Recycle Bin mein bhejein?`)) return
    setBusyId(id)
    const supabase = createClient()
    await supabase
      .from('appointments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setBusyId(null)
    router.refresh()
  }

  async function addWalkIn(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('appointments').insert({ ...form, status: 'confirmed', source: 'walk-in' })
    setSaving(false)
    setOpen(false)
    setForm({ ...form, patient_name: '', phone: '', treatment_name: '', preferred_time: '' })
    router.refresh()
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white"
      >
        + Book Appointment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">Book Appointment</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40">
                ✕
              </button>
            </div>

            <form onSubmit={addWalkIn} className="mt-4 grid gap-3">
              <div>
                <label className="text-sm font-medium text-clinic-ink">Patient Name</label>
                <input
                  required
                  value={form.patient_name}
                  onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-clinic-ink">Phone</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-clinic-ink">Department</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, treatment_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Date</label>
                  <input
                    type="date"
                    value={form.preferred_date}
                    onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Time</label>
                  <input
                    type="time"
                    value={form.preferred_time}
                    onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Appointment'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3">
        {appointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/50">
            Is din koi appointment nahi hai.
          </div>
        ) : (
          appointments.map((a) => {
            const confirmLink = buildWhatsAppLink({
              phoneOverride: a.phone,
              customMessage: `Assalam o Alaikum ${a.patient_name}, aap ka appointment ${a.preferred_date ?? ''} ${a.preferred_time ?? ''} confirm ho gaya hai. Al Shifa Health Care, Numaish, Nizami Road, Karachi.`,
            })

            return (
              <div
                key={a.id}
                className="rounded-2xl border border-clinic-teal/10 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-clinic-ink">{a.patient_name}</p>
                    <p className="text-sm text-clinic-ink/60">{a.phone}</p>
                    <p className="mt-1 text-xs text-clinic-ink/50">
                      {a.preferred_date
                        ? new Date(a.preferred_date).toLocaleDateString('en-GB')
                        : 'No date'}
                      {a.preferred_time ? ` · ${a.preferred_time}` : ''}
                      {a.treatment_name ? ` · ${a.treatment_name}` : ''}
                      {a.department ? ` · ${a.department}` : ''}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      STATUS_STYLES[a.status] ?? 'bg-clinic-mint text-clinic-ink/50'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-clinic-teal/10 pt-3">
                  {a.status === 'pending' && (
                    <button
                      onClick={() => setStatus(a.id, 'confirmed')}
                      disabled={busyId === a.id}
                      className="rounded-full bg-clinic-teal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Confirm
                    </button>
                  )}
                  {a.status === 'confirmed' && (
                    <button
                      onClick={() => setStatus(a.id, 'completed')}
                      disabled={busyId === a.id}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Mark Completed
                    </button>
                  )}
                  <a
                    href={confirmLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`tel:${a.phone.replace(/[^0-9+]/g, '')}`}
                    className="rounded-full border border-clinic-teal px-3 py-1.5 text-xs font-semibold text-clinic-teal"
                  >
                    Call
                  </a>
                  {a.status !== 'cancelled' && (
                    <button
                      onClick={() => setStatus(a.id, 'cancelled')}
                      disabled={busyId === a.id}
                      className="rounded-full px-3 py-1.5 text-xs text-amber-700 hover:underline disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => remove(a.id, a.patient_name)}
                    disabled={busyId === a.id}
                    className="rounded-full px-3 py-1.5 text-xs text-red-600 hover:underline disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

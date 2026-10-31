'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addDays, fmtDate, todayKarachi } from '@/lib/karachi'

export interface PAppt {
  id: string
  preferred_date: string | null
  preferred_time: string | null
  treatment_name: string | null
  status: string | null
  notes: string | null
}

const STATUS: Record<string, { l: string; c: string }> = {
  pending: { l: 'Pending', c: 'bg-amber-50 text-amber-700' },
  confirmed: { l: 'Confirmed', c: 'bg-clinic-mint text-clinic-teal' },
  completed: { l: 'Aaye', c: 'bg-emerald-50 text-emerald-700' },
  cancelled: { l: 'Cancel', c: 'bg-red-50 text-red-700' },
}

export default function PatientAppointments({
  patient,
  appointments,
  treatments,
  canManage,
}: {
  patient: { id: string; full_name: string; phone: string; department: string }
  appointments: PAppt[]
  treatments: { id: string; name: string }[]
  canManage: boolean
}) {
  const router = useRouter()
  const today = todayKarachi()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(addDays(today, 1))
  const [time, setTime] = useState('')
  const [treatmentId, setTreatmentId] = useState('')
  const [what, setWhat] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const t = treatments.find((x) => x.id === treatmentId)
    const { error: err } = await createClient().from('appointments').insert({
      patient_name: patient.full_name,
      phone: patient.phone,
      department: patient.department === 'homeopathic' ? 'homeopathic' : 'dental',
      treatment_name: t?.name ?? (what.trim() || null),
      preferred_date: date,
      preferred_time: time || null,
      status: 'confirmed',
      source: 'clinic',
      patient_id: patient.id,
      treatment_id: t?.id ?? null,
      notes: notes.trim() || null,
    })
    setBusy(false)
    if (err) return setError('Save nahi hua: ' + err.message)
    setOpen(false)
    setWhat('')
    setNotes('')
    router.refresh()
  }

  async function setStatus(id: string, status: string) {
    const { error: err } = await createClient().from('appointments').update({ status }).eq('id', id)
    if (err) return setError(err.message)
    router.refresh()
  }

  const upcoming = appointments.filter((a) => (a.preferred_date ?? '') >= today && a.status !== 'cancelled' && a.status !== 'completed')
  const past = appointments.filter((a) => !upcoming.includes(a))
  const input = 'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  function Row({ a }: { a: PAppt }) {
    const st = STATUS[a.status ?? 'pending'] ?? STATUS.pending
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-clinic-ink">
            {fmtDate(a.preferred_date)} {a.preferred_time && <span className="text-clinic-ink/60">· {a.preferred_time}</span>}
          </p>
          <p className="text-xs text-clinic-ink/60">
            {a.treatment_name ?? 'Visit'}
            {a.notes ? ` · ${a.notes}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.c}`}>{st.l}</span>
          {canManage && (a.status === 'pending' || a.status === 'confirmed') && (
            <>
              <button onClick={() => setStatus(a.id, 'completed')} className="text-xs font-semibold text-emerald-700 hover:underline">
                Aa gaye
              </button>
              <button onClick={() => setStatus(a.id, 'cancelled')} className="text-xs text-red-600 hover:underline">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Appointments</h2>
        {canManage && !open && (
          <button onClick={() => setOpen(true)} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
            + Appointment do
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={add} className="mt-3 grid gap-3 rounded-2xl border border-clinic-teal/20 bg-white p-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-clinic-ink/70">Tareekh</label>
            <input type="date" required min={today} value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          </div>
          <div>
            <label className="text-xs font-medium text-clinic-ink/70">Waqt (optional)</label>
            <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="11:30 AM" className={input} />
          </div>
          {treatments.length > 0 ? (
            <div>
              <label className="text-xs font-medium text-clinic-ink/70">Kis treatment ke liye</label>
              <select value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)} className={input}>
                <option value="">— checkup / naya —</option>
                {treatments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {!treatmentId && (
            <div>
              <label className="text-xs font-medium text-clinic-ink/70">Kis liye (optional)</label>
              <input value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Checkup" className={input} />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-clinic-ink/70">Note (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={input} />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={busy} className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? 'Save...' : 'Save'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-clinic-ink/60">
              Wapas
            </button>
          </div>
        </form>
      )}
      {!open && error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
        {upcoming.length === 0 ? (
          <p className="px-4 py-5 text-center text-sm text-clinic-ink/50">Koi aane wali appointment nahi.</p>
        ) : (
          upcoming.map((a) => <Row key={a.id} a={a} />)
        )}
      </div>
      {past.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-clinic-teal">Purani appointments ({past.length})</summary>
          <div className="mt-2 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
            {past.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

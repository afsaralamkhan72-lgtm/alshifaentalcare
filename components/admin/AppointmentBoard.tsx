'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'
import { todayKarachi, fmtDate } from '@/lib/karachi'
import WhatsAppMenu from './WhatsAppMenu'
import { apptConfirmLink, apptReminderLink, apptRescheduleLink } from '@/lib/messages'

export interface Appointment {
  patient_id?: string | null
  id: string
  patient_name: string
  phone: string
  department: string | null
  treatment_name: string | null
  preferred_date: string | null
  preferred_time: string | null
  status: string
  created_at: string
  doctor?: string | null
  source?: string | null
}

const SLOTS = (() => {
  const out: string[] = []
  for (let h = 10; h <= 20; h++)
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) continue
      out.push(`${h > 12 ? h - 12 : h}:${m ? '30' : '00'} ${h >= 12 ? 'PM' : 'AM'}`)
    }
  return out
})()

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  arrived: 'bg-sky-50 text-sky-700',
  completed: 'bg-clinic-teal/10 text-clinic-teal',
  cancelled: 'bg-red-50 text-red-700',
}

export interface PatientPick {
  id: string
  full_name: string
  phone: string
  department: string
  mr_number?: string | null
}

export default function AppointmentBoard({
  appointments,
  showButton = true,
  listOnly = false,
  emptyText = 'Is din koi appointment nahi hai.',
  preset = null,
  buttonLabel = '+ Book Appointment',
}: {
  appointments: Appointment[]
  showButton?: boolean
  listOnly?: boolean
  emptyText?: string
  /** Patient ke page se: patient pehle se chuna hua */
  preset?: PatientPick | null
  buttonLabel?: string
}) {
  const router = useRouter()
  const [resId, setResId] = useState<string | null>(null)
  const [resDate, setResDate] = useState('')
  const [resTime, setResTime] = useState('')
  const [err, setErr] = useState('')

  async function reschedule(id: string) {
    if (!resDate) return setErr('Nayi tareekh chunein')
    setBusyId(id)
    setErr('')
    const { error } = await createClient().rpc('reschedule_appointment', { p_id: id, p_date: resDate, p_time: resTime || null })
    setBusyId(null)
    if (error) return setErr(friendlyError(error.message))
    setResId(null)
    router.refresh()
  }
  const [busyId, setBusyId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Patient list se chuna jata hai (naam / phone dobara likhna nahi parta, appointment patient se jur jati hai)
  const [picked, setPicked] = useState<PatientPick | null>(preset)
  const [manual, setManual] = useState(false)
  const [pq, setPq] = useState('')
  const [found, setFound] = useState<PatientPick[]>([])
  useEffect(() => {
    const t = pq.replace(/[,()%*"\\]/g, ' ').trim()
    if (t.length < 2) {
      setFound([])
      return
    }
    const h = setTimeout(async () => {
      const { data } = await createClient()
        .from('patients')
        .select('id, full_name, phone, department, mr_number')
        .is('deleted_at', null)
        .or(`full_name.ilike.%${t}%,phone.ilike.%${t}%,mr_number.ilike.%${t}%`)
        .limit(6)
      setFound((data ?? []) as PatientPick[])
    }, 250)
    return () => clearTimeout(h)
  }, [pq])

  const [form, setForm] = useState({
    patient_name: '',
    phone: '',
    department: 'dental',
    treatment_name: '',
    preferred_date: todayKarachi(),
    preferred_time: '',
  })
  const [nowHere, setNowHere] = useState(false)

  async function setStatus(id: string, status: string) {
    setBusyId(id)
    const supabase = createClient()
    const patch: Record<string, unknown> = { status }
    if (status === 'arrived') patch.arrived_at = new Date().toISOString()
    let { error } = await supabase.from('appointments').update(patch).eq('id', id)
    if (error && status === 'arrived') {
      setBusyId(null)
      return setErr('"Aa gaya" ke liye naya SQL (update) chalana zaroori hai. ' + friendlyError(error.message))
    }
    setBusyId(null)
    if (error) return setErr(friendlyError((error as { message: string }).message))
    router.refresh()
  }

  // Website se aayi booking ko patient file se jorna (phone ke zariye) ya naya patient banana
  async function linkPatient(id: string, create: boolean) {
    setBusyId(id)
    setErr('')
    const { data, error } = await createClient().rpc('link_appointment_patient', { p_appt: id, p_create: create })
    setBusyId(null)
    if (error) return setErr(friendlyError(error.message))
    if (!data && !create) return setErr('Is phone se koi patient nahi mila. "Naya patient banayein" dabayein.')
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
    if (!picked && !manual) {
      setSaving(false)
      return setErr('Pehle patient chunein (ya "list mein nahi" dabakar naya likhein).')
    }
    const who = picked ? { patient_name: picked.full_name, phone: picked.phone, department: picked.department === 'homeopathic' ? 'homeopathic' : 'dental', patient_id: picked.id } : {}
    const { error } = await supabase.from('appointments').insert({ ...form, ...who, preferred_time: form.preferred_time || null, status: nowHere && form.preferred_date === todayKarachi() ? 'arrived' : 'confirmed', ...(nowHere && form.preferred_date === todayKarachi() ? { arrived_at: new Date().toISOString() } : {}), source: 'walk-in' })
    setSaving(false)
    if (error) return setErr('Save nahi hua: ' + friendlyError(error.message))
    setOpen(false)
    setForm({ ...form, patient_name: '', phone: '', treatment_name: '', preferred_time: '' })
    if (!preset) setPicked(null)
    setPq('')
    setManual(false)
    setNowHere(false)
    router.refresh()
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <>
      {showButton && (
        <button onClick={() => setOpen(true)} className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white">
          {buttonLabel}
        </button>
      )}

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
              {picked ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-clinic-teal/20 bg-clinic-mint/50 px-3 py-2 text-sm">
                  <span>
                    <span className="font-semibold text-clinic-ink">{picked.full_name}</span>
                    <span className="ml-2 text-xs text-clinic-ink/60">{picked.phone}</span>
                  </span>
                  {!preset && (
                    <button type="button" onClick={() => setPicked(null)} className="text-xs font-semibold text-clinic-teal underline">
                      badlein
                    </button>
                  )}
                </div>
              ) : manual ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-clinic-ink">Patient ka naam</label>
                    <input required value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-clinic-ink">Phone</label>
                    <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-clinic-ink">Department</label>
                    <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputClass}>
                      <option value="dental">Dental</option>
                      <option value="homeopathic">Homeopathic</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => setManual(false)} className="justify-self-start text-xs font-semibold text-clinic-teal underline">
                    Patient list se chunein
                  </button>
                </>
              ) : (
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Patient (naam, phone ya MR number)</label>
                  <input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Kam az kam 2 harf likhein" className={inputClass} autoFocus />
                  {found.length > 0 && (
                    <div className="mt-1 divide-y divide-clinic-teal/10 rounded-xl border border-clinic-teal/15">
                      {found.map((f) => (
                        <button key={f.id} type="button" onClick={() => { setPicked(f); setPq('') }} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-clinic-mint">
                          <span className="font-medium text-clinic-ink">{f.full_name}</span>
                          <span className="text-xs text-clinic-ink/50">{f.mr_number} · {f.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => setManual(true)} className="mt-2 text-xs font-semibold text-clinic-teal underline">
                    Patient list mein nahi hai? Naya naam likhein
                  </button>
                </div>
              )}
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
                  <select value={form.preferred_time} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })} className={inputClass}>
                    <option value="">—</option>
                    {SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-clinic-ink">
                <input type="checkbox" checked={nowHere} onChange={(e) => setNowHere(e.target.checked)} />
                Patient abhi aa gaya hai (intezar mein likhein)
              </label>
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

      {!listOnly && err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      {(
      <div className={listOnly ? 'grid gap-3' : 'mt-6 grid gap-3'}>
        {appointments.length === 0 ? (
          emptyText ? (
            <div className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/50">
              {emptyText}
            </div>
          ) : null
        ) : (
          appointments.map((a) => {
            const waItems = [
              { label: 'Confirm ka message', href: apptConfirmLink(a) },
              { label: 'Yaad dehani (reminder)', href: apptReminderLink(a) },
              { label: 'Nayi tareekh ka message', href: apptRescheduleLink(a) },
            ]

            return (
              <div
                key={a.id}
                className="rounded-2xl border border-clinic-teal/10 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {a.patient_id ? (
                      <a href={`/admin/patients/${a.patient_id}`} className="font-medium text-clinic-ink hover:text-clinic-teal">
                        {a.patient_name} <span className="text-xs text-clinic-teal">· profile →</span>
                      </a>
                    ) : (
                      <a href={`/admin/search?q=${encodeURIComponent(a.phone)}`} className="font-medium text-clinic-ink hover:text-clinic-teal">
                        {a.patient_name} <span className="text-xs text-clinic-ink/40">· talash</span>
                      </a>
                    )}
                    <p className="text-sm text-clinic-ink/60">{a.phone}</p>
                    <p className="mt-1 text-sm text-clinic-ink/70">
                      <span className="font-semibold text-clinic-ink">{a.preferred_date ? fmtDate(a.preferred_date) : 'No date'}</span>
                      {a.preferred_time ? <span className="font-semibold text-clinic-teal"> · {a.preferred_time}</span> : ''}
                      {a.treatment_name ? ` · ${a.treatment_name}` : ''}
                      {a.doctor ? ` · ${a.doctor}` : ''}
                      {a.source === 'website' ? ' · website se' : ''}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      STATUS_STYLES[a.status] ?? 'bg-clinic-mint text-clinic-ink/50'
                    }`}
                  >
                    {a.status === 'arrived' ? 'intezar mein' : a.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-clinic-teal/10 pt-3">
                  {a.status === 'pending' && (
                    <button
                      onClick={async () => {
                        await setStatus(a.id, 'confirmed')
                        // Website ki booking: phone se patient mil jaye to khud jur jati hai (na mile to koi masla nahi)
                        if (!a.patient_id) await createClient().rpc('link_appointment_patient', { p_appt: a.id, p_create: false })
                        router.refresh()
                      }}
                      disabled={busyId === a.id}
                      className="rounded-full bg-clinic-teal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Confirm
                    </button>
                  )}
                  {a.status === 'confirmed' && (
                    <button
                      onClick={() => setStatus(a.id, 'arrived')}
                      disabled={busyId === a.id}
                      className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Aa gaya
                    </button>
                  )}
                  {!a.patient_id && (a.status === 'pending' || a.status === 'confirmed') && (
                    <>
                      <button onClick={() => linkPatient(a.id, false)} disabled={busyId === a.id} className="rounded-full border border-clinic-teal/40 px-3 py-1.5 text-xs font-semibold text-clinic-teal disabled:opacity-40">
                        Patient se jorein
                      </button>
                      <button onClick={() => linkPatient(a.id, true)} disabled={busyId === a.id} className="rounded-full border border-clinic-teal/40 px-3 py-1.5 text-xs font-semibold text-clinic-teal disabled:opacity-40">
                        Naya patient banayein
                      </button>
                    </>
                  )}
                  {(a.status === 'confirmed' || a.status === 'arrived') && (
                    <button
                      onClick={() => setStatus(a.id, 'completed')}
                      disabled={busyId === a.id}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Mark Completed
                    </button>
                  )}
                  <WhatsAppMenu items={waItems} />
                  {(a.status === 'pending' || a.status === 'confirmed') && (
                    <button
                      onClick={() => {
                        setResId(resId === a.id ? null : a.id)
                        setResDate(a.preferred_date ?? todayKarachi())
                        setResTime(a.preferred_time ?? '')
                        setErr('')
                      }}
                      className="rounded-full border border-clinic-teal/40 px-3 py-1.5 text-xs font-semibold text-clinic-teal"
                    >
                      Reschedule
                    </button>
                  )}
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
                {resId === a.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-clinic-mint/50 p-3">
                    <div>
                      <label className="text-xs text-clinic-ink/60">Nayi tareekh</label>
                      <input type="date" value={resDate} min={todayKarachi()} onChange={(e) => setResDate(e.target.value)} className="mt-1 block rounded-lg border border-clinic-teal/20 px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-clinic-ink/60">Waqt</label>
                      <select value={resTime} onChange={(e) => setResTime(e.target.value)} className="mt-1 block rounded-lg border border-clinic-teal/20 px-3 py-1.5 text-sm">
                        <option value="">—</option>
                        {SLOTS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button onClick={() => reschedule(a.id)} disabled={busyId === a.id} className="rounded-full bg-clinic-teal px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                      Save
                    </button>
                    <span className="text-xs text-clinic-ink/50">Purani tareekh history mein rahegi</span>
                    {err && <p className="w-full text-xs text-red-600">{err}</p>}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      )}
    </>
  )
}

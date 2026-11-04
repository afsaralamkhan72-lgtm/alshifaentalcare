'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPosition } from '@/lib/geo'

interface St {
  linked: boolean
  tracked?: boolean
  check_in?: string | null
  check_out?: string | null
  shift?: string
  open_day?: boolean
  require_location?: boolean
}
interface Res { ok: boolean; code?: string; message: string }

/**
 * Admin / reception ki apni hazri ("Meri Hazri"). Sirf tab dikhta hai jab login kisi staff
 * record se juda ho aur us ki hazri lagti ho. Waqt database ka Karachi waqt hai.
 */
export default function MyAttendance() {
  const [st, setSt] = useState<St | null>(null)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Res | null>(null)
  const [reason, setReason] = useState('')
  const [why, setWhy] = useState('')
  const [askKind, setAskKind] = useState<'in' | 'out' | null>(null)

  async function load() {
    const { data, error } = await createClient().rpc('my_attendance_state')
    if (!error) setSt(data as St)
  }
  useEffect(() => {
    load()
  }, [])

  if (!st || !st.linked || !st.tracked) return null
  const checkedIn = !!st.check_in
  const checkedOut = !!st.check_out
  const action: 'in' | 'out' = checkedIn ? 'out' : 'in'

  async function press() {
    setBusy(true)
    setRes(null)
    let pos: { lat: number; lng: number } | null = null
    if (st?.require_location) pos = await getPosition()
    const { data, error } = await createClient().rpc('my_attendance_clock', {
      p_action: action,
      p_lat: pos?.lat ?? null,
      p_lng: pos?.lng ?? null,
      p_reason: reason || null,
    })
    setBusy(false)
    if (error) return setRes({ ok: false, message: 'Hazri nahi lag saki. Dobara koshish karein.' })
    const r = data as Res
    setRes(r)
    if (r.ok) load()
    else if (r.code === 'NOLOC' || r.code === 'FAR') setAskKind(action)
  }

  async function request() {
    if (!askKind) return
    setBusy(true)
    const { data, error } = await createClient().rpc('my_attendance_request', { p_kind: askKind, p_reason: why })
    setBusy(false)
    if (error) return setRes({ ok: false, message: 'Darkhwast nahi ja saki.' })
    const r = data as Res
    setRes(r)
    if (r.ok) {
      setAskKind(null)
      setWhy('')
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-clinic-teal/15 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-clinic-amber">Meri hazri</p>
          <p className="text-sm text-clinic-ink/70">
            Shift {st.shift} · Aaya: <b>{st.check_in ?? '—'}</b> · Gaya: <b>{st.check_out ?? '—'}</b>
          </p>
        </div>
        {!checkedOut && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!checkedIn && <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Late ho to wajah" className="w-44 rounded-lg border border-clinic-teal/25 px-2 py-1.5 text-sm" />}
            <button type="button" disabled={busy} onClick={press} className={`rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 ${checkedIn ? 'bg-clinic-ink' : 'bg-emerald-600'}`}>
              {busy ? 'Thori der...' : checkedIn ? 'Chhutti' : 'Hazri lagayen'}
            </button>
          </div>
        )}
      </div>
      {res && <p className={`mt-2 rounded-lg p-2 text-sm ${res.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-700'}`}>{res.message}</p>}
      {askKind && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={200} placeholder="Doctor sahab ko wajah likhein" className="min-w-0 flex-1 rounded-lg border border-sky-300 px-2 py-1.5" />
          <button type="button" disabled={busy || why.trim().length < 3} onClick={request} className="rounded-full bg-sky-700 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
            Darkhwast bhejein
          </button>
        </div>
      )}
    </div>
  )
}

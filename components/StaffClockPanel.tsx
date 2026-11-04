'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getPosition } from '@/lib/geo'
import { staffClock, staffClockRequest, type ClockResult } from '@/app/staff/[token]/actions'

export interface ClockState {
  tracked: boolean
  check_in: string | null
  check_out: string | null
  shift: string
  open_day: boolean
  require_location: boolean
}

/**
 * Staff ke phone par bada "Hazri lagayen" / "Chhutti" button.
 * Jawab database ke Karachi waqt se aata hai (phone ki ghari ka koi asar nahi).
 */
export default function StaffClockPanel({ token, state }: { token: string; state: ClockState }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [res, setRes] = useState<ClockResult | null>(null)
  const [reason, setReason] = useState('')
  const [askReason, setAskReason] = useState(false)
  const [ask, setAsk] = useState<'in' | 'out'>('in')
  const [why, setWhy] = useState('')
  const [busyMsg, setBusyMsg] = useState('')

  const checkedIn = !!state.check_in
  const checkedOut = !!state.check_out
  const action: 'in' | 'out' = checkedIn ? 'out' : 'in'

  function press() {
    setRes(null)
    setAskReason(false)
    start(async () => {
      let pos: { lat: number; lng: number } | null = null
      if (state.require_location) {
        setBusyMsg('Location dekh raha hun...')
        pos = await getPosition()
        setBusyMsg('')
      }
      const r = await staffClock(token, action, pos?.lat ?? null, pos?.lng ?? null, reason)
      setRes(r)
      if (r.ok) router.refresh()
      else if (r.code === 'NOLOC' || r.code === 'FAR') {
        setAsk(action)
        setAskReason(true)
      }
    })
  }

  function sendRequest() {
    start(async () => {
      const r = await staffClockRequest(token, ask, why, null, null)
      setRes(r)
      if (r.ok) {
        setAskReason(false)
        setWhy('')
        router.refresh()
      }
    })
  }

  if (!state.tracked) return null

  return (
    <div className="mt-5 rounded-2xl border border-clinic-teal/15 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-clinic-amber">Meri hazri</p>
      <p className="mt-1 text-sm text-clinic-ink/70">
        Aaj {state.open_day ? '' : '(clinic band / chhutti ka din) '}shift: {state.shift}
      </p>
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        <span>Aaya: <b>{state.check_in ?? '—'}</b></span>
        <span>Gaya: <b>{state.check_out ?? '—'}</b></span>
      </div>

      {!checkedOut && (
        <>
          {!checkedIn && (
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Late hon to wajah (marzi se)" maxLength={200} className="mt-3 w-full rounded-lg border border-clinic-teal/25 px-3 py-2 text-sm" />
          )}
          <button
            type="button"
            disabled={pending}
            onClick={press}
            className={`mt-3 w-full rounded-full px-5 py-4 text-base font-semibold text-white disabled:opacity-50 ${checkedIn ? 'bg-clinic-ink' : 'bg-emerald-600'}`}
          >
            {pending ? busyMsg || 'Thori der...' : checkedIn ? 'Chhutti (ja raha hun)' : 'Hazri lagayen'}
          </button>
        </>
      )}
      {checkedOut && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Aaj ki hazri aur chhutti dono lag chuki hain. Shukriya.</p>}

      {res && (
        <p className={`mt-3 rounded-xl p-3 text-sm ${res.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-700'}`}>{res.message}</p>
      )}

      {askReason && (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm">
          <p className="font-semibold text-sky-900">Doctor sahab ko darkhwast bhejein</p>
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Wajah likhein (jaise GPS kaam nahi kar raha)" maxLength={200} className="mt-2 w-full rounded-lg border border-sky-300 px-3 py-2" />
          <button type="button" disabled={pending || why.trim().length < 3} onClick={sendRequest} className="mt-2 rounded-full bg-sky-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
            {ask === 'in' ? 'Aane ki' : 'Jaane ki'} darkhwast bhejein (abhi ka waqt likha jayega)
          </button>
        </div>
      )}
    </div>
  )
}

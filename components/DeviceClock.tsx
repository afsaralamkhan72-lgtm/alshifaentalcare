'use client'

import { useState, useTransition } from 'react'
import { getPosition } from '@/lib/geo'
import { deviceClock, deviceRequest, type DeviceResult } from '@/app/hazri/actions'

export default function DeviceClock({
  deviceKey,
  staff,
  requireLocation,
}: {
  deviceKey: string
  staff: { id: string; full_name: string }[]
  requireLocation: boolean
}) {
  const [who, setWho] = useState('')
  const [pin, setPin] = useState('')
  const [reason, setReason] = useState('')
  const [res, setRes] = useState<DeviceResult | null>(null)
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState('')
  const [reqKind, setReqKind] = useState<'in' | 'out' | null>(null)
  const [why, setWhy] = useState('')

  function reset() {
    setPin('')
    setReason('')
    setWho('')
    setWhy('')
    setReqKind(null)
  }

  function press(action: 'in' | 'out') {
    setRes(null)
    start(async () => {
      let pos: { lat: number; lng: number } | null = null
      if (requireLocation) {
        setBusy('Location dekh raha hun...')
        pos = await getPosition()
        setBusy('')
      }
      const r = await deviceClock(deviceKey, who, pin, action, pos?.lat ?? null, pos?.lng ?? null, reason)
      setRes(r)
      if (r.ok) setTimeout(reset, 8000)
      else if (r.code === 'NOLOC' || r.code === 'FAR') setReqKind(action)
    })
  }

  function sendRequest() {
    if (!reqKind) return
    start(async () => {
      const r = await deviceRequest(deviceKey, who, pin, reqKind, why)
      setRes(r)
      if (r.ok) setTimeout(reset, 6000)
    })
  }

  return (
    <div className="rounded-2xl bg-white p-5">
      <h1 className="font-display text-xl font-semibold text-clinic-ink">Hazri lagayen</h1>
      <label className="mt-4 block text-sm font-medium text-clinic-ink">Apna naam
        <select value={who} onChange={(e) => { setWho(e.target.value); setRes(null) }} className="mt-1 w-full rounded-lg border border-clinic-teal/30 px-3 py-3 text-base">
          <option value="">— naam chunein —</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
      </label>
      <label className="mt-3 block text-sm font-medium text-clinic-ink">Apna 6 number ka PIN
        <input inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="mt-1 w-full rounded-lg border border-clinic-teal/30 px-3 py-3 text-center text-2xl tracking-[0.5em]" />
      </label>
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Late hon to wajah (marzi se)" className="mt-3 w-full rounded-lg border border-clinic-teal/25 px-3 py-2 text-sm" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" disabled={pending || !who || pin.length !== 6} onClick={() => press('in')} className="rounded-full bg-emerald-600 px-4 py-4 text-base font-semibold text-white disabled:opacity-40">
          {pending ? busy || '...' : 'Aaya'}
        </button>
        <button type="button" disabled={pending || !who || pin.length !== 6} onClick={() => press('out')} className="rounded-full bg-clinic-ink px-4 py-4 text-base font-semibold text-white disabled:opacity-40">
          Chhutti
        </button>
      </div>
      {res && <p className={`mt-4 rounded-xl p-3 text-sm ${res.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-700'}`}>{res.message}</p>}
      {reqKind && !res?.ok && (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm">
          <p className="font-semibold text-sky-900">Doctor sahab ko darkhwast bhejein</p>
          <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={200} placeholder="Wajah likhein" className="mt-2 w-full rounded-lg border border-sky-300 px-3 py-2" />
          <button type="button" disabled={pending || why.trim().length < 3} onClick={sendRequest} className="mt-2 rounded-full bg-sky-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
            Darkhwast bhejein (abhi ka waqt likha jayega)
          </button>
        </div>
      )}
    </div>
  )
}

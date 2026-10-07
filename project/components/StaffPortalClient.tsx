'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { staffLogin, staffLogout, staffAcknowledge } from '@/app/staff/[token]/actions'

export function PinForm({ token }: { token: string }) {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    start(async () => {
      const r = await staffLogin(token, pin)
      if (r.ok) router.refresh()
      else setErr(r.message)
    })
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-clinic-teal/10 bg-white p-5">
      <label className="text-sm font-medium text-clinic-ink">Apna 6 number ka PIN likhein</label>
      <input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        className="mt-2 w-full rounded-lg border border-clinic-teal/30 px-3 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-clinic-teal"
      />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <button
        disabled={pending || pin.length !== 6}
        className="mt-4 w-full rounded-full bg-clinic-teal px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'Check ho raha hai...' : 'Dekhein'}
      </button>
    </form>
  )
}

export function AckButton({ token, entryId }: { token: string; entryId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await staffAcknowledge(token, entryId)
          router.refresh()
        })
      }
      className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
    >
      {pending ? '...' : 'Mujhe mil gaye'}
    </button>
  )
}

export function LogoutButton({ token }: { token: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await staffLogout(token)
          router.refresh()
        })
      }
      className="text-xs text-clinic-ink/50 underline"
    >
      Band karein
    </button>
  )
}

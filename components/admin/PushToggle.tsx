'use client'

import { useEffect, useState } from 'react'

function b64(s: string) {
  const p = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export default function PushToggle() {
  const [state, setState] = useState<'checking' | 'unsupported' | 'off' | 'on' | 'denied'>('checking')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setState('unsupported')
      if (Notification.permission === 'denied') return setState('denied')
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const sub = await reg.pushManager.getSubscription()
        setState(sub ? 'on' : 'off')
      } catch {
        setState('unsupported')
      }
    })()
  }, [])

  async function turnOn() {
    setBusy(true)
    setMsg('')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState('denied'); return }
      const r = await fetch('/api/push/key')
      if (!r.ok) throw new Error('Pehle SQL chalayein ya dobara login karein')
      const { key } = (await r.json()) as { key: string }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) })
      const j = sub.toJSON()
      const s = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }) })
      if (!s.ok) throw new Error('Mehfooz nahi hua')
      setState('on')
      setMsg('Chalu ho gaya. Ab payment milte hi is phone par khabar aayegi.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Nahi ho saka')
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint, off: true }) })
        await sub.unsubscribe()
      }
      setState('off')
      setMsg('Band kar diya.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-clinic-ink">Phone par &quot;paisa mila&quot; ki khabar</h2>
      <p className="mt-1 text-sm text-clinic-ink/60">Jab bhi clinic mein koi payment darj ho, is phone/computer par notification aayegi. Har device par alag se chalu karna hota hai.</p>
      {state === 'unsupported' && <p className="mt-3 text-sm text-amber-700">Ye browser notification support nahi karta. iPhone par pehle Safari mein website kholein, Share → &quot;Add to Home Screen&quot; karein, phir wahan se app kholein. Android par Chrome istemal karein.</p>}
      {state === 'denied' && <p className="mt-3 text-sm text-red-700">Notification ki ijazat band hai. Browser/phone ki settings mein is website ke liye Notifications &quot;Allow&quot; karein.</p>}
      {state === 'off' && <button disabled={busy} onClick={turnOn} className="mt-3 rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">Is device par chalu karein</button>}
      {state === 'on' && (
        <div className="mt-3 flex items-center gap-3">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">Chalu hai</span>
          <button disabled={busy} onClick={turnOff} className="text-sm text-red-600 underline">band karein</button>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-clinic-ink/70">{msg}</p>}
    </section>
  )
}

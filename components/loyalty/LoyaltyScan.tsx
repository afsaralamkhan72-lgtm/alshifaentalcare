'use client'
import { useEffect, useState } from 'react'

type Out = {
  status: string
  name?: string
  card?: { stamps: number; total: number; cycle_size: number | null; stamped_today: boolean; next_title: string | null; remaining: number | null; ready: number }
  links?: { google: string | null; facebook: string | null; instagram: string | null; tiktok: string | null }
}

const SOCIAL: { k: 'google' | 'facebook' | 'instagram' | 'tiktok'; label: string }[] = [
  { k: 'google', label: 'Google par review dein' },
  { k: 'facebook', label: 'Facebook follow karein' },
  { k: 'instagram', label: 'Instagram follow karein' },
  { k: 'tiktok', label: 'TikTok follow karein' },
]

export default function LoyaltyScan() {
  const [out, setOut] = useState<Out | null>(null)
  const [busy, setBusy] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')

  async function send(body: object) {
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/loyalty/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setOut((await r.json()) as Out)
    } catch { setErr('Internet check karein aur dobara koshish karein.') }
    setBusy(false)
  }
  useEffect(() => { void send({}) }, [])

  const s = out?.status
  const form = !out || s === 'need_info' || s === 'mismatch' || s === 'ambiguous' || s === 'limited'

  return (
    <div className="mt-4">
      {busy && !out && <p className="text-sm text-clinic-ink/60">Ek lamha…</p>}
      {err && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      {s === 'inactive' && <p className="rounded-lg bg-clinic-ink/5 p-4 text-sm">Loyalty card abhi shuru nahi hua. Reception se poochein.</p>}

      {form && out && (
        <form onSubmit={(e) => { e.preventDefault(); void send({ name, phone }) }} className="space-y-3">
          <p className="text-sm text-clinic-ink/70">Stamp ke liye apna naam aur phone number likhein (jo clinic mein darj hai).</p>
          {s === 'mismatch' && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Naam aur number match nahi hue. Dobara likhein ya reception se poochein.</p>}
          {s === 'ambiguous' && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Is number par kai record hain. Poora naam likhein ya reception se poochein.</p>}
          {s === 'limited' && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Bohat zyada koshishein. Thori dair baad dobara karein.</p>}
          <input aria-label="Naam" className="w-full rounded-xl border border-clinic-ink/20 px-3 py-3" placeholder="Aap ka naam" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} />
          <input aria-label="Phone" inputMode="tel" className="w-full rounded-xl border border-clinic-ink/20 px-3 py-3" placeholder="Phone (03xx xxxxxxx)" value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={30} />
          <button disabled={busy} className="w-full rounded-xl bg-clinic-teal px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Ek lamha…' : 'Stamp lagayein'}</button>
        </form>
      )}

      {s === 'signup' && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Shukriya {out?.name}!</p>
          <p className="mt-1">Aap ka number hamare record mein nahi mila. Hum ne aap ki details reception ko bhej di hain. Pehli visit par aap ka card shuru ho jaye ga.</p>
        </div>
      )}

      {(s === 'awarded' || s === 'already' || s === 'no_visit') && out?.card && (
        <div>
          <p className="text-lg font-semibold text-clinic-ink">Assalam o Alaikum, {out.name}</p>
          {s === 'awarded' && <p className="mt-1 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Mubarak! Aaj ka stamp lag gaya ✓</p>}
          {s === 'already' && <p className="mt-1 rounded-lg bg-clinic-ink/5 p-3 text-sm">Aaj ka stamp pehle hi lag chuka hai.</p>}
          {s === 'no_visit' && <p className="mt-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Stamp sirf clinic ki visit wale din lagta hai. Aaj ki visit abhi darj nahi hui — reception se bata dein.</p>}
          <Card c={out.card} />
          {out.card.ready > 0 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">🎁 Aap ke {out.card.ready} inaam tayyar hain. Reception ko dikhayein.</p>}
        </div>
      )}

      {out?.links && ['awarded', 'already', 'signup'].includes(s ?? '') && SOCIAL.some((x) => out.links?.[x.k]) && (
        <div className="mt-5 space-y-2">
          <p className="text-sm font-medium text-clinic-ink">Hum se jude rahein</p>
          {SOCIAL.filter((x) => out.links?.[x.k]).map((x) => (
            <a key={x.k} href={out.links![x.k]!} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-clinic-ink/15 px-4 py-3 text-center text-sm font-medium text-clinic-ink">{x.label}</a>
          ))}
        </div>
      )}
    </div>
  )
}

function Card({ c }: { c: NonNullable<Out['card']> }) {
  const size = c.cycle_size ?? Math.max(c.stamps, 6)
  const cells = Array.from({ length: Math.max(size, 1) }, (_, i) => i < c.stamps)
  return (
    <div className="mt-4">
      <div className="grid grid-cols-5 gap-2" aria-label={`${c.stamps} stamp`}>
        {cells.map((on, i) => (
          <div key={i} className={`flex aspect-square items-center justify-center rounded-full border-2 text-lg ${on ? 'border-clinic-teal bg-clinic-teal text-white' : 'border-clinic-ink/20 text-clinic-ink/20'}`}>{on ? '✓' : i + 1}</div>
        ))}
      </div>
      <p className="mt-3 text-sm">Aap ke stamps: <strong>{c.stamps}</strong>{c.cycle_size ? ` / ${c.cycle_size}` : ''}</p>
      {c.next_title && c.remaining != null && c.remaining > 0 && <p className="text-sm text-clinic-ink/70">{c.remaining} stamp aur — <strong>{c.next_title}</strong></p>}
    </div>
  )
}

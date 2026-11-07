'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'

export type VisitShow = { medical?: boolean; dental?: boolean; exam?: boolean; xray?: boolean }

const ITEMS: { k: keyof VisitShow; l: string; d: string }[] = [
  { k: 'medical', l: 'Sehat ki poori history', d: 'Bimariyan, dawaiyan, hamal wagera ke tamam sawal (pehli visit par chhoti line pehle se aati hai).' },
  { k: 'dental', l: 'Daanton ki pichli history', d: 'Pehle ka dental ilaaj, brushing, aadatein wagera.' },
  { k: 'exam', l: 'Muaina (3 dabbe)', d: 'Extraoral, intraoral aur periodontal muaina ke alag likhne ke dabbe.' },
  { k: 'xray', l: 'X-ray / upload', d: 'X-ray mein kya nazar aaya, aur tasveer/report upload karna.' },
]

/**
 * Visit page par kaun si cheezein seedha dikhni hain. Jo OFF hon woh visit ke "Zaroorat par" mein khulti hain.
 * (site_settings, key: visit_show; sirf owner badal sakta hai)
 */
export default function VisitShowSettings({ initial }: { initial: VisitShow }) {
  const [v, setV] = useState<VisitShow>(initial)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function toggle(k: keyof VisitShow) {
    const next = { ...v, [k]: !v[k] }
    setV(next)
    setBusy(true)
    setMsg(null)
    const { error } = await createClient().from('site_settings').upsert({ key: 'visit_show', value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setBusy(false)
    if (error) {
      setV(v)
      return setMsg({ ok: false, t: friendlyError(error.message) })
    }
    setMsg({ ok: true, t: 'Save ho gaya' })
  }

  return (
    <div className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-clinic-ink">Visit page par kya dikhana hai</h2>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Jo switch band hai woh cheez visit mein &quot;Zaroorat par ▾&quot; ke andar chhupi rehti hai (zaroorat ho to wahan se khol sakte hain). ON karne par woh seedha nazar aayegi. Purani visits ka data kahin nahi jata.
      </p>
      <ul className="mt-4 divide-y divide-clinic-teal/10">
        {ITEMS.map((it) => (
          <li key={it.k} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-clinic-ink">{it.l}</p>
              <p className="text-xs text-clinic-ink/55">{it.d}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(v[it.k])}
              aria-label={it.l}
              disabled={busy}
              onClick={() => toggle(it.k)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${v[it.k] ? 'bg-clinic-teal' : 'bg-clinic-ink/25'}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${v[it.k] ? 'left-[1.4rem]' : 'left-0.5'}`} />
              <span className="sr-only">{v[it.k] ? 'ON' : 'OFF'}</span>
            </button>
          </li>
        ))}
      </ul>
      {msg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.t}</p>}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'

export interface OptRow {
  id: string
  kind: string
  label: string
}
interface Kind {
  kind: string
  label: string
  defaults: readonly string[]
}

/** Visit form ki chips (takleef / diagnosis) ki list: yahan se badlein, visit mein foran nazar aati hain */
export default function ClinicOptionsManager({ kinds, rows, missing }: { kinds: readonly Kind[]; rows: OptRow[]; missing: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [txt, setTxt] = useState<Record<string, string>>({})

  if (missing)
    return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Ye list chalane ke liye naya SQL (MIGRATION) chalana zaroori hai.</p>

  async function add(kind: string, labels: string[]) {
    const clean = labels.map((l) => l.trim()).filter(Boolean)
    if (clean.length === 0) return
    setBusy(true)
    setErr('')
    const base = rows.filter((r) => r.kind === kind).length
    const { error } = await createClient()
      .from('clinic_options')
      .insert(clean.map((label, i) => ({ kind, label, sort_order: (base + i + 1) * 10 })))
    setBusy(false)
    if (error) return setErr(friendlyError(error.message))
    setTxt((t) => ({ ...t, [kind]: '' }))
    router.refresh()
  }
  async function remove(id: string) {
    setBusy(true)
    const { error } = await createClient().from('clinic_options').delete().eq('id', id)
    setBusy(false)
    if (error) return setErr(friendlyError(error.message))
    router.refresh()
  }

  return (
    <div className="grid gap-4">
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      {kinds.map((k) => {
        const mine = rows.filter((r) => r.kind === k.kind)
        return (
          <section key={k.kind} className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
            <p className="font-display font-semibold text-clinic-ink">{k.label}</p>
            {mine.length === 0 ? (
              <>
                <p className="mt-1 text-xs text-clinic-ink/60">Abhi default list chal rahi hai ({k.defaults.length} cheezein). Badalne ke liye apni list shuru karein.</p>
                <button disabled={busy} onClick={() => add(k.kind, [...k.defaults])} className="mt-2 rounded-full bg-clinic-teal px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                  Default list se shuru karein
                </button>
              </>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {mine.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-clinic-mint px-3 py-1 text-sm text-clinic-ink">
                    {r.label}
                    <button disabled={busy} onClick={() => remove(r.id)} aria-label={`${r.label} hatayein`} className="text-red-600">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <input value={txt[k.kind] ?? ''} onChange={(e) => setTxt({ ...txt, [k.kind]: e.target.value })} placeholder="Nayi cheez likhein" className="w-full max-w-xs rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
              <button disabled={busy || !(txt[k.kind] ?? '').trim()} onClick={() => add(k.kind, [txt[k.kind] ?? ''])} className="rounded-full border border-clinic-teal px-4 py-1.5 text-sm font-semibold text-clinic-teal disabled:opacity-50">
                Jorein
              </button>
            </div>
            {mine.length === 0 && (txt[k.kind] ?? '').trim() && <p className="mt-1 text-xs text-amber-700">Pehle &quot;Default list se shuru karein&quot; dabayein, warna sirf ye nayi cheez list ban jayegi.</p>}
          </section>
        )
      })}
    </div>
  )
}

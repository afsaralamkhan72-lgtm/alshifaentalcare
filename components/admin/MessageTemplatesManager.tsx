'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { TEMPLATE_DEFAULTS, PLACEHOLDERS } from '@/lib/messageTemplates'

/** Har message ka apna alag text. Badal kar Save; "Pehle jaisa" se default wapas. */
export default function MessageTemplatesManager({ rows, missing }: { rows: { key: string; body: string }[]; missing: boolean }) {
  const router = useRouter()
  const saved = new Map(rows.map((r) => [r.key, r.body]))
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(TEMPLATE_DEFAULTS.map((d) => [d.key, saved.get(d.key) ?? d.body])))
  const [msg, setMsg] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')

  async function save(key: string, label: string, body: string) {
    setBusy(key)
    const { error } = await createClient().from('message_templates').upsert({ key, label, body, updated_at: new Date().toISOString() })
    setBusy('')
    setMsg((m) => ({ ...m, [key]: error ? friendlyError(error.message) : 'Save ho gaya' }))
    if (!error) router.refresh()
  }

  if (missing) return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Messages ki list abhi nahi khuli. Update 7 ka SQL chalayein.</p>
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-clinic-teal/10 bg-white p-5 text-sm text-clinic-ink/70">
        Har message ka text yahan se badlein. In nishaniyon ki jagah khud sahi cheez aa jati hai:{' '}
        <span className="font-mono text-xs">{PLACEHOLDERS.join('  ')}</span>
        <p className="mt-2 text-xs">{'{salaam}'} mard/aurat ke hisaab se &quot;محترم … صاحب / محترمہ … صاحبہ&quot; likhta hai (jins na ho to sirf naam).</p>
      </div>
      {TEMPLATE_DEFAULTS.map((d) => (
        <div key={d.key} className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
          <p className="font-display font-semibold text-clinic-ink">{d.label}</p>
          <textarea
            dir="auto"
            rows={d.key === 'statement' ? 12 : 5}
            value={vals[d.key]}
            onChange={(e) => setVals((v) => ({ ...v, [d.key]: e.target.value }))}
            className="mt-2 w-full rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button disabled={busy === d.key} onClick={() => save(d.key, d.label, vals[d.key])} className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy === d.key ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setVals((v) => ({ ...v, [d.key]: d.body }))} className="text-sm text-clinic-ink/60 underline">
              Pehle jaisa
            </button>
            {msg[d.key] && <span className="text-sm text-clinic-ink/70">{msg[d.key]}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

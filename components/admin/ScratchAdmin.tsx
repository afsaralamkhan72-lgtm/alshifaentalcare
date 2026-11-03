'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'

type Prize = { id: string; title: string; kind: 'percent' | 'amount' | 'free' | 'none'; value: number | null; treatment_names: string[]; weight: number; is_active: boolean }
type Card = { id: string; title: string; kind: string; value: number | null; treatment_names: string[]; card_date: string; expires_at: string | null; patient: { id: string; full_name: string } | null }

const kt = (k: string, v: number | null) => (k === 'percent' ? `${v}% chhoot` : k === 'amount' ? `Rs.${v} chhoot` : k === 'free' ? 'Muft' : 'Koi inaam nahi')

export default function ScratchAdmin({ owner, enabled, days, prizes, cards }: { owner: boolean; enabled: boolean; days: number; prizes: Prize[]; cards: Card[] }) {
  const router = useRouter()
  const sb = createClient()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [d, setD] = useState(String(days))
  const [f, setF] = useState({ title: '', kind: 'percent' as Prize['kind'], value: '', treatments: '', weight: '1' })
  const total = prizes.filter((p) => p.is_active).reduce((s, p) => s + p.weight, 0)

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    if (busy) return
    setBusy(true); setMsg('')
    const { error } = await fn()
    setBusy(false)
    if (error) setMsg('❌ ' + friendlyError(error.message))
    else { setMsg('✓ ' + ok); router.refresh() }
  }
  const saveCfg = (en: boolean) => run(() => sb.from('site_settings').upsert({ key: 'scratch_cfg', value: { enabled: en, valid_days: Math.max(1, Math.min(365, Number(d) || 30)) } }), en ? 'Scratch card chalu' : 'Scratch card band')
  const input = 'rounded-lg border border-clinic-ink/20 px-3 py-2 text-sm'

  return (
    <section className="mt-8 rounded-2xl border border-clinic-teal/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-clinic-ink">Scratch Card</h2>
      <p className="mt-1 text-sm text-clinic-ink/60">Jis din marez ka stamp lagta hai (QR scan), wo ek card khurch kar inaam jeet sakta hai. Inaam kaun sa niklega, ye in ke &quot;wazan&quot; se tay hota hai.</p>
      {msg && <p className="mt-2 text-sm">{msg}</p>}

      {cards.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-clinic-ink">Jeete hue inaam (abhi diye nahi)</h3>
          <ul className="divide-y divide-clinic-ink/10">
            {cards.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span><Link className="font-medium underline" href={`/admin/patients/${c.patient?.id}`}>{c.patient?.full_name}</Link> — <strong>{c.title}</strong> ({kt(c.kind, c.value)}{c.treatment_names.length ? `, ${c.treatment_names.join('/')}` : ''}) · {c.expires_at ? `${c.expires_at.slice(0, 10)} tak` : ''}</span>
                <button disabled={busy} onClick={() => run(() => sb.rpc('scratch_redeem', { p_card: c.id, p_note: null }), 'Inaam de diya gaya darj ho gaya')} className="rounded-lg bg-clinic-teal px-3 py-1.5 text-white disabled:opacity-60">Inaam diya</button>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-clinic-ink/50">Chhoot bill mein khud nahi lagti: bill banate waqt haath se kam karein, phir &quot;Inaam diya&quot; dabayein.</p>
        </div>
      )}

      {owner && (
        <div className="mt-5 grid gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`rounded-full px-3 py-1 ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-clinic-ink/5 text-clinic-ink/60'}`}>{enabled ? 'Chalu hai' : 'Band hai'}</span>
            <label className="flex items-center gap-2">Inaam kitne din chale <input type="number" min={1} max={365} value={d} onChange={(e) => setD(e.target.value)} className={`${input} w-20`} /></label>
            <button disabled={busy} onClick={() => saveCfg(!enabled)} className="rounded-full bg-clinic-teal px-4 py-1.5 font-semibold text-white disabled:opacity-60">{enabled ? 'Band karein' : 'Chalu karein'}</button>
            {enabled && <button disabled={busy} onClick={() => saveCfg(true)} className="text-clinic-teal underline">din mehfooz</button>}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-clinic-ink">Inaam ki list</h3>
            {prizes.length === 0 && <p className="text-sm text-clinic-ink/60">Abhi koi inaam nahi. Neeche se add karein (kam az kam ek active chahiye).</p>}
            <ul className="divide-y divide-clinic-ink/10">
              {prizes.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className={p.is_active ? '' : 'opacity-50'}><strong>{p.title}</strong> · {kt(p.kind, p.value)}{p.treatment_names.length ? ` (${p.treatment_names.join('/')})` : ''} · wazan {p.weight}{p.is_active && total > 0 ? ` (taqreeban ${Math.round((p.weight / total) * 100)}%)` : ''}</span>
                  <button disabled={busy} onClick={() => run(() => sb.from('scratch_prizes').update({ is_active: !p.is_active }).eq('id', p.id), p.is_active ? 'Band kiya' : 'Chalu kiya')} className="text-xs text-clinic-teal underline">{p.is_active ? 'band' : 'chalu'}</button>
                </li>
              ))}
            </ul>
          </div>

          <form className="grid gap-2 rounded-xl bg-clinic-mint/40 p-3 sm:grid-cols-6" onSubmit={(e) => {
            e.preventDefault()
            run(() => sb.from('scratch_prizes').insert({ title: f.title.trim(), kind: f.kind, value: f.kind === 'free' || f.kind === 'none' ? null : Number(f.value), treatment_names: f.treatments.split(',').map((x) => x.trim()).filter(Boolean), weight: Math.max(1, Math.min(10000, Number(f.weight) || 1)) }), 'Inaam add ho gaya')
            setF({ title: '', kind: 'percent', value: '', treatments: '', weight: '1' })
          }}>
            <input required minLength={2} placeholder="Naam (jaise 10% chhoot)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={`${input} sm:col-span-2`} />
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Prize['kind'] })} className={input}>
              <option value="percent">% chhoot</option><option value="amount">Rs. chhoot</option><option value="free">Muft</option><option value="none">Koi inaam nahi</option>
            </select>
            <input type="number" min={0} placeholder="Miqdar" disabled={f.kind === 'free' || f.kind === 'none'} required={f.kind === 'percent' || f.kind === 'amount'} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className={input} />
            <input placeholder="Treatment (optional, comma se)" value={f.treatments} onChange={(e) => setF({ ...f, treatments: e.target.value })} className={input} />
            <input type="number" min={1} max={10000} title="Wazan: zyada = zyada baar niklega" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} className={input} />
            <button disabled={busy} className="rounded-lg bg-clinic-teal px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-6">Inaam add karein</button>
          </form>
        </div>
      )}
    </section>
  )
}

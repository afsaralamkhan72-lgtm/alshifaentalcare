'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'

type Prize = { id: string; title: string; kind: 'percent' | 'amount' | 'free' | 'none'; value: number | null; treatment_names: string[]; weight: number; is_active: boolean }
type Card = { id: string; title: string; kind: string; value: number | null; treatment_names: string[]; card_date: string; expires_at: string | null; patient: { id: string; full_name: string } | null }

const kt = (k: string, v: number | null) => (k === 'percent' ? ${v}% discount : k === 'amount' ? Rs.${v} discount : k === 'free' ? 'Muft' : 'Koi inaam nahi')

type PF = { title: string; kind: Prize['kind']; value: string; treatments: string; weight: string }
const pfOf = (p: Prize): PF => ({ title: p.title, kind: p.kind, value: p.value == null ? '' : String(p.value), treatments: p.treatment_names.join(', '), weight: String(p.weight) })
const input = 'w-full rounded-lg border border-clinic-ink/20 px-3 py-2 text-sm'

function PrizeFields({ f, setF }: { f: PF; setF: (v: PF) => void }) {
  const noVal = f.kind === 'free' || f.kind === 'none'
  const lab = 'grid gap-0.5 text-xs font-medium text-clinic-ink/70'
  return (
    <>
      <label className={${lab} sm:col-span-2}>Naam (mareez ko ye dikhega)
        <input required minLength={2} maxLength={80} placeholder="jaise 10% discount" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={input} />
      </label>
      <label className={lab}>Kism
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Prize['kind'] })} className={input}>
          <option value="percent">% discount</option><option value="amount">Rs. discount</option><option value="free">Muft</option><option value="none">Koi inaam nahi</option>
        </select>
      </label>
      <label className={lab}>{f.kind === 'percent' ? 'Miqdar (kitne %)' : f.kind === 'amount' ? 'Miqdar (kitne Rs.)' : 'Miqdar (zarurat nahi)'}
        <input type="number" min={f.kind === 'percent' ? 1 : 0} max={f.kind === 'percent' ? 100 : undefined} placeholder={noVal ? '—' : 'jaise 20'} disabled={noVal} required={!noVal} value={noVal ? '' : f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className={input} />
      </label>
      <label className={lab}>Treatment (agar koi ho)
        <input placeholder="jaise Scaling" value={f.treatments} onChange={(e) => setF({ ...f, treatments: e.target.value })} className={input} />
      </label>
      <label className={lab}>Kitni baar nikle
        <input type="number" min={1} max={10000} title="Bara number = zyada baar nikle ga" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} className={input} />
      </label>
    </>
  )
}

const rowOf = (f: PF) => ({
  title: f.title.trim(),
  kind: f.kind,
  value: f.kind === 'free' || f.kind === 'none' ? null : Number(f.value),
  treatment_names: f.treatments.split(',').map((x) => x.trim()).filter(Boolean),
  weight: Math.max(1, Math.min(10000, Number(f.weight) || 1)),
})

export default function ScratchAdmin({ owner, enabled, days, prizes, cards }: { owner: boolean; enabled: boolean; days: number; prizes: Prize[]; cards: Card[] }) {
  const router = useRouter()
  const sb = createClient()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [d, setD] = useState(String(days))
  const [f, setF] = useState<PF>({ title: '', kind: 'percent', value: '', treatments: '', weight: '1' })
  const [editId, setEditId] = useState<string | null>(null)
  const [ef, setEf] = useState<PF | null>(null)
  const [delId, setDelId] = useState<string | null>(null)
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

  async function savePrize(id: string) {
    if (busy || !ef) return
    setBusy(true); setMsg('')
    const { error } = await sb.from('scratch_prizes').update(rowOf(ef)).eq('id', id)
    setBusy(false)
    if (error) return setMsg('❌ ' + friendlyError(error.message))
    setMsg('✓ Inaam badal gaya. Jo inaam mareez pehle jeet chuke hain wo waise hi rahenge.')
    setEditId(null); setEf(null); router.refresh()
  }

  async function deletePrize(id: string) {
    if (busy) return
    setBusy(true); setMsg('')
    const { data, error } = await sb.from('scratch_prizes').delete().eq('id', id).select('id')
    setBusy(false)
    setDelId(null)
    if (error) {
      if (/foreign key|violates|scratch_cards/i.test(error.message)) return setMsg('❌ Is inaam ko kisi mareez ne jeet rakha hai, is liye ye hata nahi sakte. "band" kar dein, wo bhi kaafi hai.')
      return setMsg('❌ ' + friendlyError(error.message))
    }
    if (!data || data.length === 0) return setMsg('❌ Abhi Delete ki ijazat database mein nahi hai. Ek chhoti SQL (AL-SHIFA-INAAM-DELETE-SQL) Supabase mein chalani hogi. Tab tak "band" ka button istemal karein.')
    setMsg('✓ Inaam hata diya gaya')
    router.refresh()
  }

  return (
    <section className="mt-8 rounded-2xl border border-clinic-teal/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-clinic-ink">Scratch Card</h2>
      <p className="mt-1 text-sm text-clinic-ink/60">Jis din marez ka stamp lagta hai (QR scan), wo ek card khurch kar inaam jeet sakta hai. Inaam kaun sa niklega, ye in ke &quot;kitni baar nikle&quot; se tay hota hai.</p>
      {msg && <p className="mt-2 text-sm">{msg}</p>}

      {cards.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-clinic-ink">Jeete hue inaam (abhi diye nahi)</h3>
          <ul className="divide-y divide-clinic-ink/10">
            {cards.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span><Link className="font-medium underline" href={/admin/patients/${c.patient?.id}}>{c.patient?.full_name}</Link> — <strong>{c.title}</strong> ({kt(c.kind, c.value)}{c.treatment_names.length ? , ${c.treatment_names.join('/')} : ''}) · {c.expires_at ? ${c.expires_at.slice(0, 10)} tak : ''}</span>
                <button disabled={busy} onClick={() => run(() => sb.rpc('scratch_redeem', { p_card: c.id, p_note: null }), 'Inaam de diya gaya darj ho gaya')} className="rounded-lg bg-clinic-teal px-3 py-1.5 text-white disabled:opacity-60">Inaam diya</button>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-clinic-ink/50">Discount bill mein khud nahi lagti: bill banate waqt haath se kam karein, phir &quot;Inaam diya&quot; dabayein.</p>
        </div>
      )}

      {owner && (
        <div className="mt-5 grid gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={rounded-full px-3 py-1 ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-clinic-ink/5 text-clinic-ink/60'}}>{enabled ? 'Chalu hai' : 'Band hai'}</span>
            <label className="flex items-center gap-2">Inaam kitne din chale <input type="number" min={1} max={365} value={d} onChange={(e) => setD(e.target.value)} className={${input} w-20} /></label>
            <button disabled={busy} onClick={() => saveCfg(!enabled)} className="rounded-full bg-clinic-teal px-4 py-1.5 font-semibold text-white disabled:opacity-60">{enabled ? 'Band karein' : 'Chalu karein'}</button>
            {enabled && <button disabled={busy} onClick={() => saveCfg(true)} className="text-clinic-teal underline">din mehfooz</button>}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-clinic-ink">Inaam ki list</h3>
            {prizes.length === 0 && <p className="text-sm text-clinic-ink/60">Abhi koi inaam nahi. Neeche se add karein (kam az kam ek active chahiye).</p>}
            <ul className="divide-y divide-clinic-ink/10">
              {prizes.map((p) => (
                <li key={p.id} className="py-2 text-sm" data-testid="prize-row">
                  {editId === p.id && ef ? (
                    <form className="grid gap-2 rounded-xl bg-clinic-mint/40 p-3 sm:grid-cols-6" data-testid="prize-edit-form" onSubmit={(e) => { e.preventDefault(); void savePrize(p.id) }}>
                      <PrizeFields f={ef} setF={setEf} />
                      <div className="flex gap-2 sm:col-span-6">
                        <button disabled={busy} className="rounded-lg bg-clinic-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" data-testid="prize-save">Save karein</button>
                        <button type="button" disabled={busy} onClick={() => { setEditId(null); setEf(null) }} className="rounded-lg border border-clinic-ink/20 px-4 py-2 text-sm">Rehne dein</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={p.is_active ? '' : 'opacity-50'}><strong>{p.title}</strong> · {kt(p.kind, p.value)}{p.treatment_names.length ? ` (${p.treatment_names.join('/')})` : ''} · kitni baar nikle {p.weight}{p.is_active && total > 0 ? ` (taqreeban ${Math.round((p.weight / total) * 100)}%)` : ''}{p.is_active ? '' : ' · band'}</span>
                      {delId === p.id ? (
                        <span className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-red-700">Pakka hatayein?</span>
                          <button disabled={busy} onClick={() => void deletePrize(p.id)} className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white disabled:opacity-60" data-testid="prize-del-yes">Haan, hatao</button>
                          <button disabled={busy} onClick={() => setDelId(null)} className="rounded-lg border border-clinic-ink/20 px-3 py-1.5">Nahi</button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-3 text-xs">
                          <button disabled={busy} onClick={() => { setEditId(p.id); setEf(pfOf(p)); setDelId(null); setMsg('') }} className="font-semibold text-clinic-teal underline" data-testid="prize-edit">Edit</button>
                          <button disabled={busy} onClick={() => run(() => sb.from('scratch_prizes').update({ is_active: !p.is_active }).eq('id', p.id), p.is_active ? 'Band kiya' : 'Chalu kiya')} className="text-clinic-teal underline">{p.is_active ? 'band' : 'chalu'}</button>
                          <button disabled={busy} onClick={() => { setDelId(p.id); setEditId(null); setEf(null) }} className="text-red-700 underline" data-testid="prize-del">Delete</button>
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <form className="grid gap-2 rounded-xl bg-clinic-mint/40 p-3 sm:grid-cols-6" data-testid="prize-add-form" onSubmit={(e) => {
            e.preventDefault()
            run(() => sb.from('scratch_prizes').insert(rowOf(f)), 'Inaam add ho gaya')
            setF({ title: '', kind: 'percent', value: '', treatments: '', weight: '1' })
          }}>
            <p className="text-xs font-semibold text-clinic-ink sm:col-span-6">Naya inaam add karein</p>
            <PrizeFields f={f} setF={setF} />
            <p className="text-[11px] text-clinic-ink/55 sm:col-span-6">Asli discount &quot;Miqdar&quot; se banta hai, naam se nahi. &quot;Kitni baar nikle&quot; ka bara number matlab wo inaam zyada nikle ga. Kuch na nikalne ke liye kism &quot;Koi inaam nahi&quot; chunein.</p>
            <button disabled={busy} className="rounded-lg bg-clinic-teal px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-6" data-testid="prize-add">Inaam add karein</button>
          </form>
        </div>
      )}
    </section>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type P = { id: string; full_name: string; mr_number: string | null } | null
type Program = { is_active: boolean; reset_after: number | null; allow_manual: boolean; google_review_url: string | null; facebook_url: string | null; instagram_url: string | null; tiktok_url: string | null }
type Reward = { id: string; stamps_required: number; title: string; kind: 'percent' | 'amount' | 'free'; value: number | null; treatment_names: string[]; valid_days: number | null; max_per_patient: number | null; is_active: boolean }

const kindText = (k: string, v: number | null) => (k === 'percent' ? `${v}% discount` : k === 'amount' ? `Rs.${v} discount` : 'Muft')
const TABS = [['today', 'Aaj'], ['patients', 'Patients'], ['settings', 'Settings']] as const
const SUBS = [['members', 'Members'], ['ready', 'Inaam tayyar'], ['signups', 'Naye sign-up']] as const

export default function LoyaltyManager(props: {
  owner: boolean
  program: Program
  rewards: Reward[]
  today: { id: string; source: string; note: string | null; position: number; cycle: number; patient: P }[]
  members: { id: string; name: string; mr: string | null; total: number }[]
  ready: { id: string; title: string; kind: string; value: number | null; treatments: string[]; expires_at: string | null; patient: P }[]
  signups: { id: string; full_name: string; phone: string; created_at: string }[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('today')
  const [sub, setSub] = useState<(typeof SUBS)[number][0]>(props.ready.length ? 'ready' : 'members')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const sb = createClient()
  const tabs = TABS.filter(([k]) => k !== 'settings' || props.owner)

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    if (busy) return
    setBusy(true); setMsg('')
    const { error } = await fn()
    setBusy(false)
    if (error) setMsg('❌ ' + error.message)
    else { setMsg('✓ ' + ok); router.refresh() }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Loyalty</h1>
        {props.owner && (
          <a href="/admin/loyalty/poster" target="_blank" className="rounded-lg border border-clinic-teal px-3 py-2 text-sm font-medium text-clinic-teal">QR poster chhapein</a>
        )}
      </div>
      {!props.program.is_active && (
        <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-amber-900">
          <p className="text-sm font-semibold">Loyalty abhi band hai.</p>
          <p className="mt-1 text-sm">Shuru karne par har visit par marez ko stamp milega aur stamp poore hone par Discount ka inaam.</p>
          {props.owner && (
            <button disabled={busy} onClick={() => run(() => sb.from('loyalty_program').update({ is_active: true }).eq('id', 1), 'Loyalty shuru ho gayi')} className="mt-3 rounded-full bg-clinic-teal px-6 py-3 text-base font-semibold text-white disabled:opacity-60">
              Loyalty shuru karein
            </button>
          )}
        </div>
      )}
      {msg && <p role="status" className="mt-3 rounded-lg bg-clinic-ink/5 p-3 text-sm">{msg}</p>}

      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === k ? 'bg-clinic-teal text-white' : 'bg-white text-clinic-ink ring-1 ring-clinic-ink/15'}`}>
            {l}{k === 'patients' && props.ready.length + props.signups.length ? ` (${props.ready.length + props.signups.length})` : ''}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-clinic-ink/10">
        {tab === 'today' && (
          <div>
            {props.today.length === 0 && <p className="text-sm text-clinic-ink/60">Aaj abhi kisi ne stamp nahi lagwaya.</p>}
            <ul className="divide-y divide-clinic-ink/10">
              {props.today.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span><Link className="font-medium underline" href={`/admin/patients/${s.patient?.id}`}>{s.patient?.full_name}</Link> <span className="text-clinic-ink/50">{s.patient?.mr_number}</span> — stamp #{s.position}{s.cycle > 1 ? ` (daur ${s.cycle})` : ''}{s.source === 'manual' ? ' · haath se' : ''}</span>
                  {props.owner && <VoidBtn onVoid={(reason) => run(() => sb.rpc('loyalty_void_stamp', { p_stamp: s.id, p_reason: reason }), 'Stamp hata diya gaya')} />}
                </li>
              ))}
            </ul>
            {props.owner && props.program.allow_manual && <ManualStamp onStamp={(pid, note) => run(async () => {
                const r = await sb.rpc('loyalty_manual_stamp', { p_patient: pid, p_note: note })
                if (r.error) return r
                const st = (r.data as { status: string } | null)?.status
                if (st === 'awarded') return { error: null }
                const why: Record<string, string> = { already: 'Is din ka stamp pehle hi lag chuka hai', inactive: 'Loyalty band hai', no_patient: 'Patient nahi mila' }
                return { error: { message: why[st ?? ''] ?? 'Stamp nahi laga' } }
              }, 'Stamp lag gaya')} />}
          </div>
        )}

        {tab === 'patients' && (
          <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Patients ki qismen">
            {SUBS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={sub === k} onClick={() => setSub(k)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sub === k ? 'bg-clinic-ink text-white' : 'bg-clinic-mint text-clinic-ink'}`}>
                {l}{k === 'ready' && props.ready.length ? ` (${props.ready.length})` : ''}{k === 'signups' && props.signups.length ? ` (${props.signups.length})` : ''}
              </button>
            ))}
          </div>
        )}
        {tab === 'patients' && sub === 'members' && (
          <ul className="divide-y divide-clinic-ink/10">
            {props.members.length === 0 && <li className="py-2 text-sm text-clinic-ink/60">Abhi koi member nahi.</li>}
            {props.members.map((m) => (
              <li key={m.id} className="flex justify-between py-2 text-sm"><Link className="underline" href={`/admin/patients/${m.id}`}>{m.name} <span className="text-clinic-ink/50">{m.mr}</span></Link><span>{m.total} stamp</span></li>
            ))}
          </ul>
        )}

        {tab === 'patients' && sub === 'ready' && (
          <ul className="divide-y divide-clinic-ink/10">
            {props.ready.length === 0 && <li className="py-2 text-sm text-clinic-ink/60">Koi inaam tayyar nahi.</li>}
            {props.ready.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span><Link className="font-medium underline" href={`/admin/patients/${u.patient?.id}`}>{u.patient?.full_name}</Link> — <strong>{u.title}</strong> ({kindText(u.kind, u.value)}{u.treatments.length ? `, ${u.treatments.join('/')}` : ''}){u.expires_at ? ` · ${u.expires_at.slice(0, 10)} tak` : ''}</span>
                <button disabled={busy} onClick={() => run(() => sb.rpc('loyalty_redeem', { p_unlock: u.id, p_note: null }), 'Inaam de diya gaya darj ho gaya')} className="rounded-lg bg-clinic-teal px-3 py-2 text-white disabled:opacity-60">Inaam diya</button>
              </li>
            ))}
            {props.ready.length > 0 && <li className="pt-3 text-xs text-clinic-ink/50">Discount lagane ka asaan tareeqa: marez ka visit mukammal karein, aane wali screen par “Discount lagayein” dabayein. Discount aur “Inaam diya” khud ho jate hain. Yahan “Inaam diya” sirf tab dabayein jab discount ke bajaye koi muft cheez di ho.</li>}
          </ul>
        )}

        {tab === 'patients' && sub === 'signups' && (
          <ul className="divide-y divide-clinic-ink/10">
            {props.signups.length === 0 && <li className="py-2 text-sm text-clinic-ink/60">Koi naya sign-up nahi.</li>}
            {props.signups.map((g) => (
              <li key={g.id} className="py-3 text-sm">
                <p><strong>{g.full_name}</strong> · {g.phone} <span className="text-clinic-ink/50">({g.created_at.slice(0, 10)})</span></p>
                <LinkSignup onLink={(mr) => run(async () => {
                  const { data } = await sb.from('patients').select('id').eq('mr_number', mr.trim()).is('deleted_at', null).maybeSingle()
                  if (!data) return { error: { message: 'Is MR number ka patient nahi mila' } }
                  return sb.rpc('loyalty_link_signup', { p_signup: g.id, p_patient: data.id })
                }, 'Patient se jod diya')} onDismiss={() => run(() => sb.rpc('loyalty_dismiss_signup', { p_signup: g.id }), 'Hata diya')} />
              </li>
            ))}
          </ul>
        )}

        {tab === 'settings' && props.owner && <Settings program={props.program} rewards={props.rewards} run={run} busy={busy} />}
      </div>
    </div>
  )
}

function VoidBtn({ onVoid }: { onVoid: (reason: string) => void }) {
  return <button className="text-xs text-red-700 underline" onClick={() => { const r = window.prompt('Stamp hatane ki wajah?'); if (r && r.trim()) onVoid(r.trim()) }}>Hatayein</button>
}

function ManualStamp({ onStamp }: { onStamp: (pid: string, note: string) => void }) {
  const sb = createClient()
  const [q, setQ] = useState('')
  const [res, setRes] = useState<{ id: string; full_name: string; mr_number: string | null }[]>([])
  const [note, setNote] = useState('')
  async function find() {
    const s = q.replace(/[%,()]/g, ' ').trim()
    if (s.length < 2) return
    const { data } = await sb.from('patients').select('id, full_name, mr_number').is('deleted_at', null).or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,mr_number.ilike.%${s}%`).limit(8)
    setRes(data ?? [])
  }
  return (
    <div className="mt-5 border-t border-clinic-ink/10 pt-4">
      <p className="text-sm font-medium">Haath se stamp (sirf doctor)</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input aria-label="Patient talash" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam / phone / MR" className="rounded-lg border border-clinic-ink/20 px-3 py-2 text-sm" />
        <button onClick={find} className="rounded-lg border border-clinic-ink/20 px-3 py-2 text-sm">Talash</button>
        <input aria-label="Wajah" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Wajah (zaroori)" className="rounded-lg border border-clinic-ink/20 px-3 py-2 text-sm" />
      </div>
      <ul className="mt-2 space-y-1">
        {res.map((p) => (
          <li key={p.id} className="flex items-center justify-between text-sm"><span>{p.full_name} <span className="text-clinic-ink/50">{p.mr_number}</span></span>
            <button disabled={!note.trim()} onClick={() => onStamp(p.id, note)} className="rounded-lg bg-clinic-teal px-3 py-1.5 text-white disabled:opacity-50">Stamp lagayein</button></li>
        ))}
      </ul>
    </div>
  )
}

function LinkSignup({ onLink, onDismiss }: { onLink: (mr: string) => void; onDismiss: () => void }) {
  const [mr, setMr] = useState('')
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <input aria-label="MR number" value={mr} onChange={(e) => setMr(e.target.value)} placeholder="Patient ka MR number" className="rounded-lg border border-clinic-ink/20 px-3 py-2" />
      <button disabled={!mr.trim()} onClick={() => onLink(mr)} className="rounded-lg bg-clinic-teal px-3 py-2 text-white disabled:opacity-50">Jodein</button>
      <button onClick={onDismiss} className="rounded-lg border border-clinic-ink/20 px-3 py-2">Hatayein</button>
    </div>
  )
}

function Settings({ program, rewards, run, busy }: { program: Program; rewards: Reward[]; run: (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => void; busy: boolean }) {
  const sb = createClient()
  const [p, setP] = useState(program)
  const [r, setR] = useState({ stamps: '', title: '', kind: 'percent' as Reward['kind'], value: '', treatments: '', days: '', max: '' })
  const set = <K extends keyof Program>(k: K, v: Program[K]) => setP((x) => ({ ...x, [k]: v }))
  const inp = 'w-full rounded-lg border border-clinic-ink/20 px-3 py-2 text-sm'
  const cleanUrl = (u: string | null) => (u && u.trim() ? u.trim() : null)
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={p.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Loyalty shuru hai (band karne par stamp aur inaam ruk jate hain)</label>
        <label className="block text-sm">Kitne stamp ke baad card dobara shuru ho (khali = kabhi nahi)
          <input type="number" min={2} max={50} className={inp} value={p.reset_after ?? ''} onChange={(e) => set('reset_after', e.target.value ? Number(e.target.value) : null)} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.allow_manual} onChange={(e) => set('allow_manual', e.target.checked)} /> Doctor haath se stamp laga sakay</label>
        <details className="rounded-xl border border-clinic-ink/10 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-clinic-teal">Review aur social links (inaam milne par marez ko dikhte hain)</summary>
          <div className="mt-3 space-y-3">
        {(['google_review_url', 'facebook_url', 'instagram_url', 'tiktok_url'] as const).map((k) => (
          <label key={k} className="block text-sm">{k === 'google_review_url' ? 'Google Business (review link)' : k.replace('_url', '')} link
            <input className={inp} placeholder="https://…" aria-label="https://…" value={p[k] ?? ''} onChange={(e) => set(k, e.target.value)} /></label>
        ))}
          </div>
        </details>
        <button disabled={busy} onClick={() => {
          if (p.reset_after != null && (p.reset_after < 2 || p.reset_after > 50)) return alert('Reset 2 se 50 ke darmiyan hona chahiye')
          for (const k of ['google_review_url', 'facebook_url', 'instagram_url', 'tiktok_url'] as const) { const u = cleanUrl(p[k]); if (u && !/^https?:\/\//i.test(u)) return alert('Link https:// se shuru hona chahiye')}
          run(() => sb.from('loyalty_program').update({ is_active: p.is_active, reset_after: p.reset_after, allow_manual: p.allow_manual, google_review_url: cleanUrl(p.google_review_url), facebook_url: cleanUrl(p.facebook_url), instagram_url: cleanUrl(p.instagram_url), tiktok_url: cleanUrl(p.tiktok_url), updated_at: new Date().toISOString() }).eq('id', 1), 'Settings save ho gayin')
        }} className="rounded-lg bg-clinic-teal px-4 py-2 text-white disabled:opacity-60">Settings save karein</button>
      </section>

      <section>
        <h2 className="font-semibold">Inaam (kitne stamp par kya)</h2>
        <ul className="mt-2 divide-y divide-clinic-ink/10">
          {rewards.length === 0 && <li className="py-2 text-sm text-clinic-ink/60">Abhi koi inaam nahi.</li>}
          {rewards.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className={x.is_active ? '' : 'opacity-50'}><strong>{x.stamps_required} stamp</strong> — {x.title} ({kindText(x.kind, x.value)}{x.treatment_names.length ? `, ${x.treatment_names.join('/')}` : ''}{x.valid_days ? `, ${x.valid_days} din` : ''}{x.max_per_patient ? `, max ${x.max_per_patient}` : ''}){x.is_active ? '' : ' · band'}</span>
              <button disabled={busy} className="text-xs underline" onClick={() => run(() => sb.from('loyalty_rewards').update({ is_active: !x.is_active }).eq('id', x.id), x.is_active ? 'Inaam band' : 'Inaam shuru')}>{x.is_active ? 'Band karein' : 'Shuru karein'}</button>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input aria-label="Stamp ginti" type="number" min={1} max={50} className={inp} placeholder="Kitne stamp par" value={r.stamps} onChange={(e) => setR({ ...r, stamps: e.target.value })} />
          <input aria-label="Inaam ka naam" className={inp} placeholder="Inaam (jaise: Scaling 20% discount)" value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} />
          <select aria-label="Qisam" className={inp} value={r.kind} onChange={(e) => setR({ ...r, kind: e.target.value as Reward['kind'] })}>
            <option value="percent">Fee % discount</option><option value="amount">Rs. discount</option><option value="free">Muft</option>
          </select>
          {r.kind !== 'free' && <input aria-label="Qeemat" type="number" min={1} className={inp} placeholder={r.kind === 'percent' ? '% (1-100)' : 'Rs.'} value={r.value} onChange={(e) => setR({ ...r, value: e.target.value })} />}
          <input aria-label="Kis treatment par" className={inp} placeholder="Kis treatment par (koma se, khali = koi bhi)" value={r.treatments} onChange={(e) => setR({ ...r, treatments: e.target.value })} />
          <input aria-label="Kitne din valid" type="number" min={1} className={inp} placeholder="Kitne din valid (khali = hamesha)" value={r.days} onChange={(e) => setR({ ...r, days: e.target.value })} />
          <input aria-label="Max baar" type="number" min={1} className={inp} placeholder="Ek patient ko max kitni baar (khali = jitni)" value={r.max} onChange={(e) => setR({ ...r, max: e.target.value })} />
        </div>
        <button disabled={busy} className="mt-3 rounded-lg bg-clinic-teal px-4 py-2 text-white disabled:opacity-60" onClick={() => {
          const n = Number(r.stamps)
          if (!Number.isInteger(n) || n < 1 || n > 50) return alert('Stamp ginti 1 se 50 ke darmiyan likhein')
          if (!r.title.trim()) return alert('Inaam ka naam likhein')
          if (r.kind !== 'free' && !(Number(r.value) > 0)) return alert('Discount ki qeemat likhein')
          if (r.kind === 'percent' && Number(r.value) > 100) return alert('Percent 100 se zyada nahi ho sakta')
          run(async () => {
            const res = await sb.from('loyalty_rewards').insert({ stamps_required: n, title: r.title.trim(), kind: r.kind, value: r.kind === 'free' ? null : Number(r.value), treatment_names: r.treatments.split(',').map((x) => x.trim()).filter(Boolean), valid_days: r.days ? Number(r.days) : null, max_per_patient: r.max ? Number(r.max) : null })
            if (!res.error) setR({ stamps: '', title: '', kind: 'percent', value: '', treatments: '', days: '', max: '' })
            return res
          }, 'Inaam jod diya')
        }}>Inaam jodein</button>
      </section>
    </div>
  )
}

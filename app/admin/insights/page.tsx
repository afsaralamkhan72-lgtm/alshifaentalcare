import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import { addDays, fmtDate, money, todayKarachi } from '@/lib/karachi'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'

export const dynamic = 'force-dynamic'

const HOURS = (iso: string) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', hour12: false }).format(new Date(iso)))
const WD = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumerat', 'Jumma', 'Hafta']

function Bars({ rows, fmt = (n: number) => String(n) }: { rows: { label: string; v: number }[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.v))
  return (
    <div className="grid gap-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[84px_1fr_auto] items-center gap-2 text-xs">
          <span className="text-clinic-ink/60">{r.label}</span>
          <div className="h-3 rounded-full bg-clinic-mint"><div className="h-3 rounded-full bg-clinic-teal" style={{ width: `${Math.round((r.v / max) * 100)}%` }} /></div>
          <span className="tabular-nums text-clinic-ink">{fmt(r.v)}</span>
        </div>
      ))}
    </div>
  )
}
const Card = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
    <h2 className="font-display text-lg font-semibold text-clinic-ink">{title}</h2>
    {hint && <p className="mb-3 mt-0.5 text-xs text-clinic-ink/50">{hint}</p>}
    {children}
  </section>
)

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ gap?: string }> }) {
  await requireOwner()
  const { gap } = await searchParams
  const gapDays = [45, 90, 180].includes(Number(gap)) ? Number(gap) : 90
  const sb = await createClient()
  const today = todayKarachi()
  const y1 = addDays(today, -365)
  const d90 = addDays(today, -90)

  const [payRes, visRes, trRes, labRes, apRes, ptRes] = await Promise.all([
    sb.from('payments').select('paid_on, amount, kind').gte('paid_on', y1).limit(20000),
    sb.from('clinical_visits').select('patient_id, visit_date, created_at').eq('status', 'finished').gte('visit_date', y1).limit(20000),
    sb.from('patient_treatments').select('id, name, price, list_price, status').neq('status', 'cancelled').gte('started_on', y1).limit(20000),
    sb.from('lab_cases').select('treatment_id, cost').is('deleted_at', null).not('treatment_id', 'is', null).limit(20000),
    sb.from('appointments').select('patient_id, preferred_date, status').eq('status', 'confirmed').is('deleted_at', null).gte('preferred_date', d90).lt('preferred_date', today).limit(5000),
    sb.from('patients').select('id, full_name, phone, referral_source, created_at').is('deleted_at', null).limit(20000),
  ])

  // 1) Kamai ka rukh (mahana)
  const months = new Map<string, number>()
  for (let i = 11; i >= 0; i--) { const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - i); months.set(d.toISOString().slice(0, 7), 0) }
  for (const p of (payRes.data ?? []) as { paid_on: string; amount: number; kind: string }[]) {
    const k = p.paid_on.slice(0, 7)
    if (months.has(k)) months.set(k, (months.get(k) ?? 0) + (p.kind === 'refund' ? -1 : 1) * Math.abs(Number(p.amount)))
  }
  const monthRows = [...months.entries()].map(([k, v]) => ({ label: k, v: Math.max(0, v) }))
  const thisM = monthRows[monthRows.length - 1]?.v ?? 0
  const lastM = monthRows[monthRows.length - 2]?.v ?? 0

  // 2) Wapas nahi aaye
  const visits = (visRes.data ?? []) as { patient_id: string; visit_date: string; created_at: string }[]
  const lastVisit = new Map<string, string>()
  for (const v of visits) if (!lastVisit.has(v.patient_id) || v.visit_date > lastVisit.get(v.patient_id)!) lastVisit.set(v.patient_id, v.visit_date)
  const upcoming = new Set<string>()
  const { data: fut } = await sb.from('appointments').select('patient_id').gte('preferred_date', today).neq('status', 'cancelled').is('deleted_at', null).not('patient_id', 'is', null)
  for (const a of (fut ?? []) as { patient_id: string }[]) upcoming.add(a.patient_id)
  const pts = new Map(((ptRes.data ?? []) as { id: string; full_name: string; phone: string; referral_source: string | null; created_at: string }[]).map((p) => [p.id, p]))
  const cutoff = addDays(today, -gapDays)
  const away = [...lastVisit.entries()]
    .filter(([id, d]) => d < cutoff && !upcoming.has(id) && pts.has(id))
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, 60)

  // 3) Treatment par bachat
  const labByTr = new Map<string, number>()
  for (const l of (labRes.data ?? []) as { treatment_id: string; cost: number }[]) labByTr.set(l.treatment_id, (labByTr.get(l.treatment_id) ?? 0) + Number(l.cost ?? 0))
  const byName = new Map<string, { n: number; revenue: number; disc: number; lab: number }>()
  for (const t of (trRes.data ?? []) as { id: string; name: string; price: number; list_price: number }[]) {
    const k = t.name.trim()
    const r = byName.get(k) ?? { n: 0, revenue: 0, disc: 0, lab: 0 }
    r.n += 1; r.revenue += Number(t.price); r.disc += Math.max(0, Number(t.list_price) - Number(t.price)); r.lab += labByTr.get(t.id) ?? 0
    byName.set(k, r)
  }
  const trRows = [...byName.entries()].map(([name, r]) => ({ name, ...r, net: r.revenue - r.lab })).sort((a, b) => b.net - a.net).slice(0, 15)

  // 4) Bheed ke ghante / din (pichle 90 din)
  const hour = new Array(24).fill(0)
  const wday = new Array(7).fill(0)
  for (const v of visits) {
    if (v.visit_date < d90) continue
    hour[HOURS(v.created_at)] += 1
    wday[new Date(`${v.visit_date}T00:00:00Z`).getUTCDay()] += 1
  }
  const hourRows = hour.map((v, h) => ({ label: `${h % 12 || 12} ${h < 12 ? 'subah' : 'dopahar/shaam'}`, v })).filter((r, h) => h >= 8 && h <= 23)
  const wdRows = wday.map((v, i) => ({ label: WD[i], v }))

  // 5) No-show (taqreeban): confirmed appointment, tareekh guzar gayi, us din visit nahi hui
  const visitOn = new Set(visits.map((v) => `${v.patient_id}|${v.visit_date}`))
  const aps = (apRes.data ?? []) as { patient_id: string | null; preferred_date: string }[]
  const linked = aps.filter((a) => a.patient_id)
  const noshow = linked.filter((a) => !visitOn.has(`${a.patient_id}|${a.preferred_date}`))
  const pct = linked.length ? Math.round((noshow.length / linked.length) * 100) : 0

  // 6) Kahan se aaya (pichle 12 mahine ke naye marez)
  const src = new Map<string, number>()
  for (const p of pts.values()) if (p.created_at.slice(0, 10) >= y1) { const k = p.referral_source?.trim() || 'Nahi likha'; src.set(k, (src.get(k) ?? 0) + 1) }
  const srcRows = [...src.entries()].map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v)

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Business Insights</h1>
        <p className="text-sm text-clinic-ink/60">Sirf doctor/admin ke liye. Ye sab maujooda records se hisaab lagata hai.</p>
      </div>

      <Card title="Kamai ka rukh" hint="Mahana mili hui raqam (refund ghata kar), pichle 12 mahine">
        <p className="mb-3 text-sm">Is mahina <b>{money(thisM)}</b> · pichla mahina <b>{money(lastM)}</b>{lastM > 0 && <span className={thisM >= lastM ? ' text-emerald-700' : ' text-red-700'}> ({thisM >= lastM ? '+' : ''}{Math.round(((thisM - lastM) / lastM) * 100)}%, mahina abhi poora nahi hua)</span>}</p>
        <Bars rows={monthRows} fmt={money} />
      </Card>

      <Card title="Wapas nahi aaye" hint="Jin ki aakhri visit itne din pehle thi aur aane wali appointment bhi nahi">
        <div className="mb-3 flex gap-2 text-xs">
          {[45, 90, 180].map((g) => (
            <a key={g} href={`/admin/insights?gap=${g}`} className={`rounded-full px-3 py-1 ${g === gapDays ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/30 text-clinic-teal'}`}>{g} din</a>
          ))}
        </div>
        {away.length === 0 ? <p className="text-sm text-clinic-ink/60">Koi nahi.</p> : (
          <div className="divide-y divide-clinic-teal/10 text-sm">
            {away.map(([id, d]) => {
              const p = pts.get(id)!
              const days = Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${d}T00:00:00Z`).getTime()) / 86_400_000)
              return (
                <div key={id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span><b>{p.full_name}</b> <span className="text-xs text-clinic-ink/50">· aakhri visit {fmtDate(d)} ({days} din)</span></span>
                  <a target="_blank" rel="noopener noreferrer" className="rounded-full bg-whatsapp px-3 py-1 text-xs font-semibold text-white"
                    href={buildWhatsAppLink({ phoneOverride: p.phone, customMessage: `Assalam o Alaikum ${p.full_name},\n\nBohat din ho gaye, aap ki khairiyat? Apne daant/sehat ke check-up ke liye appointment le lein.\n\n${CLINIC.name}` })}>WhatsApp</a>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="Treatment par bachat" hint="Pichle 12 mahine. Bachat = treatment ki qeemat − lab ka kharcha. Riyayat alag dikhayi hai. Dawa/samaan ka kharcha is mein shamil nahi.">
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-xs text-clinic-ink/50"><tr><th className="py-1">Treatment</th><th>Tadaad</th><th className="text-right">Qeemat</th><th className="text-right">Lab</th><th className="text-right">Riyayat</th><th className="text-right">Bachat</th></tr></thead>
          <tbody>{trRows.map((r) => (
            <tr key={r.name} className="border-t border-clinic-teal/10"><td className="py-1.5">{r.name}</td><td>{r.n}</td><td className="text-right">{money(r.revenue)}</td><td className="text-right">{money(r.lab)}</td><td className="text-right">{money(r.disc)}</td><td className="text-right font-semibold">{money(r.net)}</td></tr>
          ))}</tbody>
        </table></div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Bheed ke ghante" hint="Pichle 90 din ki visits, kis waqt shuru hui"><Bars rows={hourRows} /></Card>
        <Card title="Bheed ke din" hint="Pichle 90 din"><Bars rows={wdRows} /></Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Appointment par na aana (taqreeban)" hint="Confirmed appointment jis din marez ki visit darj nahi hui. Pichle 90 din.">
          <p className="text-2xl font-semibold text-clinic-ink">{pct}% <span className="text-sm font-normal text-clinic-ink/60">({noshow.length} / {linked.length})</span></p>
          <p className="mt-2 text-xs text-clinic-ink/50">Marez ne agar aur din visit ki ho to wo bhi yahan ginti mein aa sakta hai.</p>
        </Card>
        <Card title="Marez kahan se aaye" hint="Pichle 12 mahine ke naye marez (patient form ka 'kaise pata chala')"><Bars rows={srcRows} /></Card>
      </div>
    </div>
  )
}

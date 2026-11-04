import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'
import { todayKarachi } from '@/lib/karachi'
import { toothTitle as toothLabel } from '@/lib/teeth'

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB') : '—'
}

export interface PortalPatient { id: string; full_name: string; mr_number: string | null; phone: string; department: string }

/** Marez ka record (portal aur QR-link dono yahi dikhate hain). rxHref: prescription kholne ka link */
export default async function PortalView({ patient, supabase, rxHref }: { patient: PortalPatient; supabase: SupabaseClient; rxHref: (id: string) => string }) {
  const today = todayKarachi()

  const [plansRes, apptRes, visitRes, cvRes] = await Promise.all([
    supabase
      .from('treatment_plans')
      .select('id, title, total_cost, advance_paid, monthly_amount, duration_months')
      .eq('patient_id', patient.id),
    // Sirf isi patient ki appointments (ghar ke doosre log jo wahi phone istemal karte hain unki nahi).
    // Purani appointments jo patient se jurri nahi (patient_id khali) un ke liye phone se milana jari.
    supabase
      .from('appointments')
      .select('treatment_name, preferred_date, preferred_time, status')
      .or(`patient_id.eq.${patient.id},and(patient_id.is.null,phone.eq."${String(patient.phone).replace(/"/g, '')}")`)
      .is('deleted_at', null)
      .order('preferred_date', { ascending: false })
      .limit(5),
    supabase
      .from('visit_notes')
      .select('visit_date, next_visit')
      .eq('patient_id', patient.id)
      .order('visit_date', { ascending: false })
      .limit(1),
    supabase
      .from('clinical_visits')
      .select('visit_date, next_date')
      .eq('patient_id', patient.id)
      .eq('status', 'finished')
      .order('visit_date', { ascending: false })
      .limit(1),
  ])

  const plans = plansRes.data ?? []
  const appointments = apptRes.data ?? []
  // Purani (visit_notes) aur nayi (clinical_visits) dono mein se jo taza ho
  const oldV = visitRes.data?.[0] ?? null
  const newV = cvRes.data?.[0] ?? null
  const lastVisit =
    newV && (!oldV || newV.visit_date >= oldV.visit_date)
      ? { visit_date: newV.visit_date, next_visit: newV.next_date as string | null }
      : oldV

  // Pichli prescriptions (sirf isi patient ki, taza 3)
  const { data: rxRows } = await supabase
    .from('prescriptions')
    .select('id, prescribed_date, items')
    .eq('patient_id', patient.id)
    .order('prescribed_date', { ascending: false })
    .limit(3)
  const rxList = (rxRows ?? []) as { id: string; prescribed_date: string; items: { name_en?: string; name_ur?: string; potency?: string; dosage?: string; frequency?: string; duration?: string; instructions?: string }[] | null }[]

  // Instalments across all plans
  let installments: { amount: number; paid_amount: number; due_date: string; paid_date: string | null }[] = []
  if (plans.length > 0) {
    const { data } = await supabase
      .from('installments')
      .select('amount, paid_amount, due_date, paid_date')
      .in('plan_id', plans.map((p) => p.id))
      .order('due_date', { ascending: true })
    installments = data ?? []
  }

  const total = plans.reduce((s, p) => s + Number(p.total_cost), 0)
  const paid =
    plans.reduce((s, p) => s + Number(p.advance_paid), 0) +
    installments.reduce((s, i) => s + Number(i.paid_amount), 0)
  let balance = Math.max(0, total - paid)
  let totalShown = total
  let paidShown = paid
  // Phase 4: aik hi formula (database view) taake patient ko wahi hisaab dikhe jo clinic ke paas hai
  {
    const { data: vb, error: vbErr } = await supabase
      .from('patient_balances')
      .select('total_charges, total_paid, balance')
      .eq('patient_id', patient.id)
      .maybeSingle()
    if (!vbErr && vb) {
      totalShown = Number(vb.total_charges)
      paidShown = Number(vb.total_paid)
      balance = Number(vb.balance)
    }
  }
  const nextDue = installments.find((i) => Number(i.paid_amount) === 0)

  // Naya hisaab: har treatment ka hisaab, qistein, payments, visits (jo table na ho to khali, page na toote)
  const [trRes, tbRes, ppRes, payRes, cvListRes] = await Promise.all([
    supabase.from('patient_treatments').select('id, name, teeth, status, started_on').eq('patient_id', patient.id).neq('status', 'cancelled').order('started_on', { ascending: false }).limit(20),
    supabase.from('treatment_balances').select('treatment_id, charged, paid, balance').eq('patient_id', patient.id),
    supabase.from('payment_plans').select('patient_treatment_id, base_paid, payment_plan_items(no, due_date, amount)').eq('patient_id', patient.id).eq('status', 'active'),
    supabase.from('payments').select('id, paid_on, amount, method, kind').eq('patient_id', patient.id).order('paid_on', { ascending: false }).order('created_at', { ascending: false }).limit(10),
    supabase.from('clinical_visits').select('id, visit_date, doctor').eq('patient_id', patient.id).eq('status', 'finished').order('visit_date', { ascending: false }).limit(8),
  ])
  const trs = (trRes.error ? [] : trRes.data ?? []) as { id: string; name: string; teeth: string[] | null; status: string; started_on: string }[]
  const tbal = new Map(((tbRes.error ? [] : tbRes.data ?? []) as { treatment_id: string; charged: number; paid: number; balance: number }[]).map((b) => [b.treatment_id, b]))
  const planOf = new Map(((ppRes.error ? [] : ppRes.data ?? []) as unknown as { patient_treatment_id: string; base_paid: number; payment_plan_items: { no: number; due_date: string; amount: number }[] }[]).map((p) => [p.patient_treatment_id, p]))
  const pays = (payRes.error ? [] : payRes.data ?? []) as { id: string; paid_on: string; amount: number; method: string | null; kind: string }[]
  const cvs = (cvListRes.error ? [] : cvListRes.data ?? []) as { id: string; visit_date: string; doctor: string | null }[]
  const procByVisit = new Map<string, string[]>()
  if (cvs.length) {
    const { data: vn } = await supabase.from('visit_notes').select('clinical_visit_id, procedure').in('clinical_visit_id', cvs.map((c) => c.id)).is('voided_at', null)
    for (const v of (vn ?? []) as { clinical_visit_id: string; procedure: string | null }[]) {
      if (v.procedure) (procByVisit.get(v.clinical_visit_id) ?? procByVisit.set(v.clinical_visit_id, []).get(v.clinical_visit_id)!).push(v.procedure)
    }
  }
  const rsx = (n: number) => `Rs. ${Number(n).toLocaleString('en-US')}`

  // Stamp aur inaam (loyalty). Jo na ho ya error aaye to ye hissa chhup jata hai, baqi page chalta rahta hai.
  const [lcRes, scRes] = await Promise.all([
    supabase.rpc('_loyalty_card', { p_patient: patient.id }),
    supabase.from('scratch_cards').select('id, title, kind, expires_at, redeemed_at').eq('patient_id', patient.id).order('card_date', { ascending: false }).limit(10),
  ])
  const lc = (lcRes.error ? null : lcRes.data) as { stamps: number; total: number; cycle_size: number | null; next_title: string | null; remaining: number | null; ready: { id: string; title: string; expires_at: string | null }[] } | null
  const nowMs = Date.now()
  const scr = ((scRes.error ? [] : scRes.data ?? []) as { id: string; title: string; kind: string; expires_at: string | null; redeemed_at: string | null }[]).filter(
    (c) => c.kind !== 'none' && !c.redeemed_at && (!c.expires_at || new Date(c.expires_at).getTime() > nowMs),
  )
  const showLoyalty = !!lc && (lc.total > 0 || (lc.ready?.length ?? 0) > 0 || scr.length > 0)

  const upcoming = appointments.find(
    (a) => a.preferred_date && a.preferred_date >= today && a.status !== 'cancelled'
  )

  return (
    <Shell>
      <p className="text-xs font-semibold uppercase tracking-wide text-clinic-amber">
        Your Record
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-clinic-ink">
        {patient.full_name}
      </h1>
      <p className="text-sm text-clinic-ink/50">
        {patient.mr_number} · {patient.department}
      </p>

      {/* Next appointment / next visit */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-clinic-teal p-5 text-white">
          <p className="text-xs text-white/60">Next Appointment</p>
          <p className="mt-1 font-display text-lg font-semibold">
            {upcoming
              ? `${fmt(upcoming.preferred_date)}${upcoming.preferred_time ? ` · ${upcoming.preferred_time}` : ''}`
              : 'Not booked'}
          </p>
          {lastVisit?.next_visit && (
            <p className="mt-2 text-xs text-white/60">
              Suggested next visit: {fmt(lastVisit.next_visit)}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
          <p className="text-xs text-clinic-ink/50">Balance</p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            Rs. {balance.toLocaleString()}
          </p>
          {nextDue && (
            <p className="mt-2 text-xs text-clinic-ink/50">
              Next instalment Rs. {Number(nextDue.amount).toLocaleString()} due{' '}
              {fmt(nextDue.due_date)}
            </p>
          )}
        </div>
      </div>

      {/* Treatment plans */}
      {plans.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-clinic-ink">Treatment Plan</h2>
          <div className="mt-3 grid gap-3">
            {plans.map((p) => (
              <div key={p.id} className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
                <p className="font-medium text-clinic-ink">{p.title}</p>
                <p className="mt-1 text-sm text-clinic-ink/60">
                  Rs. {Number(p.total_cost).toLocaleString()} · {p.duration_months} months · Rs.{' '}
                  {Number(p.monthly_amount).toLocaleString()} per month
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Box label="Total" value={`Rs. ${totalShown.toLocaleString()}`} />
            <Box label="Paid" value={`Rs. ${paidShown.toLocaleString()}`} tone="green" />
            <Box label="Balance" value={`Rs. ${balance.toLocaleString()}`} tone="amber" />
          </div>
        </section>
      )}

      {plans.length === 0 && totalShown > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-clinic-ink">Hisaab</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Box label="Total" value={`Rs. ${totalShown.toLocaleString()}`} />
            <Box label="Paid" value={`Rs. ${paidShown.toLocaleString()}`} tone="green" />
            <Box label="Balance" value={`Rs. ${balance.toLocaleString()}`} tone="amber" />
          </div>
        </section>
      )}

      {/* Payment history */}
      {installments.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-clinic-ink">Payment History</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-clinic-teal/10 bg-white">
            <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
              <thead className="bg-clinic-mint text-left text-clinic-ink/60">
                <tr>
                  <th className="px-4 py-2">Due</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((i, n) => {
                  const isPaid = Number(i.paid_amount) > 0
                  return (
                    <tr key={n} className="border-t border-clinic-teal/10">
                      <td className="px-4 py-2">{fmt(i.due_date)}</td>
                      <td className="px-4 py-2">Rs. {Number(i.amount).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700'
                              : i.due_date < today
                                ? 'bg-red-50 text-red-700'
                                : 'bg-clinic-mint text-clinic-ink/50'
                          }`}
                        >
                          {isPaid ? `Paid ${fmt(i.paid_date)}` : i.due_date < today ? 'Overdue' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table></div>
          </div>
        </section>
      )}

      {trs.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-clinic-ink">Meri treatments</h2>
          <div className="mt-3 grid gap-3">
            {trs.map((t) => {
              const b = tbal.get(t.id)
              const pl = planOf.get(t.id)
              let applied = pl ? (Number(b?.balance ?? 0) <= 0 ? Infinity : Math.max(0, Number(b?.paid ?? 0) - Number(pl.base_paid))) : 0
              const items = pl
                ? [...pl.payment_plan_items].sort((a, c) => a.no - c.no).map((it) => {
                    const got = Math.min(applied, Number(it.amount))
                    applied -= got
                    const left = Math.round((Number(it.amount) - got) * 100) / 100
                    return { ...it, left, state: left <= 0 ? 'paid' : it.due_date < today ? 'late' : 'wait' }
                  })
                : []
              return (
                <div key={t.id} className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
                  <p className="font-medium text-clinic-ink">
                    {t.name}
                    {(t.teeth ?? []).length > 0 && <span className="text-xs text-clinic-ink/60"> ({(t.teeth ?? []).map(toothLabel).join(', ')})</span>}
                  </p>
                  <p className="text-xs text-clinic-ink/50">
                    {fmt(t.started_on)} · {t.status === 'completed' ? 'mukammal' : t.status === 'planned' ? 'plan' : 'jaari'}
                  </p>
                  {b && (
                    <p className="mt-1 text-sm text-clinic-ink/80">
                      Kharcha {rsx(b.charged)} · Mila {rsx(b.paid)}
                      {Number(b.balance) > 0 ? <span className="font-semibold text-amber-700"> · Baqaya {rsx(b.balance)}</span> : <span className="text-emerald-700"> · hisaab saaf</span>}
                    </p>
                  )}
                  {items.length > 0 && (
                    <ul className="mt-2 grid gap-1 rounded-lg bg-clinic-mint/50 p-2 text-sm">
                      <li className="text-xs font-semibold text-clinic-ink/60">Qistein</li>
                      {items.map((it) => (
                        <li key={it.no} className="flex flex-wrap items-center gap-2">
                          <span>{fmt(it.due_date)}</span>
                          <span className="font-medium">{rsx(it.amount)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${it.state === 'paid' ? 'bg-emerald-50 text-emerald-700' : it.state === 'late' ? 'bg-red-50 text-red-700' : 'bg-white text-clinic-ink/50'}`}>
                            {it.state === 'paid' ? 'ada' : it.state === 'late' ? 'der ho gayi' : 'baqi'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {showLoyalty && lc && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-clinic-ink">Mere stamp aur inaam</h2>
          <div className="mt-3 rounded-2xl border border-clinic-teal/10 bg-white p-4">
            <p className="text-sm text-clinic-ink/70">
              Is round ke stamp: <span className="font-semibold text-clinic-ink">{lc.stamps}</span>
              {lc.cycle_size ? ` / ${lc.cycle_size}` : ''} · kul stamp: <span className="font-semibold text-clinic-ink">{lc.total}</span>
            </p>
            {lc.cycle_size ? (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-hidden="true">
                {Array.from({ length: Math.min(lc.cycle_size, 30) }).map((_, i) => (
                  <span key={i} className={`h-4 w-4 rounded-full ${i < lc.stamps ? 'bg-clinic-teal' : 'bg-clinic-teal/15'}`} />
                ))}
              </div>
            ) : null}
            {lc.next_title && lc.remaining != null && lc.remaining > 0 && (
              <p className="mt-2 text-xs text-clinic-ink/60">
                Agla inaam <span className="font-semibold">{lc.next_title}</span>: {lc.remaining} stamp aur.
              </p>
            )}
            {(lc.ready?.length ?? 0) > 0 && (
              <div className="mt-3 grid gap-2">
                {lc.ready.map((r) => (
                  <div key={r.id} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    Aap ka inaam tayyar: <span className="font-semibold">{r.title}</span>
                    {r.expires_at ? <span className="text-xs text-emerald-800/70"> (mudat: {fmt(r.expires_at)})</span> : null}
                  </div>
                ))}
              </div>
            )}
            {scr.length > 0 && (
              <div className="mt-3 grid gap-2">
                {scr.map((c) => (
                  <div key={c.id} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Scratch card ka inaam: <span className="font-semibold">{c.title}</span>
                    {c.expires_at ? <span className="text-xs text-amber-800/70"> (mudat: {fmt(c.expires_at)})</span> : null}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-clinic-ink/45">Inaam lene ke liye clinic par bataein.</p>
          </div>
        </section>
      )}

      {pays.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-clinic-ink">Meri payments</h2>
          <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
            {pays.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-clinic-ink/70">
                  {fmt(p.paid_on)}
                  {p.method ? ` · ${p.method}` : ''}
                </span>
                <span className={p.kind === 'refund' ? 'font-semibold text-red-700' : 'font-semibold text-emerald-700'}>
                  {p.kind === 'refund' ? '− ' : ''}
                  {rsx(Math.abs(Number(p.amount)))}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {cvs.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-clinic-ink">Meri visits</h2>
          <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
            {cvs.map((v) => (
              <div key={v.id} className="px-4 py-2.5 text-sm">
                <p className="text-clinic-ink">
                  {fmt(v.visit_date)}
                  {v.doctor ? <span className="text-xs text-clinic-ink/50"> · {v.doctor}</span> : null}
                </p>
                {(procByVisit.get(v.id) ?? []).length > 0 && <p className="text-xs text-clinic-ink/60">{(procByVisit.get(v.id) ?? []).join(', ')}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Appointments */}
      {appointments.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-clinic-ink">Recent Appointments</h2>
          <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
            {appointments.map((a, n) => (
              <div key={n} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-clinic-ink">{a.treatment_name ?? 'Consultation'}</p>
                  <p className="text-xs text-clinic-ink/50">{fmt(a.preferred_date)}</p>
                </div>
                <span className="rounded-full bg-clinic-mint px-3 py-1 text-xs font-semibold capitalize text-clinic-ink/60">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={buildWhatsAppLink({
            customMessage: `Asalam-o-Alaikum, main ${patient.full_name} (${patient.mr_number}) hoon. Mujhe appointment chahiye.`,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white"
        >
          Book on WhatsApp
        </a>
        <a
          href={`tel:${CLINIC.phone.dial}`}
          className="rounded-full border border-clinic-teal px-5 py-2.5 text-sm font-semibold text-clinic-teal"
        >
          Call the Clinic
        </a>
      </div>

      {rxList.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Meri dawaiyan (prescription)</h2>
          <div className="mt-3 grid gap-3">
            {rxList.map((r, i) => (
              <div key={i} className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-clinic-ink/50">{fmt(r.prescribed_date)}</p>
                  <Link href={rxHref(r.id)} className="text-xs font-semibold text-clinic-teal hover:underline">
                    Print / PDF
                  </Link>
                </div>
                <ul className="mt-2 grid gap-2 text-sm">
                  {(r.items ?? []).map((it, j) => (
                    <li key={j}>
                      <span className="font-semibold text-clinic-ink">{it.name_en || it.name_ur}</span>
                      {it.potency ? <span className="text-clinic-teal"> {it.potency}</span> : null}
                      <span className="block text-xs text-clinic-ink/60">
                        {[it.dosage, it.frequency, it.duration].filter(Boolean).join(' · ')}
                        {it.instructions ? ` — ${it.instructions}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-clinic-ink/40">Dawa doctor ke bataye hisaab se hi lein. Sawal ho to clinic par raabta karein.</p>
        </section>
      )}

      <p className="mt-8 text-xs text-clinic-ink/40">
        Treatment ki tafseel ke liye clinic par raabta karein.
      </p>
    </Shell>
  )
}

function Box({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' }) {
  const cls =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-clinic-teal/10 bg-white text-clinic-ink'
  return (
    <div className={`rounded-2xl border p-3 ${cls}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 font-display font-semibold">{value}</p>
    </div>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-clinic-sand">
      <header className="border-b border-clinic-teal/10 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display font-semibold text-clinic-teal">
            {CLINIC.name}
          </Link>
          <span className="text-xs text-clinic-ink/40">{CLINIC.phone.display}</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  )
}

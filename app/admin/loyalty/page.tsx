import { createClient } from '@/lib/supabase/server'
import { getStaffProfile, isOwnerRole, requireAnyPerm } from '@/lib/auth'
import LoyaltyManager from '@/components/admin/LoyaltyManager'
import ScratchAdmin from '@/components/admin/ScratchAdmin'
import { todayKarachi } from '@/lib/karachi'

export const dynamic = 'force-dynamic'

export default async function LoyaltyPage() {
  await requireAnyPerm('patients.view')
  const me = await getStaffProfile()
  const owner = isOwnerRole(me.role)
  const sb = await createClient()
  const today = todayKarachi()

  const [prog, rewards, todayStamps, allStamps, ready, signups] = await Promise.all([
    sb.from('loyalty_program').select('*').eq('id', 1).maybeSingle(),
    sb.from('loyalty_rewards').select('*').order('stamps_required'),
    sb.from('loyalty_stamps').select('id, source, note, position, cycle, patients(id, full_name, mr_number)').eq('stamp_date', today).is('voided_at', null).order('created_at', { ascending: false }),
    sb.from('loyalty_stamps').select('patient_id, cycle, stamp_date, patients(id, full_name, mr_number)').is('voided_at', null).order('stamp_date', { ascending: false }).limit(2000),
    sb.from('loyalty_unlocks').select('id, title, kind, value, treatment_names, unlocked_at, expires_at, patients(id, full_name, mr_number)').is('redeemed_at', null).order('unlocked_at'),
    sb.from('loyalty_signups').select('id, full_name, phone, created_at').eq('status', 'pending').order('created_at'),
  ])

  if (prog.error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Loyalty</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">Supabase → SQL Editor mein naya SQL chalayein.</p>
        </div>
      </div>
    )
  }

  type P = { id: string; full_name: string; mr_number: string | null }
  const one = <T,>(x: T | T[] | null) => (Array.isArray(x) ? x[0] ?? null : x)
  const members = new Map<string, { id: string; name: string; mr: string | null; total: number; last: string }>()
  for (const r of (allStamps.data ?? []) as unknown as { patient_id: string; stamp_date: string; patients: P | P[] | null }[]) {
    const p = one(r.patients)
    if (!p) continue
    const m = members.get(r.patient_id) ?? { id: p.id, name: p.full_name, mr: p.mr_number, total: 0, last: r.stamp_date }
    m.total += 1
    members.set(r.patient_id, m)
  }

  const now = Date.now()
  const readyRows = ((ready.data ?? []) as unknown as { id: string; title: string; kind: string; value: number | null; treatment_names: string[]; expires_at: string | null; patients: P | P[] | null }[])
    .filter((u) => !u.expires_at || new Date(u.expires_at).getTime() > now)
    .map((u) => ({ id: u.id, title: u.title, kind: u.kind, value: u.value, treatments: u.treatment_names, expires_at: u.expires_at, patient: one(u.patients) }))

  // Scratch card (FINAL35 SQL na chali ho to ye hissa nahi dikhta, baqi page waise hi chalta hai)
  const [scrPrizes, scrCards, scrCfg] = await Promise.all([
    sb.from('scratch_prizes').select('id, title, kind, value, treatment_names, weight, is_active').order('created_at'),
    sb.from('scratch_cards').select('id, title, kind, value, treatment_names, card_date, expires_at, patients(id, full_name)').is('redeemed_at', null).neq('kind', 'none').order('created_at', { ascending: false }).limit(100),
    sb.from('site_settings').select('value').eq('key', 'scratch_cfg').maybeSingle(),
  ])
  const scratchOn = !scrPrizes.error && !scrCards.error
  const cfg = (scrCfg.data?.value ?? {}) as { enabled?: boolean; valid_days?: number }
  const scratchCards = ((scrCards.data ?? []) as unknown as { id: string; title: string; kind: string; value: number | null; treatment_names: string[]; card_date: string; expires_at: string | null; patients: P | P[] | null }[])
    .filter((c) => !c.expires_at || new Date(c.expires_at).getTime() > now)
    .map((c) => ({ id: c.id, title: c.title, kind: c.kind, value: c.value, treatment_names: c.treatment_names, card_date: c.card_date, expires_at: c.expires_at, patient: one(c.patients) }))

  return (
    <>
    <LoyaltyManager
      owner={owner}
      program={prog.data}
      rewards={rewards.data ?? []}
      today={((todayStamps.data ?? []) as unknown as { id: string; source: string; note: string | null; position: number; cycle: number; patients: P | P[] | null }[]).map((s) => ({ id: s.id, source: s.source, note: s.note, position: s.position, cycle: s.cycle, patient: one(s.patients) }))}
      members={[...members.values()].sort((a, b) => b.total - a.total)}
      ready={readyRows}
      signups={signups.data ?? []}
    />
    {scratchOn && (
      <ScratchAdmin
        owner={owner}
        enabled={cfg.enabled === true}
        days={Number(cfg.valid_days) || 30}
        prizes={(scrPrizes.data ?? []) as { id: string; title: string; kind: 'percent' | 'amount' | 'free' | 'none'; value: number | null; treatment_names: string[]; weight: number; is_active: boolean }[]}
        cards={scratchCards}
      />
    )}
    </>
  )
}

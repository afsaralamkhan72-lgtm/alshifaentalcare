import type { SupabaseClient } from '@supabase/supabase-js'

export interface ReadyReward { source: 'unlock' | 'scratch'; id: string; title: string; kind: string; value: number | null; treatments: string[]; expires_at: string | null }

/** Marez ke tayyar (diye nahi gaye, mudat na guzri) inaam: loyalty + scratch. Table na ho to khali. */
export async function getReadyRewards(sb: SupabaseClient, patientId: string): Promise<ReadyReward[]> {
  const [u, c] = await Promise.all([
    sb.from('loyalty_unlocks').select('id, title, kind, value, treatment_names, expires_at').eq('patient_id', patientId).is('redeemed_at', null),
    sb.from('scratch_cards').select('id, title, kind, value, treatment_names, expires_at').eq('patient_id', patientId).is('redeemed_at', null).neq('kind', 'none'),
  ])
  const now = Date.now()
  const map = (src: 'unlock' | 'scratch', rows: { id: string; title: string; kind: string; value: number | null; treatment_names: string[]; expires_at: string | null }[] | null): ReadyReward[] =>
    (rows ?? []).filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > now).map((r) => ({ source: src, id: r.id, title: r.title, kind: r.kind, value: r.value, treatments: r.treatment_names ?? [], expires_at: r.expires_at }))
  return [...(u.error ? [] : map('unlock', u.data)), ...(c.error ? [] : map('scratch', c.data))]
}

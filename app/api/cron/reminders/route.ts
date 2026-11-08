import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { fcmConfigured, sendFcm } from '@/lib/fcm'
import { CLINIC } from '@/clinic.config'
import { numFmt } from '@/lib/karachi'

export const dynamic = 'force-dynamic'

interface Cfg { enabled?: boolean; appt?: boolean; appt_days?: number; due?: boolean; due_min?: number; due_every_days?: number }

const karachiDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + 5 * 3600_000 + offsetDays * 86400_000)
  return d.toISOString().slice(0, 10)
}

/**
 * Roz subah (Vercel cron) chalta hai. Pehle band hota hai: doctor Settings > Notification se chalu karta hai.
 * CRON_SECRET Vercel mein set na ho to ye 401 deta hai.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? ''
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return NextResponse.json({ error: 'no' }, { status: 401 })
  const sb = createAdminClient()
  if (!sb) return NextResponse.json({ error: 'off' }, { status: 500 })
  if (!fcmConfigured()) return NextResponse.json({ skipped: 'firebase chaabi nahi' })

  const { data: row } = await sb.from('site_settings').select('value').eq('key', 'app_notify_cfg').maybeSingle()
  const cfg = (row?.value ?? {}) as Cfg
  if (!cfg.enabled) return NextResponse.json({ skipped: 'band hai' })

  let sent = 0
  let skipped = 0
  const dead: string[] = []

  async function notify(patientId: string, kind: string, ref: string, title: string, body: string, url: string) {
    const { data: toks } = await sb!.from('device_tokens').select('token').eq('patient_id', patientId).eq('kind', 'patient')
    if (!toks || toks.length === 0) return
    // pehle log likhein (unique): dobara chalne par dobara nahi jayega
    const ins = await sb!.from('notify_log').insert({ patient_id: patientId, kind, ref })
    if (ins.error) { skipped += 1; return }
    let any = false
    for (const t of toks as { token: string }[]) {
      const r = await sendFcm(t.token, title, body, url)
      if (r.ok) { any = true; sent += 1 }
      else if (r.dead) dead.push(t.token)
    }
    if (!any) await sb!.from('notify_log').update({ ok: false }).eq('patient_id', patientId).eq('kind', kind).eq('ref', ref)
  }

  if (cfg.appt !== false) {
    const days = Math.min(7, Math.max(1, Number(cfg.appt_days) || 1))
    const target = karachiDate(days)
    const { data: apps } = await sb.from('appointments').select('patient_id, preferred_date, preferred_time, treatment_name, patients(portal_code)').eq('preferred_date', target).eq('status', 'confirmed').is('deleted_at', null).not('patient_id', 'is', null)
    for (const a of (apps ?? []) as unknown as { patient_id: string; preferred_date: string; preferred_time: string | null; treatment_name: string | null; patients: { portal_code: string | null } | { portal_code: string | null }[] | null }[]) {
      const pc = Array.isArray(a.patients) ? a.patients[0]?.portal_code : a.patients?.portal_code
      await notify(a.patient_id, 'appt', `${a.preferred_date}`, `${days === 1 ? 'Kal' : 'Jald'} aap ki appointment hai`, `${CLINIC.name}: ${a.preferred_date}${a.preferred_time ? ' ' + a.preferred_time : ''}${a.treatment_name ? ' · ' + a.treatment_name : ''}`, pc ? `/portal/${pc}` : '/portal')
    }
  }

  if (cfg.due === true) {
    const min = Math.max(1, Number(cfg.due_min) || 1)
    const every = Math.min(60, Math.max(1, Number(cfg.due_every_days) || 7))
    const bucket = Math.floor(Date.parse(karachiDate()) / 86400_000 / every)
    const { data: bal } = await sb.from('patient_balances').select('patient_id, balance').gte('balance', min)
    for (const b of (bal ?? []) as { patient_id: string; balance: number }[]) {
      const { data: p } = await sb.from('patients').select('portal_code').eq('id', b.patient_id).is('deleted_at', null).maybeSingle()
      if (!p) continue
      await notify(b.patient_id, 'due', String(bucket), 'Hisaab ki yaad-dahani', `${CLINIC.name}: aap ka baqaya Rs. ${numFmt(Math.round(Number(b.balance)))} hai.`, p.portal_code ? `/portal/${p.portal_code}` : '/portal')
    }
  }

  if (dead.length) await sb.from('device_tokens').delete().in('token', dead)
  return NextResponse.json({ sent, skipped, removed: dead.length })
}

'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashToken, verifyPin } from '@/lib/staffPortal'

export type DeviceResult = { ok: boolean; code?: string; message: string }

async function ip(): Promise<string> {
  const h = await headers()
  return (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown'
}

async function deviceOk(key: string) {
  const db = createAdminClient()
  if (!db || !key || key.length < 20 || key.length > 80) return null
  const { data } = await db.from('attendance_rules').select('device_hash').eq('id', 1).maybeSingle()
  if (!data?.device_hash || data.device_hash !== hashToken(key)) return null
  return db
}

/** Staff ka PIN (wahi jo staff link ke saath banta hai) theek hai? Galat par lock. */
async function pinOk(db: NonNullable<Awaited<ReturnType<typeof deviceOk>>>, staffId: string, pin: string): Promise<DeviceResult | null> {
  if (!/^\d{6}$/.test(pin)) return { ok: false, message: 'PIN 6 number ka hota hai.' }
  const { data: acc } = await db
    .from('staff_portal_access')
    .select('pin_hash, locked_until, revoked_at')
    .eq('staff_id', staffId)
    .maybeSingle()
  if (!acc || acc.revoked_at) return { ok: false, message: 'Is staff ka PIN abhi nahi bana. Doctor sahab se Salary page par PIN banwayein.' }
  if (acc.locked_until && new Date(acc.locked_until).getTime() > Date.now()) {
    return { ok: false, message: 'Kuch ghalat koshishon ki wajah se ye PIN kuch der ke liye band hai.' }
  }
  if (!verifyPin(pin, acc.pin_hash)) {
    await db.rpc('staff_portal_fail', { p_staff_id: staffId, p_ip: await ip() })
    return { ok: false, message: 'PIN theek nahi hai.' }
  }
  await db.rpc('staff_portal_ok', { p_staff_id: staffId, p_ip: await ip() })
  return null
}

export async function deviceClock(
  key: string,
  staffId: string,
  pin: string,
  action: 'in' | 'out',
  lat: number | null,
  lng: number | null,
  reason: string
): Promise<DeviceResult> {
  const db = await deviceOk(key)
  if (!db) return { ok: false, message: 'Ye link ab kaam nahi karta. Doctor sahab se naya link lein.' }
  const bad = await pinOk(db, staffId, pin)
  if (bad) return bad
  const { data, error } = await db.rpc('staff_self_clock', {
    p_staff: staffId,
    p_action: action,
    p_lat: lat,
    p_lng: lng,
    p_reason: reason.slice(0, 200) || null,
    p_source: 'device',
  })
  if (error || !data) return { ok: false, message: 'Hazri nahi lag saki. Dobara koshish karein.' }
  return data as DeviceResult
}

export async function deviceRequest(
  key: string,
  staffId: string,
  pin: string,
  kind: 'in' | 'out',
  reason: string
): Promise<DeviceResult> {
  const db = await deviceOk(key)
  if (!db) return { ok: false, message: 'Ye link ab kaam nahi karta.' }
  const bad = await pinOk(db, staffId, pin)
  if (bad) return bad
  const { data, error } = await db.rpc('staff_attendance_request', { p_staff: staffId, p_kind: kind, p_reason: reason.slice(0, 200) })
  if (error || !data) return { ok: false, message: 'Darkhwast nahi ja saki.' }
  return data as DeviceResult
}

'use server'

import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  STAFF_COOKIE,
  SESSION_MINUTES,
  hashToken,
  verifyPin,
  makeSession,
  readSession,
} from '@/lib/staffPortal'

async function clientIp(): Promise<string> {
  const h = await headers()
  return (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown'
}

export type LoginResult = { ok: true } | { ok: false; message: string }

export async function staffLogin(token: string, pin: string): Promise<LoginResult> {
  const generic = { ok: false as const, message: 'Link ya PIN theek nahi hai.' }
  const db = createAdminClient()
  if (!db) return { ok: false, message: 'Portal abhi setup nahi hua.' }
  if (!token || token.length < 20 || token.length > 80 || !/^\d{6}$/.test(pin)) return generic

  const { data: acc } = await db
    .from('staff_portal_access')
    .select('staff_id, pin_hash, locked_until, revoked_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle()
  if (!acc || acc.revoked_at) return generic

  const ip = await clientIp()
  if (acc.locked_until && new Date(acc.locked_until).getTime() > Date.now()) {
    return { ok: false, message: 'Kuch ghalat koshishon ki wajah se link kuch der ke liye band hai. Baad mein try karein.' }
  }

  const { data: member } = await db.from('staff_members').select('is_active').eq('id', acc.staff_id).maybeSingle()
  if (!member?.is_active) return generic

  if (!verifyPin(pin, acc.pin_hash)) {
    await db.rpc('staff_portal_fail', { p_staff_id: acc.staff_id, p_ip: ip })
    return generic
  }

  await db.rpc('staff_portal_ok', { p_staff_id: acc.staff_id, p_ip: ip })
  const jar = await cookies()
  jar.set(STAFF_COOKIE, makeSession(acc.staff_id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/staff',
    maxAge: SESSION_MINUTES * 60,
  })
  return { ok: true }
}

export async function staffLogout(token: string) {
  const jar = await cookies()
  jar.delete({ name: STAFF_COOKIE, path: '/staff' })
  revalidatePath(`/staff/${token}`)
}

/** "Mujhe mil gaye": sirf apni advance/payout entry par, sirf aik baar */
export async function staffAcknowledge(token: string, entryId: string): Promise<boolean> {
  const jar = await cookies()
  const staffId = readSession(jar.get(STAFF_COOKIE)?.value)
  const db = createAdminClient()
  if (!staffId || !db) return false

  // Cookie isi link ke staff ki honi chahiye (link revoke ho chuka ho to bhi band)
  const { data: acc } = await db
    .from('staff_portal_access')
    .select('staff_id, revoked_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle()
  if (!acc || acc.revoked_at || acc.staff_id !== staffId) return false

  const { data } = await db.rpc('staff_acknowledge', {
    p_staff_id: staffId,
    p_entry_id: entryId,
    p_ip: await clientIp(),
  })
  revalidatePath(`/staff/${token}`)
  return data === true
}

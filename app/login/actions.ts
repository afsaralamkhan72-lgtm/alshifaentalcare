'use server'

import crypto from 'crypto'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const GENERIC = 'Email ya password ghalat hai.'
const MAX_PAIR = 5
const MAX_IP = 20
const LOCK_MINUTES = 15

async function clientIp(): Promise<string> {
  const h = await headers()
  return (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown'
}

const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 32)

/**
 * Login: 5 ghalat koshish (aik hi IP + email) ke baad 15 minute band. Band hone par bhi wohi aam
 * "ghalat hai" wala jawab aata hai (waqt ya ginti kabhi nahi batate), aur is dauran sahi password bhi qabool nahi.
 * Agar guard (SQL ya service key) maujood na ho to login pehle ki tarah chalta hai, kabhi band nahi hota.
 */
export async function loginAction(emailRaw: string, password: string): Promise<{ ok: boolean; message: string }> {
  const email = String(emailRaw ?? '').trim().toLowerCase()
  if (!email || !password || email.length > 254 || password.length > 200) return { ok: false, message: GENERIC }
  const ip = await clientIp()
  const kPair = 'ei:' + hash(ip + '|' + email)
  const kIp = 'i:' + hash(ip)
  const guard = createAdminClient()

  let guardOn = Boolean(guard)
  if (guard) {
    const { data, error } = await guard.rpc('login_guard_check', { p_keys: [kPair, kIp] })
    if (error) guardOn = false
    else if (data === true) return { ok: false, message: GENERIC }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    if (guard && guardOn) {
      await guard.rpc('login_guard_fail', { p_k: kPair, p_max: MAX_PAIR, p_minutes: LOCK_MINUTES })
      await guard.rpc('login_guard_fail', { p_k: kIp, p_max: MAX_IP, p_minutes: LOCK_MINUTES })
    }
    return { ok: false, message: GENERIC }
  }
  if (guard && guardOn) await guard.rpc('login_guard_ok', { p_k: kPair })

  const { data: profile } = await supabase.from('staff_profiles').select('is_active').eq('id', data.user.id).single()
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut()
    return { ok: false, message: 'Aap ke account ko staff access nahi mila. Admin se raabta karein.' }
  }
  return { ok: true, message: '' }
}

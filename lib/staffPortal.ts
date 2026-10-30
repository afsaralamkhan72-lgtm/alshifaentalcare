import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'

/** Staff portal ki security: token (link), alag PIN, aur chhoti muddat ka signed cookie. */

export const STAFF_COOKIE = 'staff_session'
export const SESSION_MINUTES = 30

export function newToken(): string {
  return randomBytes(24).toString('base64url') // 192-bit, andaza lagana namumkin
}

export function newPin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16)
  const h = scryptSync(pin, salt, 32)
  return `s1$${salt.toString('base64')}$${h.toString('base64')}`
}

export function verifyPin(pin: string, stored: string): boolean {
  const [v, saltB64, hashB64] = stored.split('$')
  if (v !== 's1' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = scryptSync(pin, Buffer.from(saltB64, 'base64'), expected.length)
  return timingSafeEqual(actual, expected)
}

function secret(): string {
  return (
    process.env.STAFF_PORTAL_SECRET ||
    createHash('sha256')
      .update(`staff-portal:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`)
      .digest('hex')
  )
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

/** Cookie value: staffId.expiryMs.signature */
export function makeSession(staffId: string): string {
  const exp = Date.now() + SESSION_MINUTES * 60_000
  const payload = `${staffId}.${exp}`
  return `${payload}.${sign(payload)}`
}

/** Sahi aur expire na hui session ho to staffId wapas, warna null */
export function readSession(value: string | undefined | null): string | null {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 3) return null
  const [staffId, exp, sig] = parts
  const expected = sign(`${staffId}.${exp}`)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  if (!Number.isFinite(Number(exp)) || Number(exp) < Date.now()) return null
  return staffId
}

import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

/** QR-link ka pehre-daar: token sahi/na-expire hona, phone ke aakhri 4 hindse, galat koshishon ka lock. */

export type ShareState =
  | { s: 'missing' }
  | { s: 'expired' }
  | { s: 'locked'; until: string }
  | { s: 'gate'; patientId: string }
  | { s: 'ok'; patientId: string; patient: { id: string; full_name: string; mr_number: string | null; phone: string; department: string }; prescriptionId: string | null }

function secret(): string {
  return (
    process.env.STAFF_PORTAL_SECRET ||
    createHash('sha256').update(`share-gate:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`).digest('hex')
  )
}
function sign(p: string) {
  return createHmac('sha256', secret()).update(p).digest('base64url')
}
export const cookieName = (token: string) => `sg_${token.slice(0, 12)}`

export function makeGateCookie(token: string, expMs: number): string {
  const p = `${token}.${expMs}`
  return `${p}.${sign(p)}`
}
function readGateCookie(token: string, v: string | undefined): boolean {
  if (!v) return false
  const [t, exp, sig] = v.split('.')
  if (t !== token || !exp || !sig) return false
  if (!(Number(exp) > Date.now())) return false
  const a = Buffer.from(sig)
  const b = Buffer.from(sign(`${t}.${exp}`))
  return a.length === b.length && timingSafeEqual(a, b)
}

export const validToken = (t: string) => /^[0-9a-f]{64}$/i.test(t)

export async function loadShare(token: string): Promise<ShareState> {
  if (!validToken(token)) return { s: 'missing' }
  const sb = createAdminClient()
  if (!sb) return { s: 'missing' }
  const { data: link } = await sb
    .from('share_links')
    .select('patient_id, prescription_id, expires_at, revoked_at, locked_until')
    .eq('token', token.toLowerCase())
    .maybeSingle()
  if (!link) return { s: 'missing' }
  if (link.revoked_at || new Date(link.expires_at).getTime() <= Date.now()) return { s: 'expired' }
  if (link.locked_until && new Date(link.locked_until).getTime() > Date.now()) return { s: 'locked', until: link.locked_until }
  const { data: patient } = await sb
    .from('patients')
    .select('id, full_name, mr_number, phone, department')
    .eq('id', link.patient_id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!patient) return { s: 'missing' }
  const { data: cfg } = await sb.from('site_settings').select('value').eq('key', 'share_cfg').maybeSingle()
  const need = (cfg?.value as { require_last4?: boolean } | null)?.require_last4 !== false
  const jar = await cookies()
  const authed = !need || readGateCookie(token.toLowerCase(), jar.get(cookieName(token.toLowerCase()))?.value)
  if (!authed) return { s: 'gate', patientId: patient.id }
  return { s: 'ok', patientId: patient.id, patient, prescriptionId: link.prescription_id }
}

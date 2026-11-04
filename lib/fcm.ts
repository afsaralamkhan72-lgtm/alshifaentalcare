import 'server-only'
import { createSign } from 'node:crypto'

/**
 * Firebase (FCM) ko khabar bhejna. Chaabi Vercel mein FIREBASE_SERVICE_ACCOUNT (poori JSON) ke naam se rakhi jati hai.
 * Chaabi na ho to kuch nahi bheja jata aur kuch toot-ta nahi.
 */
interface Acct { project_id: string; client_email: string; private_key: string }

function acct(): Acct | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  try {
    const a = JSON.parse(raw) as Acct
    return a.project_id && a.client_email && a.private_key ? a : null
  } catch {
    return null
  }
}
export const fcmConfigured = () => acct() !== null

const b64 = (x: string | Buffer) => Buffer.from(x).toString('base64url')
let cache: { token: string; exp: number } | null = null

async function accessToken(a: Acct): Promise<string | null> {
  if (cache && cache.exp > Date.now() + 60_000) return cache.token
  const now = Math.floor(Date.now() / 1000)
  const head = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64(JSON.stringify({ iss: a.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(a.private_key).toString('base64url')
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }),
  })
  if (!r.ok) return null
  const j = (await r.json()) as { access_token?: string; expires_in?: number }
  if (!j.access_token) return null
  cache = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 }
  return j.access_token
}

export type FcmResult = { ok: boolean; dead: boolean }

/** Aik phone ko notification. dead=true matlab ye token ab kaam ka nahi (app hata di gayi), isay hata dein. */
export async function sendFcm(token: string, title: string, body: string, url = '/'): Promise<FcmResult> {
  const a = acct()
  if (!a) return { ok: false, dead: false }
  const at = await accessToken(a)
  if (!at) return { ok: false, dead: false }
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { token, notification: { title, body }, data: { url }, android: { priority: 'HIGH' } } }),
  })
  if (r.ok) return { ok: true, dead: false }
  const txt = await r.text().catch(() => '')
  return { ok: false, dead: r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(txt) }
}

import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

/** VAPID chaabiyan pehli baar khud ban kar database (push_keys) mein mehfooz hoti hain. */
export async function pushKeys() {
  const sb = createAdminClient()
  if (!sb) return null
  const { data } = await sb.from('push_keys').select('secret, vapid_public, vapid_private').eq('id', 1).maybeSingle()
  if (!data) return null
  if (data.vapid_public && data.vapid_private) return { sb, secret: data.secret as string, pub: data.vapid_public as string, priv: data.vapid_private as string }
  const k = webpush.generateVAPIDKeys()
  await sb.from('push_keys').update({ vapid_public: k.publicKey, vapid_private: k.privateKey }).eq('id', 1).is('vapid_public', null)
  const { data: again } = await sb.from('push_keys').select('secret, vapid_public, vapid_private').eq('id', 1).maybeSingle()
  if (!again?.vapid_public) return null
  return { sb, secret: again.secret as string, pub: again.vapid_public as string, priv: again.vapid_private as string }
}

export async function sendToAll(title: string, body: string, url = '/admin/dashboard') {
  const k = await pushKeys()
  if (!k) return { sent: 0, removed: 0 }
  webpush.setVapidDetails('mailto:noreply@alshifahomeoanddentalcare.com', k.pub, k.priv)
  const { data: subs } = await k.sb.from('push_subs').select('endpoint, p256dh, auth')
  let sent = 0
  let removed = 0
  for (const s of (subs ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url }), { TTL: 3600 })
      sent += 1
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        await k.sb.from('push_subs').delete().eq('endpoint', s.endpoint)
        removed += 1
      }
    }
  }
  return { sent, removed }
}

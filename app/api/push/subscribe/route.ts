import { NextResponse } from 'next/server'
import { getStaffProfile, isOwnerRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const me = await getStaffProfile().catch(() => null)
  if (!me || !isOwnerRole(me.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const b = (await req.json().catch(() => null)) as { endpoint?: string; keys?: { p256dh?: string; auth?: string }; off?: boolean } | null
  const sb = createAdminClient()
  if (!b?.endpoint || !sb) return NextResponse.json({ error: 'bad' }, { status: 400 })
  if (b.off) {
    await sb.from('push_subs').delete().eq('endpoint', b.endpoint)
    return NextResponse.json({ ok: true })
  }
  if (!b.keys?.p256dh || !b.keys?.auth || !/^https:\/\//.test(b.endpoint)) return NextResponse.json({ error: 'bad' }, { status: 400 })
  const { error } = await sb.from('push_subs').upsert({ endpoint: b.endpoint, p256dh: b.keys.p256dh, auth: b.keys.auth, staff_id: me.id })
  if (error) return NextResponse.json({ error: 'db' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

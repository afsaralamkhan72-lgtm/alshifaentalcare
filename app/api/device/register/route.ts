import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** App phone ka notification token yahan bhejti hai. Patient: portal code se pehchan. Staff: login se. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { token?: unknown; kind?: unknown; code?: unknown } | null
  const token = typeof b?.token === 'string' ? b.token : ''
  if (token.length < 50 || token.length > 4096) return NextResponse.json({ error: 'bad' }, { status: 400 })
  const sb = createAdminClient()
  if (!sb) return NextResponse.json({ error: 'off' }, { status: 500 })

  if (b?.kind === 'staff') {
    const me = await getStaffProfile().catch(() => null)
    if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const { error } = await sb.from('device_tokens').upsert({ token, kind: 'staff', staff_id: me.id, patient_id: null, last_seen: new Date().toISOString() }, { onConflict: 'token' })
    return error ? NextResponse.json({ error: 'db' }, { status: 500 }) : NextResponse.json({ ok: true })
  }

  const code = typeof b?.code === 'string' ? b.code.trim().toLowerCase() : ''
  if (!/^[a-z0-9-]{3,60}$/.test(code)) return NextResponse.json({ error: 'bad' }, { status: 400 })
  const { data: p } = await sb.from('patients').select('id').eq('portal_code', code).is('deleted_at', null).maybeSingle()
  if (!p) return NextResponse.json({ error: 'no' }, { status: 404 })
  const { error } = await sb.from('device_tokens').upsert({ token, kind: 'patient', patient_id: p.id, staff_id: null, last_seen: new Date().toISOString() }, { onConflict: 'token' })
  return error ? NextResponse.json({ error: 'db' }, { status: 500 }) : NextResponse.json({ ok: true })
}

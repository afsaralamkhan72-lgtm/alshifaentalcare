import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { pushKeys, sendToAll } from '@/lib/push'
import { numFmt } from '@/lib/karachi'

export const dynamic = 'force-dynamic'

/** Database ka trigger yahan khabar deta hai (chaabi ke saath). Chaabi ghalat ho to kuch nahi hota. */
export async function POST(req: Request) {
  const k = await pushKeys()
  const given = req.headers.get('x-push-secret') ?? ''
  if (!k || given.length !== k.secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(k.secret))) return NextResponse.json({ error: 'no' }, { status: 401 })
  const b = (await req.json().catch(() => null)) as { amount?: number; patient_id?: string } | null
  const amount = Number(b?.amount)
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'bad' }, { status: 400 })
  let name = ''
  if (b?.patient_id && /^[0-9a-f-]{36}$/i.test(b.patient_id)) {
    const sb = createAdminClient()
    const { data } = await sb?.from('patients').select('full_name').eq('id', b.patient_id).maybeSingle() ?? { data: null }
    name = data?.full_name ?? ''
  }
  const r = await sendToAll(`Rs. ${numFmt(amount)} mile`, name ? `${name} se payment mili` : 'Nayi payment mili', '/admin/dashboard')
  return NextResponse.json(r)
}

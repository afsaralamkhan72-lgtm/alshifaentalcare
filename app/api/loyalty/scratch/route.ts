import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/loyaltyPublic'

export const dynamic = 'force-dynamic'
const COOKIE = 'as_loyalty'

/** Patient apne phone (cookie se pehchan) ka aaj ka scratch card. Inaam server tay karta hai, client nahi. */
export async function POST(req: NextRequest) {
  const sb = createAdminClient()
  const tok = req.cookies.get(COOKIE)?.value
  if (!sb || !tok) return NextResponse.json({ status: 'off' }, { headers: { 'Cache-Control': 'no-store' } })
  let body: { peek?: unknown } = {}
  try { body = await req.json() } catch { /* khali */ }
  const { data: pid } = await sb.rpc('loyalty_device_lookup', { p_hash: hashToken(tok) })
  if (!pid) return NextResponse.json({ status: 'off' }, { headers: { 'Cache-Control': 'no-store' } })
  const { data, error } = await sb.rpc('scratch_play', { p_patient: pid, p_peek: body.peek === true })
  if (error || !data) return NextResponse.json({ status: 'off' }, { headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

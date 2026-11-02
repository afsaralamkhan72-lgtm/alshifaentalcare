import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { scan } from '@/lib/loyaltyPublic'

export const dynamic = 'force-dynamic'
const COOKIE = 'as_loyalty'

export async function POST(req: NextRequest) {
  const sb = createAdminClient()
  if (!sb) return NextResponse.json({ status: 'error' }, { status: 500 })
  let body: { name?: unknown; phone?: unknown } = {}
  try { body = await req.json() } catch { /* khali */ }
  const ip = (req.headers.get('x-forwarded-for') ?? 'x').split(',')[0].trim() || 'x'
  const r = await scan(sb, {
    ip,
    name: typeof body.name === 'string' ? body.name.slice(0, 120) : '',
    phone: typeof body.phone === 'string' ? body.phone.slice(0, 30) : '',
    token: req.cookies.get(COOKIE)?.value ?? null,
  })
  const res = NextResponse.json(r.out, { headers: { 'Cache-Control': 'no-store' } })
  if (r.newToken) {
    res.cookies.set(COOKIE, r.newToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 400, path: '/' })
  }
  return res
}

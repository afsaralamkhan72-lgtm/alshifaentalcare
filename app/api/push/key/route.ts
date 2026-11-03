import { NextResponse } from 'next/server'
import { getStaffProfile, isOwnerRole } from '@/lib/auth'
import { pushKeys } from '@/lib/push'

export const dynamic = 'force-dynamic'

/** Sirf login doctor/admin ko public chaabi milti hai */
export async function GET() {
  const me = await getStaffProfile().catch(() => null)
  if (!me || !isOwnerRole(me.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const k = await pushKeys()
  if (!k) return NextResponse.json({ error: 'setup' }, { status: 503 })
  return NextResponse.json({ key: k.pub })
}

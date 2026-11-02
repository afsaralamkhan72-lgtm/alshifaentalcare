import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffProfile, isOwnerRole, can } from '@/lib/auth'
import { buildStatement } from '@/lib/statementData'

export const dynamic = 'force-dynamic'

/** Statement ka message, bhejte waqt ke naye hisaab se. Sirf paisa dekhne ki ijazat wale staff. */
export async function GET(req: Request) {
  const me = await getStaffProfile().catch(() => null)
  if (!me || !(isOwnerRole(me.role) || (await can('billing.view')))) return NextResponse.json({ error: 'Is ki ijazat nahi' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('patient')
  if (!id) return NextResponse.json({ error: 'Patient nahi mila' }, { status: 400 })
  const out = await buildStatement(await createClient(), id)
  if (!out) return NextResponse.json({ error: 'Patient nahi mila' }, { status: 404 })
  return NextResponse.json(out)
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffProfile, isOwnerRole, can } from '@/lib/auth'
import { buildReceipt } from '@/lib/statementData'

export const dynamic = 'force-dynamic'

/** Payment ki rasid ka message. Baqaya naye sire se database se aata hai. */
export async function GET(req: Request) {
  const me = await getStaffProfile().catch(() => null)
  if (!me || !(isOwnerRole(me.role) || (await can('billing.view')))) return NextResponse.json({ error: 'Is ki ijazat nahi' }, { status: 403 })
  const q = new URL(req.url).searchParams
  const id = q.get('patient')
  const amount = Number(q.get('amount'))
  if (!id || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Rakam ya patient ghalat hai' }, { status: 400 })
  const date = q.get('date')
  const out = await buildReceipt(await createClient(), id, {
    amount,
    method: q.get('method'),
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    justPaid: q.get('fresh') === '1',
  })
  if (!out) return NextResponse.json({ error: 'Patient nahi mila' }, { status: 404 })
  return NextResponse.json(out)
}

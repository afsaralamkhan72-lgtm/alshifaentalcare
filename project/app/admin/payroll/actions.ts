'use server'

import { revalidatePath } from 'next/cache'
import { requireOwner } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { newToken, newPin, hashToken, hashPin } from '@/lib/staffPortal'

export type IssueResult =
  | { ok: true; token: string; pin: string }
  | { ok: false; message: string }

/**
 * Staff ke liye naya link + PIN banata hai (purana khud band ho jata hai).
 * Link aur PIN sirf ISI waqt dikhte hain; database mein sirf hash rehta hai.
 */
export async function issueStaffPortal(staffId: string): Promise<IssueResult> {
  const me = await requireOwner()
  const db = createAdminClient()
  if (!db) return { ok: false, message: 'SUPABASE_SERVICE_ROLE_KEY set nahi hai.' }

  const { data: member } = await db.from('staff_members').select('id, is_active').eq('id', staffId).maybeSingle()
  if (!member || !member.is_active) return { ok: false, message: 'Staff nahi mila ya band hai.' }

  const token = newToken()
  const pin = newPin()
  const { error } = await db.from('staff_portal_access').upsert(
    {
      staff_id: staffId,
      token_hash: hashToken(token),
      pin_hash: hashPin(pin),
      failed_attempts: 0,
      locked_until: null,
      revoked_at: null,
      issued_by: me.id,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'staff_id' }
  )
  if (error) return { ok: false, message: 'Link nahi ban saka. Kya phase7 SQL chali thi?' }

  await db.from('staff_portal_log').insert({ staff_id: staffId, event: 'issued', detail: `by ${me.full_name}` })
  revalidatePath('/admin/payroll')
  return { ok: true, token, pin }
}

export async function revokeStaffPortal(staffId: string): Promise<{ ok: boolean }> {
  const me = await requireOwner()
  const db = createAdminClient()
  if (!db) return { ok: false }
  const { error } = await db
    .from('staff_portal_access')
    .update({ revoked_at: new Date().toISOString() })
    .eq('staff_id', staffId)
  if (error) return { ok: false }
  await db.from('staff_portal_log').insert({ staff_id: staffId, event: 'revoked', detail: `by ${me.full_name}` })
  revalidatePath('/admin/payroll')
  return { ok: true }
}

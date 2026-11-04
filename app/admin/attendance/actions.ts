'use server'

import { revalidatePath } from 'next/cache'
import { requireOwner } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { newToken, hashToken } from '@/lib/staffPortal'

export type DeviceLinkResult = { ok: true; token: string } | { ok: false; message: string }

/**
 * Clinic ke phone / tablet ka hazri link. Naya banate hi purana link band ho jata hai.
 * Link sirf isi waqt dikhta hai; database mein sirf hash rehta hai.
 */
export async function issueDeviceLink(): Promise<DeviceLinkResult> {
  await requireOwner()
  const db = createAdminClient()
  if (!db) return { ok: false, message: 'SUPABASE_SERVICE_ROLE_KEY set nahi hai.' }
  const token = newToken()
  const { error } = await db.from('attendance_rules').update({ device_hash: hashToken(token) }).eq('id', 1)
  if (error) return { ok: false, message: 'Link nahi ban saka. Kya FINAL45 SQL chali thi?' }
  revalidatePath('/admin/attendance')
  return { ok: true, token }
}

export async function revokeDeviceLink(): Promise<{ ok: boolean }> {
  await requireOwner()
  const db = createAdminClient()
  if (!db) return { ok: false }
  const { error } = await db.from('attendance_rules').update({ device_hash: null }).eq('id', 1)
  revalidatePath('/admin/attendance')
  return { ok: !error }
}

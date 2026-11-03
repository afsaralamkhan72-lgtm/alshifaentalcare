'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookieName, makeGateCookie, validToken } from '@/lib/shareGate'

/** Phone ke aakhri 4 hindse jaanchna. 5 galat koshishon par 15 minute ka lock (database mein). */
export async function checkLast4(token: string, formData: FormData) {
  const back = `/r/${token}`
  if (!validToken(token)) redirect(back)
  const sb = createAdminClient()
  if (!sb) redirect(back)
  const t = token.toLowerCase()
  const { data: link } = await sb.from('share_links').select('patient_id, expires_at, revoked_at, locked_until').eq('token', t).maybeSingle()
  if (!link || link.revoked_at || new Date(link.expires_at).getTime() <= Date.now()) redirect(back)
  if (link.locked_until && new Date(link.locked_until).getTime() > Date.now()) redirect(back)
  const { data: p } = await sb.from('patients').select('phone').eq('id', link.patient_id).maybeSingle()
  const phone = String(p?.phone ?? '').replace(/\D/g, '')
  const given = String(formData.get('last4') ?? '').replace(/\D/g, '')
  if (given.length === 4 && phone.length >= 4 && phone.slice(-4) === given) {
    await sb.rpc('share_ok', { p_token: t })
    const jar = await cookies()
    jar.set(cookieName(t), makeGateCookie(t, new Date(link.expires_at).getTime()), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/r',
      expires: new Date(link.expires_at),
    })
    redirect(back)
  }
  await sb.rpc('share_fail', { p_token: t })
  redirect(`${back}?e=1`)
}

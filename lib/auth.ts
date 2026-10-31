import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface StaffProfile {
  id: string
  full_name: string
  role: 'admin' | 'doctor' | 'receptionist'
  phone: string | null
  is_active: boolean
}

interface Me extends StaffProfile {
  perms: string[]
}

/**
 * Login wala staff + us ki permissions: AIK database call, aur aik request (page render) mein
 * sirf aik dafa (React cache). Pehle har page par layout + page milkar 6-10 calls karte the.
 * middleware.ts pehle hi login check kar chuka hota hai; database (RLS) phir bhi har cheez khud check karta hai.
 */
const getMe = cache(async (): Promise<Me | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('my_staff')
  if (!error) return (data as Me | null) ?? null

  // Purana database (my_staff abhi nahi bana): purana tareeqa
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const [{ data: profile }, { data: perms }] = await Promise.all([
    supabase.from('staff_profiles').select('id, full_name, role, phone, is_active').eq('id', user.id).maybeSingle(),
    supabase.rpc('my_permissions'),
  ])
  if (!profile) return null
  return { ...(profile as StaffProfile), perms: Array.isArray(perms) ? (perms as string[]) : [] }
})

/**
 * Login wala active staff. Na ho (ya band ho) to /login.
 */
export async function getStaffProfile(): Promise<StaffProfile> {
  const me = await getMe()
  if (!me || !me.is_active) redirect('/login')
  const { perms: _p, ...profile } = me
  void _p
  return profile
}

/** Owner = admin ya doctor. Paison wale pages sirf inhi ke liye (reception ko nahi). */
export function isOwnerRole(role: StaffProfile['role']): boolean {
  return role === 'admin' || role === 'doctor'
}

/** Billing / invoice / baqaya jaise pages: reception ko /admin/dashboard par wapas bhej do */
export async function requireOwner(): Promise<StaffProfile> {
  const profile = await getStaffProfile()
  if (!isOwnerRole(profile.role)) redirect('/admin/dashboard')
  return profile
}

/** Use on pages that only role=admin should reach (e.g. Edit Website / CMS) */
export async function requireAdmin(): Promise<StaffProfile> {
  const profile = await getStaffProfile()
  if (profile.role !== 'admin') redirect('/admin/dashboard')
  return profile
}

/**
 * Is staff member ki saari permissions. Admin/doctor ko sab milti hain, receptionist ko sirf
 * jo Staff page par tick ki gayi hon. DB ke RLS rules yehi check karte hain; ye sirf screen ke liye hai.
 */
export async function getPermissions(): Promise<string[]> {
  const me = await getMe()
  return me?.is_active ? me.perms : []
}

export async function can(code: string): Promise<boolean> {
  return (await getPermissions()).includes(code)
}

/** Page ke shuru mein: permission na ho to dashboard par wapas */
export async function requirePerm(code: string): Promise<StaffProfile> {
  const profile = await getStaffProfile()
  if (!(await getPermissions()).includes(code)) redirect('/admin/dashboard')
  return profile
}

/** Owner (admin/doctor) ko hamesha; baqi staff ko in mein se koi aik permission ho to page khule */
export async function requireAnyPerm(...codes: string[]): Promise<StaffProfile> {
  const profile = await getStaffProfile()
  if (isOwnerRole(profile.role)) return profile
  const perms = await getPermissions()
  if (!codes.some((c) => perms.includes(c))) redirect('/admin/dashboard')
  return profile
}

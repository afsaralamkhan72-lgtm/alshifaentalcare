import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface StaffProfile {
  id: string
  full_name: string
  role: 'admin' | 'doctor' | 'receptionist'
  phone: string | null
  is_active: boolean
}

/**
 * Fetches the logged-in staff profile. Redirects to /login if not
 * authenticated or not a recognized/active staff member.
 * middleware.ts already blocks unauthenticated access to /admin/*,
 * this is the second layer that also confirms a valid staff_profiles row.
 */
export async function getStaffProfile(): Promise<StaffProfile> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('id, full_name, role, phone, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) redirect('/login')

  return profile as StaffProfile
}

/** Use on pages that only role=admin should reach (e.g. Edit Website / CMS) */
export async function requireAdmin(): Promise<StaffProfile> {
  const profile = await getStaffProfile()
  if (profile.role !== 'admin') redirect('/admin/dashboard')
  return profile
}

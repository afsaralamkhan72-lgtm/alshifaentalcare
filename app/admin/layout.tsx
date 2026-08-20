import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/admin/Sidebar'
import LogoutButton from '@/components/admin/LogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('full_name, role, is_active')
    .eq('id', user.id)
    .single()

  // Defense-in-depth: middleware already blocks unauthenticated users,
  // this also blocks authenticated users who aren't (or are no longer) active staff.
  if (!profile || !profile.is_active) redirect('/login')

  return (
    <div className="flex min-h-screen bg-clinic-sand">
      <Sidebar role={profile.role as 'admin' | 'doctor' | 'receptionist'} />

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-clinic-teal/10 bg-white px-6 py-4 pl-20 lg:pl-6">
          <div>
            <p className="text-sm text-clinic-ink/50">Welcome back,</p>
            <p className="font-display font-semibold text-clinic-ink">{profile.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-clinic-mint px-3 py-1 text-xs font-semibold capitalize text-clinic-teal">
              {profile.role}
            </span>
            <LogoutButton />
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}

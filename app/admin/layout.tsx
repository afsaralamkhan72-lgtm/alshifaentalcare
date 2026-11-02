import Sidebar from '@/components/admin/Sidebar'
import LogoutButton from '@/components/admin/LogoutButton'
import AssistantBar from '@/components/admin/AssistantBar'
import ReceiptHost from '@/components/admin/ReceiptHost'
import { getPermissions, getStaffProfile } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Staff + permissions: aik call (page bhi yahi cached natija istemal karta hai)
  const [profile, perms] = await Promise.all([getStaffProfile(), getPermissions()])

  return (
    <div className="admin-shell flex min-h-screen bg-clinic-sand">
      <Sidebar role={profile.role as 'admin' | 'doctor' | 'receptionist'} perms={perms} />

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-clinic-teal/10 bg-white px-4 py-3 pl-20 sm:px-6 lg:pl-6">
          <div>
            <p className="text-sm text-clinic-ink/50">Assalam o Alaikum,</p>
            <p className="font-display font-semibold text-clinic-ink">{profile.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            {profile.role !== 'receptionist' && <AssistantBar />}
            <span className="hidden rounded-full bg-clinic-mint px-3 py-1 text-xs font-semibold capitalize text-clinic-teal sm:inline">
              {profile.role}
            </span>
            <LogoutButton />
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
        {(perms.includes('billing.view') || profile.role !== 'receptionist') && <ReceiptHost />}
      </div>
    </div>
  )
}

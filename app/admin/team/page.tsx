import Link from 'next/link'
import { getStaffProfile, isOwnerRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

/** Staff: Hazri, Salary aur Staff ke accounts/permissions, aik jagah se. */
export default async function TeamPage() {
  const staff = await getStaffProfile()
  if (!isOwnerRole(staff.role)) redirect('/admin/dashboard?denied=1')
  const links = [
    { href: '/admin/attendance', l: 'Hazri', d: 'Aaj kaun aaya, mahine ki hazri, clinic band din', show: true },
    { href: '/admin/payroll', l: 'Salary', d: 'Tankhwa, advance, salary slip', show: true },
    { href: '/admin/staff', l: 'Staff aur Permissions', d: 'Naya staff, password, kaun kya dekh sakta hai', show: staff.role === 'admin' },
  ].filter((x) => x.show)
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Staff</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">Hazri se salary banti hai, is liye teeno yahan aik sath hain.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((x) => (
          <Link key={x.href} href={x.href} className="rounded-2xl border border-clinic-teal/15 bg-white p-5 transition-colors hover:border-clinic-teal">
            <p className="font-display text-lg font-semibold text-clinic-teal">{x.l} →</p>
            <p className="mt-1 text-sm text-clinic-ink/60">{x.d}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

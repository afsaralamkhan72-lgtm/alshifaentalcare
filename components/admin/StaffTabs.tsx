'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/attendance', label: 'Aaj aur Hazri', match: ['/admin/attendance', '/admin/team'] },
  { href: '/admin/payroll', label: 'Salary', match: ['/admin/payroll'] },
  { href: '/admin/staff', label: 'Log aur Permissions', match: ['/admin/staff'], adminOnly: true },
]

/** Staff ke teeno hisse (hazri, salary, log) aik jagah: har page ke upar yehi patti. */
export default function StaffTabs({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname() ?? ''
  return (
    <nav aria-label="Staff" className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => {
        const on = t.match.some((m) => path === m || path.startsWith(m + '/'))
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={`min-h-[40px] shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${on ? 'bg-clinic-teal text-white' : 'bg-white text-clinic-ink ring-1 ring-clinic-ink/15'}`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

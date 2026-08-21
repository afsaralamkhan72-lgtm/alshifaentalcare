'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { CLINIC } from '@/clinic.config'

type Role = 'admin' | 'doctor' | 'receptionist'

interface NavItem {
  href: string
  label: string
  ready: boolean
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', ready: true, roles: ['admin', 'doctor', 'receptionist'] },
  { href: '/admin/appointments', label: 'Appointments', ready: true, roles: ['admin', 'doctor', 'receptionist'] },
  { href: '/admin/patients', label: 'Patients', ready: true, roles: ['admin', 'doctor', 'receptionist'] },
  { href: '/admin/follow-ups', label: 'Follow-ups', ready: true, roles: ['admin', 'doctor', 'receptionist'] },
  { href: '/admin/recall', label: 'Recall', ready: true, roles: ['admin', 'doctor', 'receptionist'] },
  { href: '/admin/birthdays', label: 'Birthdays', ready: true, roles: ['admin', 'doctor', 'receptionist'] },
  { href: '/admin/dental-chart', label: 'Dental Chart', ready: true, roles: ['admin', 'doctor'] },
  { href: '/admin/lab', label: 'Lab Cases', ready: true, roles: ['admin', 'doctor'] },
  { href: '/admin/billing', label: 'Billing & Accounts', ready: true, roles: ['admin', 'receptionist'] },
  { href: '/admin/reports', label: 'Reports', ready: true, roles: ['admin'] },
  { href: '/admin/prescriptions', label: 'Prescriptions', ready: true, roles: ['admin', 'doctor'] },
  { href: '/admin/inventory', label: 'Inventory', ready: true, roles: ['admin', 'receptionist'] },
  { href: '/admin/cms', label: 'Edit Website', ready: true, roles: ['admin'] },
  { href: '/admin/recycle-bin', label: 'Recycle Bin', ready: true, roles: ['admin'] },
]

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle sidebar"
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-clinic-teal text-white shadow-md lg:hidden"
      >
        ☰
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 transform bg-clinic-teal text-white transition-transform lg:static lg:z-0 lg:w-52 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 py-6">
          <p className="font-display text-lg font-semibold">{CLINIC.shortName}</p>
          <p className="text-xs text-white/50">Admin Panel</p>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

            if (!item.ready) {
              return (
                <span
                  key={item.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-white/30"
                >
                  {item.label}
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">Soon</span>
                </span>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

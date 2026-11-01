'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { CLINIC } from '@/clinic.config'

type Role = 'admin' | 'doctor' | 'receptionist'

interface NavItem {
  href: string
  label: string
  roles: Role[]
  /** receptionist ko ye link tab dikhe jab ye permission ho (in mein se koi aik) */
  perm?: string | string[]
  /** Bara button (main 6) */
  big?: boolean
}
interface NavGroup {
  title: string
  items: NavItem[]
}

const ALL: Role[] = ['admin', 'doctor', 'receptionist']
const OWNER: Role[] = ['admin', 'doctor']

const GROUPS: NavGroup[] = [
  {
    title: '',
    items: [
      { href: '/admin/dashboard', label: 'Home', roles: ALL, big: true },
      { href: '/admin/patients', label: 'Patients', roles: ALL, perm: 'patients.view', big: true },
      { href: '/admin/appointments', label: 'Appointments', roles: ALL, perm: 'appointments.view', big: true },
      { href: '/admin/treatments', label: 'Treatments', roles: ALL, perm: ['clinical.view', 'billing.view'], big: true },
      { href: '/admin/lab', label: 'Lab', roles: ALL, perm: 'lab.view', big: true },
      { href: '/admin/accounts', label: 'Accounts', roles: ALL, perm: ['billing.view', 'reports.view', 'expenses.manage'], big: true },
    ],
  },
  {
    title: 'Aur',
    items: [
      { href: '/admin/prescriptions', label: 'Prescriptions', roles: ALL, perm: 'prescriptions.view' },
      { href: '/admin/recall', label: 'Recall', roles: ALL, perm: 'clinical.view' },
      { href: '/admin/inventory', label: 'Stock', roles: ALL, perm: 'inventory.view' },
      { href: '/admin/settings', label: 'Settings', roles: ALL, perm: 'settings.manage' },
    ],
  },
  {
    title: 'Setup',
    items: [
      { href: '/admin/staff', label: 'Staff aur Permissions', roles: ['admin'] },
      { href: '/admin/cms', label: 'Website', roles: ['admin'] },
      { href: '/admin/audit', label: 'Audit Log', roles: ['admin'] },
      { href: '/admin/recycle-bin', label: 'Recycle Bin', roles: ['admin'] },
    ],
  },
]

const allowed = (i: NavItem, role: Role, perms: string[]) =>
  role === 'admin' || role === 'doctor'
    ? i.roles.includes(role)
    : i.roles.includes(role) && (!i.perm || (Array.isArray(i.perm) ? i.perm : [i.perm]).some((p) => perms.includes(p)))

export default function Sidebar({ role, perms }: { role: Role; perms: string[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Sab se lambi matching raah ko active maanein (Invoices vs Invoices/[id] wagera)
  const flat = GROUPS.flatMap((g) => g.items)
  const activeHref =
    flat
      .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? ''

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menu kholein"
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-clinic-teal text-white shadow-md lg:hidden"
      >
        ☰
      </button>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 transform overflow-y-auto bg-gradient-to-b from-clinic-teal to-clinic-forest text-white transition-transform lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:w-56 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 pb-3 pt-6">
          <p className="font-display text-lg font-semibold leading-tight">{CLINIC.shortName}</p>
          <p className="text-xs text-white/50">Clinic Panel</p>
        </div>

        <form action="/admin/search" method="get" className="px-3 pb-2">
          <input
            name="q"
            placeholder="Talash (naam / phone)"
            className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:bg-white/20"
          />
        </form>

        <nav className="px-3 pb-8">
          {GROUPS.map((g) => {
            const items = g.items.filter((i) => allowed(i, role, perms))
            if (items.length === 0) return null
            return (
              <div key={g.title} className="mt-4">
                {g.title && <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">{g.title}</p>}
                <div className="mt-1 flex flex-col gap-0.5">
                  {items.map((item) => {
                    const active = item.href === activeHref
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`relative rounded-lg px-3 ${item.big ? 'py-2.5 text-base' : 'py-2 text-sm'} font-medium transition-colors ${
                          active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-clinic-amber" />}
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
        <p className="px-6 pb-6 text-[10px] text-white/30">
          Version {process.env.NEXT_PUBLIC_BUILD_DATE} · {process.env.NEXT_PUBLIC_BUILD_ID}
        </p>
      </aside>
    </>
  )
}

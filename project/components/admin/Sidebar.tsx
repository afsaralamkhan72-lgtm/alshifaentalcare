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
}
interface NavGroup {
  title: string
  items: NavItem[]
}

const ALL: Role[] = ['admin', 'doctor', 'receptionist']
const OWNER: Role[] = ['admin', 'doctor']

const GROUPS: NavGroup[] = [
  {
    title: 'Rozana',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', roles: ALL },
      { href: '/admin/appointments', label: 'Appointments', roles: ALL },
      { href: '/admin/patients', label: 'Patients', roles: ALL },
      { href: '/admin/follow-ups', label: 'Follow-ups', roles: ALL },
      { href: '/admin/recall', label: 'Recall', roles: ALL },
      { href: '/admin/birthdays', label: 'Birthdays', roles: ALL },
    ],
  },
  {
    title: 'Clinic ka kaam',
    items: [
      { href: '/admin/dental-chart', label: 'Dental Chart', roles: OWNER },
      { href: '/admin/prescriptions', label: 'Prescriptions', roles: OWNER },
      { href: '/admin/lab', label: 'Lab Cases', roles: OWNER },
      { href: '/admin/inventory', label: 'Inventory', roles: ['admin', 'doctor', 'receptionist'] },
    ],
  },
  {
    title: 'Paisa',
    items: [
      { href: '/admin/invoices', label: 'Invoices', roles: OWNER },
      { href: '/admin/dues', label: 'Baqaya Payments', roles: OWNER },
      { href: '/admin/expenses', label: 'Kharche', roles: OWNER },
      { href: '/admin/closing', label: 'Din ki Closing', roles: OWNER },
      { href: '/admin/payroll', label: 'Staff Salary', roles: OWNER },
      { href: '/admin/billing', label: 'Billing & Accounts', roles: OWNER },
      { href: '/admin/summary', label: 'Munafa Report', roles: OWNER },
      { href: '/admin/reports', label: 'Reports', roles: ['admin'] },
      { href: '/admin/ledger-check', label: 'Hisaab Check', roles: OWNER },
      { href: '/admin/prices', label: 'Treatment Prices', roles: OWNER },
    ],
  },
  {
    title: 'Setup',
    items: [
      { href: '/admin/cms', label: 'Edit Website', roles: ['admin'] },
      { href: '/admin/staff', label: 'Reception Login', roles: ['admin'] },
      { href: '/admin/audit', label: 'Audit Log', roles: ['admin'] },
      { href: '/admin/recycle-bin', label: 'Recycle Bin', roles: ['admin'] },
    ],
  },
]

export default function Sidebar({ role }: { role: Role }) {
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
            const items = g.items.filter((i) => i.roles.includes(role))
            if (items.length === 0) return null
            return (
              <div key={g.title} className="mt-4">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">{g.title}</p>
                <div className="mt-1 flex flex-col gap-0.5">
                  {items.map((item) => {
                    const active = item.href === activeHref
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
      </aside>
    </>
  )
}

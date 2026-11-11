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
  /** Bara button (main 5) */
  big?: boolean
  /** Is button ke andar ke doosre pages (active nishan ke liye) */
  also?: string[]
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
      { href: '/admin/lab', label: 'Lab', roles: ALL, perm: 'lab.view', big: true },
      { href: '/admin/accounts', label: 'Accounts', roles: ALL, perm: ['billing.view', 'reports.view', 'expenses.manage'], big: true, also: ['/admin/dues', '/admin/invoices', '/admin/closing', '/admin/expenses', '/admin/billing'] },
    ],
  },
  {
    title: 'Marez',
    items: [
      { href: '/admin/treatments', label: 'Treatments', roles: ALL, perm: ['clinical.view', 'billing.view'] },
      { href: '/admin/recall', label: 'Yaad-dahani / Recall', roles: ALL, perm: ['prescriptions.view', 'clinical.view'], also: ['/admin/reminders'] },
      { href: '/admin/loyalty', label: 'Loyalty', roles: ALL, perm: 'patients.view' },
      { href: '/admin/prescriptions', label: 'Purani Prescriptions', roles: ALL, perm: 'prescriptions.view' },
    ],
  },
  {
    title: 'Clinic',
    items: [
      { href: '/admin/inventory', label: 'Stock', roles: ALL, perm: 'inventory.view' },
      { href: '/admin/summary', label: 'Reports', roles: ALL, perm: 'reports.view', also: ['/admin/reports', '/admin/insights', '/admin/ledger-check'] },
      { href: '/admin/team', label: 'Staff', roles: OWNER, also: ['/admin/payroll', '/admin/attendance', '/admin/staff'] },
    ],
  },
  {
    title: 'Setup',
    items: [
      { href: '/admin/settings', label: 'Settings', roles: ALL, perm: 'settings.manage' },
      { href: '/admin/cms', label: 'Website', roles: ['admin'] },
      { href: '/admin/audit', label: 'Audit Log', roles: ['admin'] },
      { href: '/admin/recycle-bin', label: 'Recycle Bin', roles: ['admin'] },
    ],
  },
]

// Chhote line-icons (sirf nishani, kisi library ki zaroorat nahi)
const ICONS: Record<string, string> = {
  '/admin/dashboard': 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  '/admin/patients': 'M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21c0-4 3.5-6 8-6s8 2 8 6',
  '/admin/appointments': 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  '/admin/team': 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 2.5-5 6-5s6 2 6 5M17 11a2.5 2.5 0 100-5M18 15c2 .3 3 2 3 5',
  '/admin/summary': 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  '/admin/treatments': 'M12 4c-2-2-6-1-6 3 0 4 1 8 2 12 1 0 1.5-4 4-4s3 4 4 4c1-4 2-8 2-12 0-4-4-5-6-3z',
  '/admin/lab': 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3',
  '/admin/accounts': 'M3 7h18v12H3zM3 11h18M7 15h3',
  '/admin/prescriptions': 'M6 3h9l4 4v14H6zM9 12h6M9 16h6',
  '/admin/recall': 'M12 7v5l3 2M21 12a9 9 0 11-3-6.7M21 4v5h-5',
  '/admin/reminders': 'M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 004 0',
  '/admin/loyalty': 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  '/admin/inventory': 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  '/admin/expenses': 'M12 3v18M16 7c0-2-2-3-4-3s-4 1-4 3 2 3 4 3 4 1 4 3-2 3-4 3-4-1-4-3',
  '/admin/insights': 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  '/admin/payroll': 'M3 6h18v12H3zM12 9a3 3 0 100 6 3 3 0 000-6z',
  '/admin/attendance': 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  '/admin/settings': 'M12 9a3 3 0 100 6 3 3 0 000-6zM19 12a7 7 0 00-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 00-2.2-1.3L14 3h-4l-.4 2.5a7 7 0 00-2.2 1.3l-2.3-1-2 3.4 2 1.5a7 7 0 000 2.6l-2 1.5 2 3.4 2.3-1a7 7 0 002.2 1.3L10 21h4l.4-2.5a7 7 0 002.2-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z',
  '/admin/staff': 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 2.5-5 6-5s6 2 6 5M17 11a2.5 2.5 0 100-5M18 15c2 .3 3 2 3 5',
  '/admin/cms': 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  '/admin/audit': 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5',
  '/admin/recycle-bin': 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
}
function NavIcon({ href }: { href: string }) {
  const d = ICONS[href]
  if (!d) return null
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d={d} />
    </svg>
  )
}

const allowed = (i: NavItem, role: Role, perms: string[]) =>
  role === 'admin' || role === 'doctor'
    ? i.roles.includes(role)
    : i.roles.includes(role) && (!i.perm || (Array.isArray(i.perm) ? i.perm : [i.perm]).some((p) => perms.includes(p)))

export default function Sidebar({ role, perms }: { role: Role; perms: string[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Sab se lambi matching raah ko active maanein (Invoices vs Invoices/[id] wagera)
  const flat = GROUPS.flatMap((g) => g.items)
  const matches = flat.flatMap((i) => [i.href, ...(i.also ?? [])].map((h) => ({ owner: i.href, h })))
  const activeHref =
    matches
      .filter((m) => pathname === m.h || pathname.startsWith(`${m.h}/`))
      .sort((a, b) => b.h.length - a.h.length)[0]?.owner ?? ''

  // Phone ki neeche wali patti: Home, Patients, Appts, Lab, Accounts (jo allowed ho) + Menu
  const quick = GROUPS[0].items.filter((i) => allowed(i, role, perms)).slice(0, 5)

  return (
    <>
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
            placeholder="Talash (naam / phone)" aria-label="Talash (naam / phone)"
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
                        className={`relative flex items-center gap-2.5 rounded-lg px-3 ${item.big ? 'py-2.5 text-base' : 'py-2 text-sm'} font-medium transition-colors ${
                          active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-clinic-amber" />}
                        <NavIcon href={item.href} />
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

      {/* Sirf phone/tablet: neeche ki patti (laptop par nazar nahi aati) */}
      <nav
        aria-label="Jaldi raaste"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-clinic-teal/15 bg-white/95 backdrop-blur print:hidden lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-xl items-stretch justify-around">
          {quick.map((item) => {
            const active = item.href === activeHref
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
                  active ? 'text-clinic-teal' : 'text-clinic-ink/55'
                }`}
              >
                <NavIcon href={item.href} />
                <span className="max-w-full truncate">{item.label === 'Appointments' ? 'Appts' : item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label="Poora menu"
            className="flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold text-clinic-ink/55"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            Menu
          </button>
        </div>
      </nav>
    </>
  )
}

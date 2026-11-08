'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface SectionTab { href: string; label: string; match?: string[] }

/** Aik hi hisse ke milte julte pages ki patti (Accounts ya Reports). Kisi page ka kaam kam nahi hua, sirf aik jagah jama hain. */
export default function SectionTabsBar({ tabs, label }: { tabs: SectionTab[]; label: string }) {
  const path = usePathname() ?? ''
  return (
    <nav aria-label={label} className="mb-4 flex gap-2 overflow-x-auto pb-1" data-testid="section-tabs">
      {tabs.map((t) => {
        const on = [t.href, ...(t.match ?? [])].some((m) => path === m || path.startsWith(m + '/'))
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

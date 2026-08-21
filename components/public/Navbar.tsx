'use client'

import { useState } from 'react'
import ClinicLogo from '@/components/ClinicLogo'
import Link from 'next/link'
import { buildWhatsAppLink } from '@/lib/whatsapp'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services/dental', label: 'Dental' },
  { href: '/services/homeopathic', label: 'Homeopathic' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/videos', label: 'Videos' },
  { href: '/doctors', label: 'Doctors' },
  { href: '/testimonials', label: 'Reviews' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
]

export default function Navbar({ logoUrl }: { logoUrl?: string | null }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-clinic-teal/10 bg-clinic-sand/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <ClinicLogo logoUrl={logoUrl} size={38} />
          <span className="font-display text-lg font-semibold leading-tight text-clinic-teal">
            Al Shifa <span className="text-clinic-ink">Health Care</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-clinic-ink/70 transition-colors hover:text-clinic-teal"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="text-xs font-medium text-clinic-ink/50 transition-colors hover:text-clinic-teal"
          >
            Staff Login
          </Link>
          <a
            href="tel:03422078639"
            className="text-sm font-semibold text-clinic-teal transition-colors hover:text-clinic-teal-light"
          >
            0342-2078639
          </a>
          <Link
            href="/booking"
            className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light"
          >
            Book Appointment
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-full text-clinic-ink lg:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 bg-current transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`}
            />
            <span className={`absolute left-0 top-1.5 h-0.5 w-5 bg-current transition-opacity ${open ? 'opacity-0' : ''}`} />
            <span
              className={`absolute left-0 top-3 h-0.5 w-5 bg-current transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`}
            />
          </span>
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-clinic-teal/10 bg-clinic-sand px-4 pb-4 pt-2 lg:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-clinic-ink/80 hover:bg-clinic-mint"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={buildWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 rounded-full bg-whatsapp px-4 py-2 text-center text-sm font-semibold text-white"
          >
            Book on WhatsApp
          </a>
          <Link
            href="/login"
            className="mt-2 block rounded-full border border-clinic-teal px-4 py-2 text-center text-sm font-semibold text-clinic-teal"
          >
            Staff Login
          </Link>
        </nav>
      )}
    </header>
  )
}

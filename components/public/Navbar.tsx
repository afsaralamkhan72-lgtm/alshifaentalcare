import ClinicLogo from '@/components/ClinicLogo'
import Link from 'next/link'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'

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
  return (
    <header className="sticky top-0 z-30 border-b border-clinic-teal/10 bg-clinic-sand/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <ClinicLogo logoUrl={logoUrl} size={38} />
          <span className="font-display text-lg font-semibold leading-tight text-clinic-teal">
            {CLINIC.name}
          </span>
        </Link>

        {/* Phone par booking foran nazar aana chahiye */}
        <a
          href={buildWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-whatsapp px-4 py-2 text-xs font-semibold text-white lg:hidden"
        >
          Book
        </a>

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
            href={`tel:${CLINIC.phone.dial}`}
            className="text-sm font-semibold text-clinic-teal transition-colors hover:text-clinic-teal-light"
          >
            {CLINIC.phone.display}
          </a>
          <Link
            href="/booking"
            className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light"
          >
            Book Appointment
          </Link>
        </div>
      </div>

      {/* Mobile: saare sections aik hi nazar mein, scroll kar ke */}
      <nav className="lg:hidden">
        <div className="flex gap-1 overflow-x-auto px-3 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-sm font-medium text-clinic-ink/80 transition-colors active:bg-clinic-teal active:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="shrink-0 rounded-full border border-clinic-teal/30 px-3 py-1.5 text-sm font-medium text-clinic-teal"
          >
            Staff Login
          </Link>
        </div>
      </nav>
    </header>
  )
}

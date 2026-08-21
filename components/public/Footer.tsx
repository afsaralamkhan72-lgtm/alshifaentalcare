import Link from 'next/link'
import ClinicLogo from '@/components/ClinicLogo'
import { createClient } from '@/lib/supabase/server'

interface ClinicInfo {
  logo_url?: string | null
  name: string
  doctor_name: string
  address: string
  phone: string
  whatsapp: string
  timings: string
}

const DEFAULT_INFO: ClinicInfo = {
  name: 'Al Shifa Health Care',
  doctor_name: 'Dr. Muhammad Khalid Mahmood',
  address: 'Numaish, Nizami Road, Karachi',
  phone: '0342-2078639',
  whatsapp: '923422078639',
  timings: '10:00 AM – 5:00 PM',
}

export default async function Footer() {
  let info = DEFAULT_INFO
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'clinic_info')
      .single()
    if (data?.value) info = { ...DEFAULT_INFO, ...data.value }
  } catch {
    // Falls back to DEFAULT_INFO if Supabase isn't reachable at build/render time
  }

  return (
    <footer className="border-t border-clinic-teal/10 bg-clinic-teal text-white/90">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            {info.logo_url && (
              <ClinicLogo logoUrl={info.logo_url} size={40} />
            )}
            <p className="font-display text-lg font-semibold text-white">{info.name}</p>
          </div>
          <p className="mt-2 text-sm text-white/70">{info.doctor_name}</p>
          <p className="mt-4 text-sm text-white/70">{info.address}</p>
          <p className="mt-1 text-sm text-white/70">Open Daily: {info.timings}</p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/50">Quick Links</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/70">
            <Link href="/about" className="hover:text-white">About Us</Link>
            <Link href="/services/dental" className="hover:text-white">Dental Services</Link>
            <Link href="/services/homeopathic" className="hover:text-white">Homeopathic Services</Link>
            <Link href="/booking" className="hover:text-white">Book Appointment</Link>
            <Link href="/contact" className="hover:text-white">Contact Us</Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/50">Reach Us</p>
          <a href={`tel:${info.phone.replace(/[^0-9+]/g, '')}`} className="mt-3 block text-sm text-white/70 hover:text-white">
            📞 {info.phone}
          </a>
          <a
            href={`https://wa.me/${info.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-whatsapp px-4 py-2 text-sm font-semibold text-white"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/50 sm:px-6">
        © {new Date().getFullYear()} {info.name}. All rights reserved.
      </div>
    </footer>
  )
}

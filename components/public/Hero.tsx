import { createClient } from '@/lib/supabase/server'
import WhatsAppButton from './WhatsAppButton'

const DEFAULTS = {
  heading: 'Dental & Homeopathic Care Under One Roof',
  subheading:
    'Trusted treatment for your whole family in Numaish, Nizami Road, Karachi. Book your appointment with a single WhatsApp message.',
  doctor_name: 'Dr. Muhammad Khalid Mahmood',
  phone: '0342-2078639',
}

export default async function Hero() {
  let hero = { heading: DEFAULTS.heading, subheading: DEFAULTS.subheading }
  let clinic = { doctor_name: DEFAULTS.doctor_name, phone: DEFAULTS.phone }

  try {
    const supabase = await createClient()
    const { data } = await supabase.from('site_settings').select('key, value').in('key', ['hero_banner', 'clinic_info'])

    for (const row of data ?? []) {
      if (row.key === 'hero_banner') hero = { ...hero, ...(row.value as typeof hero) }
      if (row.key === 'clinic_info') clinic = { ...clinic, ...(row.value as typeof clinic) }
    }
  } catch {
    // falls back to DEFAULTS
  }

  return (
    <section className="relative overflow-hidden bg-clinic-teal">
      {/* Ambient background shape, the "one accessory" for the hero */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-clinic-teal-light/40 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-white/60">
          {clinic.doctor_name}
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight text-white sm:text-5xl">
          {hero.heading}
        </h1>
        <p className="mt-4 max-w-xl text-white/70">{hero.subheading}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <WhatsAppButton label="Book on WhatsApp" />
          <a
            href={`tel:${clinic.phone.replace(/[^0-9+]/g, '')}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Call: {clinic.phone}
          </a>
        </div>
      </div>
    </section>
  )
}

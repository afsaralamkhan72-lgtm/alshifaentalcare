import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import WhatsAppButton from './WhatsAppButton'
import { CLINIC } from '@/clinic.config'

const DEFAULTS = {
  heading: 'Dental & Homeopathic Care Under One Roof',
  subheading:
    `Trusted treatment for your whole family in ${CLINIC.address.full}. Book your appointment with a single WhatsApp message.`,
  doctor_name: CLINIC.doctor.name,
  phone: CLINIC.phone.display,
}

export default async function Hero() {
  let hero = {
    heading: DEFAULTS.heading,
    subheading: DEFAULTS.subheading,
    image_url: '' as string,
    show_text: true as boolean,
  }
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

  const hasCover = Boolean(hero.image_url)

  // Cover image lagi ho to wo banner ban jati hai. Text upar tabhi aata
  // hai jab "text dikhayein" on ho, warna sirf tasveer.
  if (hasCover && !hero.show_text) {
    return (
      <section className="relative w-full bg-clinic-teal">
        <div className="relative mx-auto aspect-[1600/600] w-full max-w-[1600px]">
          <Image
            src={hero.image_url}
            alt={CLINIC.name}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden bg-clinic-teal">
      {hasCover ? (
        <>
          <Image
            src={hero.image_url}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          {/* Text parhne ke liye halka parda */}
          <div className="absolute inset-0 bg-gradient-to-r from-clinic-teal/90 via-clinic-teal/70 to-clinic-teal/30" />
        </>
      ) : (
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-clinic-teal-light/40 blur-3xl" />
      )}

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

import { createClient } from '@/lib/supabase/server'
import Hero from '@/components/public/Hero'
import Ticker from '@/components/public/Ticker'
import TrustStats from '@/components/public/TrustStats'
import ServiceCard from '@/components/public/ServiceCard'
import WhyChooseUs from '@/components/public/WhyChooseUs'
import DoctorIntro from '@/components/public/DoctorIntro'
import HomeSections from '@/components/public/HomeSections'
import ProcessAndFaq from '@/components/public/ProcessAndFaq'
import Link from 'next/link'
import { CLINIC } from '@/clinic.config'

interface Service {
  id: string
  title: string
  short_description: string | null
  image_url: string | null
  department: 'dental' | 'homeopathic'
}

const TICKER_ITEMS = [
  `📞 ${CLINIC.phone.display}`,
  '🦷 Dental & Homeopathic Care',
  `📍 ${CLINIC.address.full}`,
  `🕐 ${CLINIC.timings.full}`,
  '💬 Book instantly on WhatsApp',
]

async function getFeaturedServices(): Promise<Service[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('services')
      .select('id, title, short_description, image_url, department')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(6)
    return data ?? []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const services = await getFeaturedServices()

  return (
    <>
      <Hero />
      <DoctorIntro />
      <Ticker items={TICKER_ITEMS} />
      <TrustStats />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
              Our Treatments
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink sm:text-3xl">
              Dental &amp; Homeopathic Treatments
            </h2>
          </div>
          <Link
            href="/services/dental"
            className="shrink-0 text-sm font-semibold text-clinic-teal hover:underline"
          >
            View all treatments →
          </Link>
        </div>

        {services.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard
                key={s.id}
                title={s.title}
                shortDescription={s.short_description}
                imageUrl={s.image_url}
                department={s.department}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/60">
            No treatments have been added yet. Add them from Admin Panel &rarr; Edit Website
            and they will appear here automatically.
          </p>
        )}
      </section>

      <WhyChooseUs />
      <ProcessAndFaq />
      <HomeSections />
    </>
  )
}

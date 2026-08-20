import { createClient } from '@/lib/supabase/server'
import Hero from '@/components/public/Hero'
import Ticker from '@/components/public/Ticker'
import TrustStats from '@/components/public/TrustStats'
import ServiceCard from '@/components/public/ServiceCard'

interface Service {
  id: string
  title: string
  short_description: string | null
  image_url: string | null
  department: 'dental' | 'homeopathic'
}

const TICKER_ITEMS = [
  '📞 0342-2078639',
  '🦷 Dental & Homeopathic Care',
  '📍 Numaish, Nizami Road, Karachi',
  '🕐 Open Daily 10:00 AM – 5:00 PM',
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
      <Ticker items={TICKER_ITEMS} />
      <TrustStats />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
              Featured Services
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink sm:text-3xl">
              Dental &amp; Homeopathic Treatments
            </h2>
          </div>
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
            Abhi tak koi service CMS mein add nahi hui — Admin Panel &rarr; Edit Website se
            services add karein, wo yahan automatically nazar aayengi.
          </p>
        )}
      </section>
    </>
  )
}

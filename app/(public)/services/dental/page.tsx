import PageHeader from '@/components/public/PageHeader'
import ServiceCard from '@/components/public/ServiceCard'
import { createClient } from '@/lib/supabase/server'
import { CLINIC } from '@/clinic.config'

async function getDentalServices() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('services')
      .select('id, title, short_description, image_url, department')
      .eq('department', 'dental')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    return data ?? []
  } catch {
    return []
  }
}

export const metadata = {
  title: 'Dental Treatments',
  description: `Scaling, root canal, teeth whitening, braces, crowns and implants at ${CLINIC.name}, ${CLINIC.address.full}.`,
}

export default async function DentalServicesPage() {
  const services = await getDentalServices()

  return (
    <>
      <PageHeader
        eyebrow="Dental Services"
        title="Dental Treatments"
        description="Har treatment ke sath direct WhatsApp par appointment book karein."
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {services.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard
                key={s.id}
                title={s.title}
                shortDescription={s.short_description}
                imageUrl={s.image_url}
                department="dental"
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/60">
            Dental services abhi CMS mein add nahi hui, Admin Panel se add karein.
          </p>
        )}
      </section>
    </>
  )
}

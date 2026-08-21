import PageHeader from '@/components/public/PageHeader'
import TestimonialCard from '@/components/public/TestimonialCard'
import { createClient } from '@/lib/supabase/server'

async function getApprovedTestimonials() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('testimonials')
      .select('id, patient_name, review_text, rating')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

export default async function TestimonialsPage() {
  const testimonials = await getApprovedTestimonials()

  return (
    <>
      <PageHeader eyebrow="Patient Reviews" title="Testimonials" />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {testimonials.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <TestimonialCard
                key={t.id}
                patientName={t.patient_name}
                reviewText={t.review_text}
                rating={t.rating}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/60">
            Abhi koi approved review nahi hai, Admin Panel se reviews approve karein.
          </p>
        )}
      </section>
    </>
  )
}

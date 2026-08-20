import PageHeader from '@/components/public/PageHeader'
import DoctorCard from '@/components/public/DoctorCard'
import { createClient } from '@/lib/supabase/server'

async function getDoctors() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('doctors')
      .select('id, full_name, qualification, bio, image_url')
      .order('sort_order', { ascending: true })
    return data ?? []
  } catch {
    return []
  }
}

export default async function DoctorsPage() {
  const doctors = await getDoctors()

  return (
    <>
      <PageHeader eyebrow="Our Team" title="Doctors Panel" />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {doctors.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d) => (
              <DoctorCard
                key={d.id}
                fullName={d.full_name}
                qualification={d.qualification}
                bio={d.bio}
                imageUrl={d.image_url}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/60">
            Doctors panel abhi CMS mein add nahi hua — Admin Panel se add karein.
          </p>
        )}
      </section>
    </>
  )
}

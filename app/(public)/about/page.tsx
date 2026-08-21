import Image from 'next/image'
import PageHeader from '@/components/public/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { CLINIC } from '@/clinic.config'
import ClinicShowcase from '@/components/public/ClinicShowcase'

const DEFAULT_HISTORY =
  `${CLINIC.name} dental aur homeopathic dono services aik chhat ke neeche pesh karta hai. Ye tafseel Edit Website se badli ja sakti hai.`

async function getPrimaryDoctor() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('doctors')
      .select('full_name, qualification, bio, image_url')
      .order('sort_order', { ascending: true })
      .limit(1)
      .single()
    return data
  } catch {
    return null
  }
}

async function getClinicHistory() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'clinic_history')
      .single()
    return (data?.value as { text?: string })?.text ?? DEFAULT_HISTORY
  } catch {
    return DEFAULT_HISTORY
  }
}

export default async function AboutPage() {
  const [doctor, history] = await Promise.all([getPrimaryDoctor(), getClinicHistory()])

  return (
    <>
      <PageHeader
        eyebrow="About Us"
        title={CLINIC.name}
        description="Dental aur Homeopathic care, ek trusted doctor ke sath."
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[220px_1fr]">
          <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-2xl bg-clinic-mint md:mx-0">
            {doctor?.image_url ? (
              <Image src={doctor.image_url} alt={doctor.full_name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-display text-clinic-teal/40">
                {(doctor?.full_name ?? CLINIC.doctor.name).charAt(0)}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-clinic-ink">
              {doctor?.full_name ?? CLINIC.doctor.name}
            </h2>
            {doctor?.qualification ? (
              <p className="mt-1 text-sm font-medium text-clinic-teal">{doctor.qualification}</p>
            ) : (
              <p className="mt-1 text-sm text-clinic-ink/40">
                Qualification Admin Panel se add karein, abhi CMS mein khali hai.
              </p>
            )}

            {doctor?.bio ? (
              <p className="mt-4 whitespace-pre-line text-clinic-ink/70">{doctor.bio}</p>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-4 text-sm text-clinic-ink/60">
                Doctor ki mukammal profile (background, experience, specialization) yahan Admin
                Panel &rarr; Edit Website se add ki ja sakti hai.
              </p>
            )}
          </div>
        </div>

        <div className="mt-14 border-t border-clinic-teal/10 pt-10">
          <h3 className="font-display text-xl font-semibold text-clinic-ink">Clinic Ki History</h3>
          <p className="mt-3 max-w-3xl whitespace-pre-line text-clinic-ink/70">{history}</p>
        </div>
      </section>
          <ClinicShowcase />
</>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import WhatsAppButton from './WhatsAppButton'

interface Doctor {
  full_name: string
  qualification: string | null
  bio: string | null
  image_url: string | null
}

const FALLBACK: Doctor = {
  full_name: 'Dr. Muhammad Khalid Mahmood',
  qualification: 'Dental Surgeon & Homeopathic Physician',
  bio: 'Numaish, Nizami Road par barson se Karachi ke khandano ka ilaj. Har mareez ko waqt, tawajjah aur aik saaf ilaj ka mansooba milta hai — bina jaldi ke, bina uljhan ke.',
  image_url: null,
}

export default async function DoctorIntro() {
  let doctor = FALLBACK

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('doctors')
      .select('full_name, qualification, bio, image_url')
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (data) doctor = { ...FALLBACK, ...data }
  } catch {
    // keep fallback
  }

  const initials = doctor.full_name
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="grid items-center gap-8 lg:grid-cols-[280px_1fr]">
        <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-3xl bg-clinic-teal lg:mx-0">
          {doctor.image_url ? (
            <Image
              src={doctor.image_url}
              alt={doctor.full_name}
              fill
              className="object-cover"
              sizes="280px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-display text-6xl font-semibold text-white/90">{initials}</span>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
            Aap Ke Doctor
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink sm:text-3xl">
            {doctor.full_name}
          </h2>
          {doctor.qualification && (
            <p className="mt-1 text-sm font-medium text-clinic-teal">{doctor.qualification}</p>
          )}
          <p className="mt-4 max-w-xl leading-relaxed text-clinic-ink/70">{doctor.bio}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <WhatsAppButton label="Consultation Book Karein" />
            <Link
              href="/about"
              className="rounded-full border border-clinic-teal px-5 py-2.5 text-sm font-semibold text-clinic-teal transition-colors hover:bg-clinic-teal hover:text-white"
            >
              Clinic Ke Baare Mein
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

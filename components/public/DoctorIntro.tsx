import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CLINIC } from '@/clinic.config'
import WhatsAppButton from './WhatsAppButton'

interface Doctor {
  id?: string
  full_name: string
  qualification: string | null
  bio: string | null
  image_url: string | null
}

const FALLBACK: Doctor = {
  full_name: CLINIC.doctor.name,
  qualification: CLINIC.doctor.qualification,
  bio: `Serving families for years from the clinic at ${CLINIC.address.area}. Every patient gets unhurried time, careful attention, and a clear treatment plan they actually understand.`,
  image_url: null,
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0])
      .join('') || 'DR'
  )
}

async function getDoctors(): Promise<Doctor[]> {
  try {
    const supabase = await createClient()

    // show_on_home column na ho to poori list le lein
    let { data, error } = await supabase
      .from('doctors')
      .select('id, full_name, qualification, bio, image_url')
      .eq('show_on_home', true)
      .order('sort_order', { ascending: true })

    if (error) {
      const retry = await supabase
        .from('doctors')
        .select('id, full_name, qualification, bio, image_url')
        .order('sort_order', { ascending: true })
      data = retry.data
    }

    return (data ?? []) as Doctor[]
  } catch {
    return []
  }
}

export default async function DoctorIntro() {
  const doctors = await getDoctors()
  const lead = doctors[0] ?? FALLBACK
  const others = doctors.slice(1, 5)

  return (
    <section className="border-b border-clinic-teal/10 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {/* Tarteeb 1 wala doctor, bara */}
        <div className="grid items-center gap-8 lg:grid-cols-[280px_1fr]">
          <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-3xl bg-clinic-teal lg:mx-0">
            {lead.image_url ? (
              <Image
                src={lead.image_url}
                alt={lead.full_name}
                fill
                className="object-cover"
                sizes="280px"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="font-display text-6xl font-semibold text-white/90">
                  {initials(lead.full_name)}
                </span>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
              Meet Your Doctor
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink sm:text-3xl">
              {lead.full_name}
            </h2>
            {lead.qualification && (
              <p className="mt-1 text-sm font-medium text-clinic-teal">{lead.qualification}</p>
            )}
            {lead.bio && (
              <p className="mt-4 max-w-xl leading-relaxed text-clinic-ink/70">{lead.bio}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <WhatsAppButton label="Book a Consultation" />
              <Link
                href="/about"
                className="rounded-full border border-clinic-teal px-5 py-2.5 text-sm font-semibold text-clinic-teal transition-colors hover:bg-clinic-teal hover:text-white"
              >
                About the Clinic
              </Link>
            </div>
          </div>
        </div>

        {/* Baaqi doctors, chhote */}
        {others.length > 0 && (
          <div className="mt-10 border-t border-clinic-teal/10 pt-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
              Our Team
            </p>

            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {others.map((d, i) => (
                <div key={d.id ?? i} className="flex items-center gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-clinic-teal">
                    {d.image_url ? (
                      <Image
                        src={d.image_url}
                        alt={d.full_name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="font-display text-lg font-semibold text-white/90">
                          {initials(d.full_name)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-clinic-ink">{d.full_name}</p>
                    {d.qualification && (
                      <p className="truncate text-xs text-clinic-ink/60">{d.qualification}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/doctors"
              className="mt-5 inline-block text-sm font-semibold text-clinic-teal hover:underline"
            >
              All doctors →
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

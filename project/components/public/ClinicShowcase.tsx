import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { CLINIC } from '@/clinic.config'

interface Photo {
  id: string
  image_url: string
  caption: string | null
}

interface Ceo {
  enabled?: boolean
  name?: string
  title?: string
  message?: string
  image_url?: string
}

async function getData() {
  try {
    const supabase = await createClient()
    const [photoRes, ceoRes] = await Promise.all([
      supabase
        .from('clinic_photos')
        .select('id, image_url, caption')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(8),
      supabase.from('site_settings').select('value').eq('key', 'ceo_profile').maybeSingle(),
    ])
    return {
      photos: (photoRes.data ?? []) as Photo[],
      ceo: (ceoRes.data?.value ?? {}) as Ceo,
    }
  } catch {
    return { photos: [] as Photo[], ceo: {} as Ceo }
  }
}

export default async function ClinicShowcase() {
  const { photos, ceo } = await getData()

  const showCeo = ceo.enabled !== false && Boolean(ceo.name || ceo.image_url)
  if (photos.length === 0 && !showCeo) return null

  return (
    <>
      {photos.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
            Our Clinic
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink sm:text-3xl">
            Inside {CLINIC.name}
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {photos.map((photo, i) => (
              <figure
                key={photo.id}
                className={`overflow-hidden rounded-2xl bg-clinic-mint ${
                  i === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
                }`}
              >
                <div className={`relative ${i === 0 ? 'aspect-[4/3]' : 'aspect-square'}`}>
                  <Image
                    src={photo.image_url}
                    alt={photo.caption ?? CLINIC.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 320px"
                  />
                </div>
                {photo.caption && (
                  <figcaption className="bg-white px-3 py-2 text-sm text-clinic-ink/70">
                    {photo.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {showCeo && (
        <section className="bg-clinic-mint/50 py-14">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="grid items-center gap-8 sm:grid-cols-[200px_1fr]">
              <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-3xl bg-clinic-teal sm:mx-0">
                {ceo.image_url ? (
                  <Image
                    src={ceo.image_url}
                    alt={ceo.name ?? 'CEO'}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="font-display text-4xl font-semibold text-white/90">
                      {(ceo.name ?? 'CEO')
                        .split(' ')
                        .filter((w) => w.length > 2)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('') || 'CEO'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
                  {ceo.title || 'Founder & CEO'}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink">
                  {ceo.name}
                </h2>
                {ceo.message && (
                  <p className="mt-4 leading-relaxed text-clinic-ink/70">{ceo.message}</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

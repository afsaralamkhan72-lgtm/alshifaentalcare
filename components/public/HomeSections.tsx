import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import WhatsAppButton from './WhatsAppButton'

interface GalleryRow {
  id: string
  title: string | null
  before_image_url: string | null
  after_image_url: string | null
}

interface TestimonialRow {
  id: string
  patient_name: string
  review_text: string
  rating: number | null
}

interface BlogRow {
  id: string
  title: string
  slug: string
  cover_image_url: string | null
  created_at: string
}

async function getPreviews() {
  try {
    const supabase = await createClient()
    const [g, t, b] = await Promise.all([
      supabase
        .from('gallery')
        .select('id, title, before_image_url, after_image_url')
        .order('sort_order')
        .limit(3),
      supabase
        .from('testimonials')
        .select('id, patient_name, review_text, rating')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('blog_posts')
        .select('id, title, slug, cover_image_url, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3),
    ])
    return {
      gallery: (g.data ?? []) as GalleryRow[],
      testimonials: (t.data ?? []) as TestimonialRow[],
      blog: (b.data ?? []) as BlogRow[],
    }
  } catch {
    return { gallery: [], testimonials: [], blog: [] }
  }
}

export default async function HomeSections() {
  const { gallery, testimonials, blog } = await getPreviews()

  return (
    <>
      {/* Before / After */}
      {gallery.length > 0 && (
        <section className="bg-clinic-mint/50 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
                  Results
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink sm:text-3xl">
                  Before &amp; After
                </h2>
              </div>
              <Link href="/gallery" className="text-sm font-semibold text-clinic-teal hover:underline">
                View gallery →
              </Link>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((g) => (
                <div key={g.id} className="overflow-hidden rounded-2xl bg-white">
                  <div className="grid grid-cols-2 gap-px bg-clinic-teal/10">
                    {[g.before_image_url, g.after_image_url].map((src, i) => (
                      <div key={i} className="relative aspect-square bg-clinic-mint">
                        {src && (
                          <Image
                            src={src}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, 200px"
                          />
                        )}
                        <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {i === 0 ? 'Before' : 'After'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {g.title && (
                    <p className="p-3 text-sm font-medium text-clinic-ink">{g.title}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
                Patient Reviews
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink sm:text-3xl">
                What People Say
              </h2>
            </div>
            <Link href="/testimonials" className="text-sm font-semibold text-clinic-teal hover:underline">
              All reviews →
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.id} className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
                <div className="flex gap-0.5 text-clinic-amber">
                  {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-clinic-ink/70">
                  {t.review_text}
                </blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-clinic-ink">
                  {t.patient_name}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Blog */}
      {blog.length > 0 && (
        <section className="bg-clinic-mint/50 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
                  Health Tips
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink sm:text-3xl">
                  From Our Blog
                </h2>
              </div>
              <Link href="/blog" className="text-sm font-semibold text-clinic-teal hover:underline">
                All articles →
              </Link>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blog.map((p) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group overflow-hidden rounded-2xl bg-white transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] bg-clinic-mint">
                    {p.cover_image_url && (
                      <Image
                        src={p.cover_image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 350px"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-clinic-ink/40">
                      {new Date(p.created_at).toLocaleDateString('en-GB')}
                    </p>
                    <p className="mt-1 font-display font-semibold text-clinic-ink group-hover:text-clinic-teal">
                      {p.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing call to action */}
      <section className="bg-clinic-teal">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Toothache or a Long-Standing Problem?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">
            Book your time today. Open daily at Numaish, Nizami Road, 10:00 AM to 5:00 PM.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <WhatsAppButton label="Book on WhatsApp" />
            <a
              href="tel:03422078639"
              className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Call: 0342-2078639
            </a>
            <Link
              href="/contact"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-clinic-teal"
            >
              Find Us
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

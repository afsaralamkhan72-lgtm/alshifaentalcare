import PageHeader from '@/components/public/PageHeader'
import GalleryItem from '@/components/public/GalleryItem'
import { createClient } from '@/lib/supabase/server'

async function getGallery() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('gallery')
      .select('id, title, category, before_image_url, after_image_url')
      .order('sort_order', { ascending: true })
    return data ?? []
  } catch {
    return []
  }
}

export default async function GalleryPage() {
  const items = await getGallery()

  return (
    <>
      <PageHeader
        eyebrow="Real Results"
        title="Before & After Gallery"
        description="Hamare patients ke actual treatment results."
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {items.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <GalleryItem
                key={item.id}
                title={item.title}
                category={item.category}
                beforeImageUrl={item.before_image_url}
                afterImageUrl={item.after_image_url}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/60">
            Gallery abhi khali hai — Admin Panel se before/after images add karein.
          </p>
        )}
      </section>
    </>
  )
}

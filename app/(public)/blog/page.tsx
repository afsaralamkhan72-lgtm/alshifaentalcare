import PageHeader from '@/components/public/PageHeader'
import BlogCard from '@/components/public/BlogCard'
import { createClient } from '@/lib/supabase/server'
import { CLINIC } from '@/clinic.config'

async function getPublishedPosts() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('id, slug, title, cover_image_url, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

export const metadata = {
  title: 'Health Tips & Blog',
  description: `Dental and homeopathic health tips from ${CLINIC.doctor.name}.`,
}

export default async function BlogPage() {
  const posts = await getPublishedPosts()

  return (
    <>
      <PageHeader eyebrow="Health Tips" title="Blog & Health Tips" />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {posts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <BlogCard
                key={p.id}
                slug={p.slug}
                title={p.title}
                coverImageUrl={p.cover_image_url}
                publishedAt={p.published_at}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/60">
            Abhi koi blog post publish nahi hui, Admin Panel se likhna shuru karein.
          </p>
        )}
      </section>
    </>
  )
}

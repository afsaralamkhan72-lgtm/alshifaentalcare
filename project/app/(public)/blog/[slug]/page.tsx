import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CLINIC } from '@/clinic.config'

interface Props {
  params: Promise<{ slug: string }>
}

async function getPost(slug: string) {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('title, content, cover_image_url, published_at')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()
    return data
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('title, content, cover_image_url')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()

    if (!data) return { title: 'Article' }

    const summary = (data.content ?? '')
      .replace(/[#*_>`\-]/g, '')
      .slice(0, 155)
      .trim()

    return {
      title: data.title,
      description: summary || `${CLINIC.name} health tips`,
      openGraph: {
        title: data.title,
        description: summary,
        type: 'article',
        ...(data.cover_image_url ? { images: [data.cover_image_url] } : {}),
      },
    }
  } catch {
    return { title: 'Article' }
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) notFound()

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {post.cover_image_url && (
        <div className="relative mb-6 h-64 w-full overflow-hidden rounded-2xl bg-clinic-mint">
          <Image src={post.cover_image_url} alt={post.title} fill className="object-cover" />
        </div>
      )}

      {post.published_at && (
        <p className="text-xs text-clinic-ink/40">
          {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}

      <h1 className="mt-1 font-display text-3xl font-semibold text-clinic-ink">{post.title}</h1>

      <div className="prose prose-neutral mt-6 max-w-none whitespace-pre-line text-clinic-ink/80">
        {post.content}
      </div>
    </article>
  )
}

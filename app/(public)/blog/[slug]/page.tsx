import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

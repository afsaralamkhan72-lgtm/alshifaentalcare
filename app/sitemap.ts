import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/clinic.config'

/**
 * Google ko batata hai ke website par kaun kaun se page hain.
 * Blog posts khud ba khud is mein aa jate hain.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    '',
    '/about',
    '/services/dental',
    '/services/homeopathic',
    '/gallery',
    '/videos',
    '/doctors',
    '/testimonials',
    '/blog',
    '/contact',
    '/booking',
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  let posts: MetadataRoute.Sitemap = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('slug, created_at')
      .eq('is_published', true)

    posts = (data ?? []).map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.created_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch {
    // blog optional
  }

  return [...staticPages, ...posts]
}

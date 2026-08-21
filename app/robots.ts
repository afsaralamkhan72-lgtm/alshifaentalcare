import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/clinic.config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Admin aur patient portal Google par nahi aane chahiye
      disallow: ['/admin/', '/login', '/portal/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

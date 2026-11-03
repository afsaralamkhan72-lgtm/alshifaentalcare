import type { MetadataRoute } from 'next'
import { CLINIC } from '@/clinic.config'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: CLINIC.name,
    short_name: 'Al Shifa',
    start_url: '/admin/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0B4F4A',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { CLINIC, SITE_URL, clinicJsonLd } from '@/clinic.config'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${CLINIC.name} | ${CLINIC.tagline} in ${CLINIC.address.city}`,
    template: `%s | ${CLINIC.name}`,
  },
  description: `${CLINIC.tagline} at ${CLINIC.address.full}. Book an appointment on WhatsApp. ${CLINIC.timings.full}.`,
  keywords: [
    `dentist ${CLINIC.address.city}`,
    `dental clinic ${CLINIC.address.area}`,
    `homeopathic doctor ${CLINIC.address.city}`,
    'braces',
    'root canal',
    'teeth whitening',
    'scaling and polishing',
    CLINIC.name,
    CLINIC.doctor.name,
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: SITE_URL,
    siteName: CLINIC.name,
    title: `${CLINIC.name} | ${CLINIC.tagline}`,
    description: `${CLINIC.tagline} at ${CLINIC.address.full}. ${CLINIC.timings.full}.`,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B4F4A',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let closedDay = ''
  let logoUrl = ''
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'clinic_info')
      .maybeSingle()
    const info = (data?.value ?? {}) as Record<string, string>
    closedDay = info.closed_day || ''
    logoUrl = info.logo_url || ''
  } catch {
    // defaults
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@100..900&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body bg-clinic-sand text-clinic-ink antialiased">
        {/* Google ko clinic ki maloomat: pata, timings, phone */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(clinicJsonLd(logoUrl || null, closedDay || null)),
          }}
        />
        {children}
      </body>
    </html>
  )
}

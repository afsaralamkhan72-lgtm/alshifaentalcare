/**
 * ============================================================
 *  CLINIC CONFIG
 * ============================================================
 *
 *  Naye clinic ke liye SIRF ye file badlein.
 *  Poora software (website, admin panel, invoice, WhatsApp
 *  messages, patient portal) khud ba khud us clinic ka ban
 *  jayega.
 *
 *  Baaqi kisi file ko haath lagane ki zaroorat nahi.
 * ============================================================
 */

/**
 *  Chahein to code chhue bagair Vercel ki Environment Variables se
 *  bhi badal sakte hain (NEXT_PUBLIC_CLINIC_NAME waghera).
 *  Jo wahan set nahi hoga, wo neeche wali value use hogi.
 */
const env = (key: string, fallback: string) =>
  process.env[`NEXT_PUBLIC_${key}`] || fallback

export const CLINIC = {
  /** Poora naam, header, invoice aur browser tab par aata hai */
  name: env('CLINIC_NAME', 'Al Shifa Health Care'),

  /** Chhota naam, admin panel ke sidebar par */
  shortName: env('CLINIC_SHORT_NAME', 'Al Shifa'),

  /** Website ke title ke saath lagta hai */
  tagline: env('CLINIC_TAGLINE', 'Dental & Homeopathic Clinic'),

  doctor: {
    name: env('CLINIC_DOCTOR', 'Dr. Muhammad Khalid Mahmood'),
    qualification: env('CLINIC_DOCTOR_QUALIFICATION', 'Dental Surgeon & Homeopathic Physician'),
  },

  phone: {
    /** Jaise screen par dikhana hai */
    display: env('CLINIC_PHONE', '0342-2078639'),
    /** Call button ke liye, sirf digits */
    dial: env('CLINIC_PHONE_DIAL', '03422078639'),
    /** WhatsApp ke liye international format: 92 + number (0 ke bagair) */
    whatsapp: env('CLINIC_WHATSAPP', '923422078639'),
  },

  address: {
    /** Aik line mein poora pata */
    full: env('CLINIC_ADDRESS', 'Numaish, Nizami Road, Karachi'),
    area: env('CLINIC_AREA', 'Numaish, Nizami Road'),
    city: env('CLINIC_CITY', 'Karachi'),
  },

  timings: {
    /** Chhota version, ticker aur cards par */
    short: env('CLINIC_TIMINGS_SHORT', '10:00 AM to 5:00 PM'),
    /** Poora jumla, footer aur invoice par */
    full: env('CLINIC_TIMINGS', 'Open Daily 10:00 AM to 5:00 PM'),
  },

  /**
   * Google Maps.
   *
   * Behtar tareeqa: Google Maps par clinic dhoondein, Share > Embed a map,
   * wahan se sirf src="..." wala link copy kar ke `mapEmbed` mein daal dein.
   * Us se bilkul sahi jagah dikhegi.
   *
   * Agar mapEmbed khali chhod dein to `mapQuery` se search hoga.
   */
  mapEmbed: env('CLINIC_MAP_EMBED', ''),
  mapQuery: env('CLINIC_MAP_QUERY', 'Numaish Nizami Road Karachi'),

  /** Google Maps par directions ka link (Get Directions button) */
  mapDirections: env(
    'CLINIC_MAP_DIRECTIONS',
    'https://www.google.com/maps/dir/?api=1&destination=Numaish+Nizami+Road+Karachi'
  ),

  /**
   * Social media. Jo account na ho usay khali chhod dein,
   * us ka icon khud ba khud chhup jayega.
   */
  social: {
    facebook: env('CLINIC_FACEBOOK', ''),
    instagram: env('CLINIC_INSTAGRAM', ''),
    youtube: env('CLINIC_YOUTUBE', ''),
    tiktok: env('CLINIC_TIKTOK', ''),
    googleReview: env('CLINIC_GOOGLE_REVIEW', ''),
  },

  /**
   * MR number ka prefix. Ye database ke trigger mein bhi hai,
   * naye clinic ke liye SETUP-ALL.sql mein 'AS-' dhoond kar badlein.
   */
  mrPrefix: env('MR_PREFIX', 'AS'),
}

/**
 * Website ka apna address. SEO ke liye zaroori hai.
 * Vercel par NEXT_PUBLIC_SITE_URL set kar dein, warna yahi use hoga.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://alshifaentalcare.vercel.app'

/**
 * Google ko clinic ke baare mein batane wali maloomat (structured data).
 * Is se Google search mein pata, timings aur phone number dikhata hai.
 */
export function clinicJsonLd(logoUrl?: string | null, closedDay?: string | null) {
  const allDays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]
  const openDays = closedDay
    ? allDays.filter((d) => d.toLowerCase() !== closedDay.trim().toLowerCase())
    : allDays

  return {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: CLINIC.name,
    description: `${CLINIC.tagline} in ${CLINIC.address.city}`,
    url: SITE_URL,
    telephone: CLINIC.phone.display,
    ...(logoUrl ? { image: logoUrl, logo: logoUrl } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: CLINIC.address.area,
      addressLocality: CLINIC.address.city,
      addressCountry: 'PK',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: openDays,
        opens: '10:00',
        closes: '17:00',
      },
    ],
    medicalSpecialty: ['Dentistry', 'Homeopathic'],
    priceRange: 'PKR',
  }
}

/**
 * Timings ka jumla banata hai. Agar chutti ka din set ho to
 * "Open Daily" khud ba khud hat jata hai.
 */
export function timingsLine(closedDay?: string | null) {
  const day = closedDay?.trim()
  if (!day) return CLINIC.timings.full

  // Chutti ho to "Open Daily" ghalat hoga, hours + chutti likhein
  return `${CLINIC.timings.short} · ${day} closed`
}

/** WhatsApp message ke aakhir mein lagne wali do lines */
export const CLINIC_SIGNATURE = [
  CLINIC.doctor.name,
  `${CLINIC.name} · ${CLINIC.address.full} · ${CLINIC.phone.display}`,
]

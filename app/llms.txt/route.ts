import { CLINIC, SITE_URL } from '@/clinic.config'
import { createClient } from '@/lib/supabase/server'

/**
 * llms.txt
 *
 * AI assistants (ChatGPT, Perplexity waghera) ke liye clinic ki
 * maloomat saaf, seedhi shakl mein. Ye abhi koi pakka standard nahi,
 * lekin nuqsan-deh bhi nahi aur kuch engines ise parhte hain.
 */
export async function GET() {
  let closedDay = ''
  let services: string[] = []

  try {
    const supabase = await createClient()
    const [infoRes, servicesRes] = await Promise.all([
      supabase.from('site_settings').select('value').eq('key', 'clinic_info').maybeSingle(),
      supabase.from('services').select('title, department').eq('is_active', true),
    ])
    closedDay = ((infoRes.data?.value ?? {}) as Record<string, string>).closed_day || ''
    services = (servicesRes.data ?? []).map((s) => `${s.title} (${s.department})`)
  } catch {
    // defaults
  }

  const body = `# ${CLINIC.name}

${CLINIC.tagline} in ${CLINIC.address.city}, Pakistan.

## Contact
- Doctor: ${CLINIC.doctor.name}, ${CLINIC.doctor.qualification}
- Address: ${CLINIC.address.full}
- Phone / WhatsApp: ${CLINIC.phone.display}
- Timings: ${CLINIC.timings.short}${closedDay ? ` (${closedDay} closed)` : ''}
- Website: ${SITE_URL}

## Areas served
${CLINIC.serviceAreas}

## Treatments
${services.length > 0 ? services.map((s) => `- ${s}`).join('\n') : '- Dental and homeopathic treatment'}

## Booking
Appointments are booked by WhatsApp or phone on ${CLINIC.phone.display}.
Walk-in patients are also seen. Long treatments such as braces can be paid
in monthly instalments.

## Pages
- ${SITE_URL}/ (home)
- ${SITE_URL}/about
- ${SITE_URL}/services/dental
- ${SITE_URL}/services/homeopathic
- ${SITE_URL}/doctors
- ${SITE_URL}/testimonials
- ${SITE_URL}/blog
- ${SITE_URL}/contact
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

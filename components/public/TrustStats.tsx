import { createClient } from '@/lib/supabase/server'

interface Stat {
  label: string
  value: string
}

// Kept factual/non-numeric by default (no invented "X years" or "Y patients")
// , Dr. Sahib can overwrite these from the CMS with real figures anytime.
const DEFAULT_STATS: Stat[] = [
  { value: '2', label: 'Specialties Under One Roof' },
  { value: 'Daily', label: '10:00 AM – 5:00 PM' },
  { value: '1-on-1', label: 'Consultation With Dr. Khalid' },
  { value: 'WhatsApp', label: 'Instant Appointment Booking' },
]

export default async function TrustStats() {
  let stats = DEFAULT_STATS
  let closedDay = ''

  try {
    const supabase = await createClient()
    const [statsRes, clinicRes] = await Promise.all([
      supabase.from('site_settings').select('value').eq('key', 'trust_stats').single(),
      supabase.from('site_settings').select('value').eq('key', 'clinic_info').maybeSingle(),
    ])
    if (Array.isArray(statsRes.data?.value) && statsRes.data.value.length > 0) {
      stats = statsRes.data.value
    }
    closedDay = ((clinicRes.data?.value ?? {}) as Record<string, string>).closed_day || ''
  } catch {
    // fallback to DEFAULT_STATS
  }

  // "Daily" ka card chutti ke din ke sath contradict na kare
  const displayStats = stats.map((s) =>
    s.value.trim().toLowerCase() === 'daily' && closedDay
      ? { ...s, value: `Except ${closedDay}` }
      : s
  )

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {displayStats.map((stat, i) => (
          <div key={i} className="rounded-2xl bg-clinic-mint p-5 text-center">
            <p className="font-display text-2xl font-semibold text-clinic-teal">{stat.value}</p>
            <p className="mt-1 text-xs text-clinic-ink/60">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

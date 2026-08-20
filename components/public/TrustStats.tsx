import { createClient } from '@/lib/supabase/server'

interface Stat {
  label: string
  value: string
}

// Kept factual/non-numeric by default (no invented "X years" or "Y patients")
// — Dr. Sahib can overwrite these from the CMS with real figures anytime.
const DEFAULT_STATS: Stat[] = [
  { value: '2', label: 'Specialties Under One Roof' },
  { value: 'Daily', label: '10:00 AM – 5:00 PM' },
  { value: '1-on-1', label: 'Consultation With Dr. Khalid' },
  { value: 'WhatsApp', label: 'Instant Appointment Booking' },
]

export default async function TrustStats() {
  let stats = DEFAULT_STATS
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'trust_stats')
      .single()
    if (Array.isArray(data?.value) && data.value.length > 0) stats = data.value
  } catch {
    // fallback to DEFAULT_STATS
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={i} className="rounded-2xl bg-clinic-mint p-5 text-center">
            <p className="font-display text-2xl font-semibold text-clinic-teal">{stat.value}</p>
            <p className="mt-1 text-xs text-clinic-ink/60">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

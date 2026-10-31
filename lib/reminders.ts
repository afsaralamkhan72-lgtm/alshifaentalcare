import { createClient } from '@/lib/supabase/server'

/** Kitne din pehle appointment yaad dilani hai (Setup se badal sakte hain; default 3) */
export async function getReminderDays(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'appointment_reminder_days').maybeSingle()
    const n = Number((data?.value as { days?: number } | null)?.days)
    return Number.isFinite(n) && n >= 1 && n <= 14 ? n : 3
  } catch {
    return 3
  }
}

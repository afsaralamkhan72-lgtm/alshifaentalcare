import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffProfile, isOwnerRole } from '@/lib/auth'
import { todayKarachi } from '@/lib/karachi'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Jin tables ki copy li jati hai (patient ka sara record). Sirf padhta hai, kuch badalta nahi. */
const TABLES = [
  'patients', 'patient_history', 'patient_treatments', 'treatment_episodes', 'treatment_plans', 'installments',
  'clinical_visits', 'visit_notes', 'dental_chart', 'prescriptions', 'appointments', 'appointment_history',
  'invoices', 'invoice_items', 'payments', 'transactions', 'day_closings', 'recalls', 'lab_cases', 'labs',
  'inventory', 'inventory_movements', 'medicines', 'treatment_catalog', 'treatment_materials', 'treating_doctors',
  'patient_photos', 'staff_profiles', 'staff_permissions', 'staff_members', 'staff_ledger', 'clinic_options', 'site_settings', 'treatment_stages', 'message_templates',
]

/** Sirf Admin / Doctor (owner): poore data ki JSON copy download. Ye sirf ek sahulat hai; asal backup Supabase ke dashboard mein bhi rakhein. */
export async function GET() {
  const me = await getStaffProfile().catch(() => null)
  if (!me || !isOwnerRole(me.role)) return NextResponse.json({ error: 'Sirf Admin / Doctor' }, { status: 403 })
  const sb = await createClient()
  const out: Record<string, unknown[]> = {}
  const problems: string[] = []
  for (const t of TABLES) {
    const rows: unknown[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(t).select('*').range(from, from + 999)
      if (error) {
        problems.push(`${t}: ${error.message}`)
        break
      }
      rows.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    out[t] = rows
  }
  // Yaad dehani ke liye: aakhri backup kab hua
  await sb.from('site_settings').upsert({ key: 'last_backup_at', value: todayKarachi(), updated_by: me.id }, { onConflict: 'key' })
  const body = JSON.stringify({ made_on: todayKarachi(), problems, counts: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])), data: out })
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="al-shifa-backup-${todayKarachi()}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}

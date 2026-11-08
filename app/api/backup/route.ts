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
  // Baad mein jude hisse: payment plans, hazri/salary, discount, kharche, loyalty, stock ginti
  'payment_plans', 'payment_plan_items', 'discount_log', 'discount_limits', 'invoice_counter', 'treatment_price_history',
  'staff_attendance', 'attendance_rules', 'attendance_requests', 'leave_types', 'clinic_days', 'payroll_periods',
  'expense_categories', 'expense_budgets', 'expense_receipts', 'inventory_meta', 'inventory_purchase_meta', 'stock_counts',
  'loyalty_program', 'loyalty_rewards', 'loyalty_stamps', 'loyalty_unlocks', 'loyalty_signups', 'scratch_prizes', 'scratch_cards',
  // Audit history aur website ka content
  'audit_log', 'blog_posts', 'clinic_photos', 'doctors', 'gallery', 'services', 'testimonials', 'videos',
]
// Jan-boojh kar shamil NAHI (raaz ya waqti): staff_portal_access/log (PIN aur token ke hash), push_keys, push_subs, device_tokens,
// share_links, loyalty_devices, loyalty_scan_log, notify_log, _migration_report, permission_catalog (seed se wapas aa jata hai).

/** Har page ek tay tarteeb mein aaye, warna 1000 se bari table mein row dohri ya gum ho sakti hai */
const ORDER_BY: Record<string, string[]> = {
  site_settings: ['key'],
  discount_limits: ['role'],
  staff_permissions: ['user_id', 'perm_code'],
}

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
      const cols = ORDER_BY[t] ?? ['id']
      let q = sb.from(t).select('*')
      for (const c of cols) q = q.order(c, { ascending: true })
      let { data, error } = await q.range(from, from + 999)
      if (error && /column|order/i.test(error.message) && from === 0) {
        // Is table mein ye column nahi: bina tarteeb ke try (chhoti table ke liye theek)
        ;({ data, error } = await sb.from(t).select('*').range(from, from + 999))
      }
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

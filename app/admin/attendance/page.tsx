import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import { todayKarachi } from '@/lib/karachi'
import AttendanceManager, { type AttRow, type SummaryRow, type Rules } from '@/components/admin/AttendanceManager'

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ d?: string; m?: string }> }) {
  await requireOwner()
  const sp = await searchParams
  const today = todayKarachi()
  const date = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) && sp.d <= today ? sp.d : today
  const period = sp.m && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m) ? sp.m : date.slice(0, 7)
  const supabase = await createClient()

  const [staffRes, attRes, rulesRes, sumRes] = await Promise.all([
    supabase.from('staff_members').select('id, full_name, title').eq('is_active', true).order('full_name'),
    supabase.from('staff_attendance').select('staff_id, status, check_in, check_out, note').eq('att_date', date),
    supabase.from('attendance_rules').select('work_start, grace_minutes, late_cut, absent_cut').eq('id', 1).maybeSingle(),
    supabase.rpc('attendance_summary', { p_period: period }),
  ])

  if (attRes.error || rulesRes.error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Staff ki hazri</h1>
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Pehle <strong>al-shifa-FINAL30-SQL.sql</strong> Supabase SQL Editor mein chalayein.
        </p>
      </div>
    )
  }

  const rules = (rulesRes.data ?? { work_start: '09:00:00', grace_minutes: 15, late_cut: 0, absent_cut: false }) as Rules
  return (
    <div>
      <Link href="/admin/payroll" className="mb-2 inline-block text-sm text-clinic-ink/50 hover:text-clinic-teal">← Salary</Link>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Staff ki hazri</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">Roz ki hazri, aane / jaane ka waqt, late, aur mahine ka hisaab. Katauti sirf aap ke dabane par lagti hai.</p>
      <AttendanceManager
        date={date}
        today={today}
        period={period}
        staff={(staffRes.data ?? []) as { id: string; full_name: string; title: string | null }[]}
        att={(attRes.data ?? []) as AttRow[]}
        rules={{ ...rules, late_cut: Number(rules.late_cut) }}
        summary={((sumRes.data ?? []) as SummaryRow[]).map((r) => ({ ...r, monthly_salary: Number(r.monthly_salary), suggested: Number(r.suggested) }))}
        summaryError={sumRes.error ? sumRes.error.message : ''}
      />
    </div>
  )
}

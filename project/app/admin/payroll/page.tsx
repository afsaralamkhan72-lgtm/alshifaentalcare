import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayKarachi } from '@/lib/karachi'
import PayrollManager, {
  type StaffRow,
  type BalanceRow,
  type LedgerRow,
  type AccessRow,
} from '@/components/admin/PayrollManager'

export default async function PayrollPage() {
  await requireOwner()
  const supabase = await createClient()
  const today = todayKarachi()

  const [staffRes, balRes, ledRes] = await Promise.all([
    supabase
      .from('staff_members')
      .select('id, full_name, title, phone, monthly_salary, is_active')
      .order('is_active', { ascending: false })
      .order('full_name'),
    supabase.from('staff_balances').select('staff_id, balance, total_advance, unconfirmed'),
    supabase
      .from('staff_ledger')
      .select('id, staff_id, entry_date, kind, amount, period, note, acknowledged_at')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1500),
  ])

  if (staffRes.error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Staff Salary</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase mein <strong>phase7-staff.sql</strong> chalayein (pehle test project par).
          </p>
        </div>
      </div>
    )
  }

  // Portal ki halat sirf server (service key) padh sakta hai
  let access: AccessRow[] = []
  const admin = createAdminClient()
  if (admin) {
    const { data } = await admin.from('staff_portal_access').select('staff_id, revoked_at, last_login_at, locked_until')
    access = (data ?? []) as AccessRow[]
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Staff Salary &amp; Advance</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Salary, advance (Rs. 1 bhi), bonus aur katauti. Har staff ka apna hisaab, alag link aur PIN se.
      </p>
      <div className="mt-6">
        <PayrollManager
          today={today}
          period={today.slice(0, 7)}
          staff={(staffRes.data ?? []) as StaffRow[]}
          balances={(balRes.data ?? []) as BalanceRow[]}
          ledger={(ledRes.data ?? []) as LedgerRow[]}
          access={access}
        />
      </div>
    </div>
  )
}

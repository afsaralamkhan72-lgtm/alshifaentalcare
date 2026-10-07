import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { STAFF_COOKIE, hashToken, readSession } from '@/lib/staffPortal'
import { CLINIC } from '@/clinic.config'
import { money, fmtDate } from '@/lib/karachi'
import { PinForm, AckButton, LogoutButton } from '@/components/StaffPortalClient'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: `Staff | ${CLINIC.name}`,
  robots: { index: false, follow: false },
}

const KIND_LABEL: Record<string, string> = {
  salary_due: 'Mahana salary',
  bonus: 'Bonus',
  deduction: 'Katauti',
  advance: 'Advance (peshgi)',
  payout: 'Salary mili',
}

export default async function StaffPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = createAdminClient()

  if (!db) {
    return (
      <Shell>
        <p className="text-sm text-clinic-ink/60">Portal abhi setup nahi hua.</p>
      </Shell>
    )
  }

  // Link sahi hai? (token ka hash mile, revoke na hua ho)
  const { data: acc } = await db
    .from('staff_portal_access')
    .select('staff_id, revoked_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  if (!acc || acc.revoked_at) {
    return (
      <Shell>
        <h1 className="font-display text-xl font-semibold text-clinic-ink">Link kaam nahi kar raha</h1>
        <p className="mt-2 text-sm text-clinic-ink/60">Ye link band ho chuka hai ya ghalat hai. Doctor sahib se naya link mangwa lein.</p>
      </Shell>
    )
  }

  const jar = await cookies()
  const sessionStaff = readSession(jar.get(STAFF_COOKIE)?.value)

  if (sessionStaff !== acc.staff_id) {
    return (
      <Shell>
        <h1 className="font-display text-xl font-semibold text-clinic-ink">Staff Hisaab</h1>
        <p className="mt-1 text-sm text-clinic-ink/60">Apna hisaab dekhne ke liye PIN likhein.</p>
        <PinForm token={token} />
      </Shell>
    )
  }

  const [memberRes, balRes, ledRes] = await Promise.all([
    db.from('staff_members').select('full_name, title, monthly_salary, is_active').eq('id', acc.staff_id).maybeSingle(),
    db.from('staff_balances').select('*').eq('staff_id', acc.staff_id).maybeSingle(),
    db
      .from('staff_ledger')
      .select('id, entry_date, kind, amount, period, note, acknowledged_at')
      .eq('staff_id', acc.staff_id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const m = memberRes.data
  if (!m || !m.is_active) {
    return (
      <Shell>
        <p className="text-sm text-clinic-ink/60">Ye khata abhi chalu nahi hai.</p>
      </Shell>
    )
  }
  const b = balRes.data
  const rows = ledRes.data ?? []

  return (
    <Shell>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-clinic-amber">Mera hisaab</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-clinic-ink">{m.full_name}</h1>
          {m.title && <p className="text-sm text-clinic-ink/50">{m.title}</p>}
        </div>
        <LogoutButton token={token} />
      </div>

      <div className="mt-5 rounded-2xl bg-clinic-teal p-5 text-white">
        <p className="text-xs text-white/60">Abhi aap ke baqaya (mile ge)</p>
        <p className="mt-1 font-display text-3xl font-semibold">{money(b?.balance ?? 0)}</p>
        <p className="mt-2 text-xs text-white/60">Mahana salary: {money(m.monthly_salary)}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        <Box label="Salary bani" value={money(b?.total_salary_due ?? 0)} />
        <Box label="Bonus" value={money(b?.total_bonus ?? 0)} tone="green" />
        <Box label="Advance liya" value={money(b?.total_advance ?? 0)} tone="amber" />
        <Box label="Salary mili" value={money(b?.total_payout ?? 0)} />
      </div>
      {Number(b?.total_deduction ?? 0) > 0 && (
        <p className="mt-2 text-xs text-clinic-ink/50">Katauti: {money(b?.total_deduction)}</p>
      )}

      <h2 className="mt-8 font-display font-semibold text-clinic-ink">Poori history</h2>
      <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
        {rows.length === 0 && <p className="p-4 text-sm text-clinic-ink/50">Abhi koi entry nahi.</p>}
        {rows.map((r) => {
          const amt = Number(r.amount)
          const cash = r.kind === 'advance' || r.kind === 'payout'
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-clinic-ink">
                  {KIND_LABEL[r.kind] ?? r.kind}
                  {r.period ? <span className="ml-2 text-xs text-clinic-ink/40">{r.period}</span> : null}
                </p>
                <p className="text-xs text-clinic-ink/50">
                  {fmtDate(r.entry_date)}
                  {r.note ? ` · ${r.note}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-display font-semibold ${amt >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {amt >= 0 ? '+' : '-'}
                  {money(Math.abs(amt))}
                </p>
                {cash &&
                  (r.acknowledged_at ? (
                    <p className="text-[11px] text-emerald-700">Mil gaye ✓</p>
                  ) : (
                    <div className="mt-1">
                      <AckButton token={token} entryId={r.id} />
                    </div>
                  ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-clinic-ink/40">
        Ye link aur PIN sirf aap ke liye hain, kisi ko na batayein. Koi ghalti nazar aaye to clinic se raabta karein.
      </p>
    </Shell>
  )
}

function Box({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' }) {
  const cls =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-clinic-teal/10 bg-white text-clinic-ink'
  return (
    <div className={`rounded-2xl border p-3 ${cls}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 font-display text-sm font-semibold">{value}</p>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-clinic-sand">
      <header className="border-b border-clinic-teal/10 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <span className="font-display font-semibold text-clinic-teal">{CLINIC.name}</span>
          <span className="text-xs text-clinic-ink/40">Staff</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  )
}

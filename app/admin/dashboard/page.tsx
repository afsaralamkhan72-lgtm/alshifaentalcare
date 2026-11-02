import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/admin/StatCard'
import { toInternationalPKNumber } from '@/lib/whatsapp'
import { getStaffProfile, isOwnerRole, getPermissions } from '@/lib/auth'
import { fmtDate, addDays } from '@/lib/karachi'
import { getReminderDays } from '@/lib/reminders'
import WhatsAppMenu from '@/components/admin/WhatsAppMenu'
import { apptReminderLink } from '@/lib/messages'
import { mapTemplates } from '@/lib/messageTemplates'
import OwnerToday from '@/components/admin/OwnerToday'
import { todayKarachi } from '@/lib/karachi'

function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}` }
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function getDashboardStats(month: string, canSeeMoney: boolean) {
  const supabase = await createClient()
  const { start: monthStart, end: monthEnd } = monthBounds(month)

  const todayStr = todayKarachi()
  const [totalRes, dentalRes, homeoRes, incomeRes, expenseRes, pendingRes, duesRes, repRes] = await Promise.all([
    supabase.from('patients').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('patients').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('department', 'dental'),
    supabase.from('patients').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('department', 'homeopathic'),
    canSeeMoney
      ? supabase
          .from('transactions')
          .select('amount, treatment_name, category, patient_id')
          .eq('type', 'income')
          .gte('transaction_date', monthStart)
          .lte('transaction_date', monthEnd)
      : Promise.resolve({ data: [] as { amount: number; treatment_name: string | null; category: string | null; patient_id: string | null }[] }),
    canSeeMoney
      ? supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'expense')
          .gte('transaction_date', monthStart)
          .lte('transaction_date', monthEnd)
      : Promise.resolve({ data: [] as { amount: number }[] }),
    supabase
      .from('appointments')
      .select('id, patient_name, phone, department, treatment_name, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    // Baqaya payments jo aaj ya us se pehle due hain
    canSeeMoney
      ? supabase
          .from('transactions')
          .select('balance_due, due_date, patients(full_name)')
          .gt('balance_due', 0)
          .is('settled_at', null)
          .lte('due_date', todayStr)
          .order('due_date', { ascending: true })
      : Promise.resolve({ data: [] }),
    canSeeMoney ? supabase.rpc('report_summary', { p_from: monthStart, p_to: monthEnd }) : Promise.resolve({ data: null }),
  ])

  const dueRows = duesRes.data

  const dues = (dueRows ?? []) as unknown as {
    balance_due: number
    patients: { full_name: string } | null
  }[]
  const dueAmount = dues.reduce((sum, d) => sum + Number(d.balance_due), 0)

  const incomeRows = incomeRes.data ?? []
  const income = incomeRows.reduce((sum, t) => sum + Number(t.amount), 0)

  // Kaunsa treatment kitna chala aur kitna kamaya
  const byTreatment = new Map<string, { total: number; count: number }>()
  for (const t of incomeRows) {
    const raw = (t.treatment_name as string | null)?.trim()
    if (!raw) continue
    // "RCT (baqaya)" aur "RCT (advance)" ko aik hi ginein
    const name = raw.replace(/\s*\((baqaya|advance|month \d+)\)\s*/i, '').trim()
    if (!name) continue
    const row = byTreatment.get(name) ?? { total: 0, count: 0 }
    row.total += Number(t.amount)
    row.count += 1
    byTreatment.set(name, row)
  }

  const treatments = [...byTreatment.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // Dental vs Homeopathic income
  const patientIds = [...new Set(incomeRows.map((t) => t.patient_id).filter(Boolean))]
  let deptIncome = { dental: 0, homeopathic: 0, other: 0 }

  if (patientIds.length > 0) {
    const { data: pts } = await supabase
      .from('patients')
      .select('id, department')
      .in('id', patientIds as string[])

    const deptById = new Map((pts ?? []).map((p) => [p.id, p.department]))
    for (const t of incomeRows) {
      const dept = t.patient_id ? deptById.get(t.patient_id as string) : null
      if (dept === 'dental') deptIncome.dental += Number(t.amount)
      else if (dept === 'homeopathic') deptIncome.homeopathic += Number(t.amount)
      else deptIncome.other += Number(t.amount)
    }
  } else {
    deptIncome.other = income
  }
  let expense = expenseRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0
  let incomeTotal = income
  // Phase 9: poore mahine ka total database se (select ki 1000 rows ki hadd se bachne ke liye)
  if (canSeeMoney) {
    const rep = repRes.data
    if (rep) {
      incomeTotal = Number((rep as { income: number }).income)
      expense = Number((rep as { expense: number }).expense)
    }
  }

  return {
    totalPatients: totalRes.count ?? 0,
    dentalCount: dentalRes.count ?? 0,
    homeoCount: homeoRes.count ?? 0,
    income: incomeTotal,
    expense,
    pendingAppointments: pendingRes.data ?? [],
    dues,
    dueAmount,
    treatments,
    deptIncome,
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; denied?: string }>
}) {
  const params = await searchParams
  const currentMonth = todayKarachi().slice(0, 7)
  const month = /^\d{4}-\d{2}$/.test(params.month ?? '') ? (params.month as string) : currentMonth

  const [profile, perms] = await Promise.all([getStaffProfile(), getPermissions()])
  const canSeeMoney = isOwnerRole(profile.role)

  // Har hissa alag se aata hai (Suspense): upar ka "Aaj" foran dikhta hai, baqi peeche se bhar jata hai
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Aaj</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">{fmtDate(todayKarachi())}</p>
        </div>
      </div>

      {params.denied && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aap ko ye page kholne ki ijazat nahi. Zaroorat ho to Admin se &quot;Staff aur Permissions&quot; mein ijazat lagwayein.
        </div>
      )}
      {canSeeMoney && (
        <Suspense fallback={null}>
          <BackupReminder />
        </Suspense>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {perms.includes('patients.create') && (
          <Link href="/admin/patients?new=1" className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">+ Naya patient</Link>
        )}
        {perms.includes('appointments.view') && (
          <Link href="/admin/appointments" className="rounded-full border border-clinic-teal/40 px-4 py-2 text-sm font-semibold text-clinic-teal">Appointments</Link>
        )}
        {perms.includes('billing.view') && (
          <Link href="/admin/dues" className="rounded-full border border-clinic-teal/40 px-4 py-2 text-sm font-semibold text-clinic-teal">Payment lein</Link>
        )}
        <Link href="/admin/patients" className="rounded-full border border-clinic-teal/40 px-4 py-2 text-sm font-semibold text-clinic-teal">Patient talash</Link>
      </div>
      <Suspense fallback={<SectionLoading />}>
        <TodayBoard perms={perms} />
      </Suspense>
      {canSeeMoney && (
        <Suspense fallback={<SectionLoading />}>
          <OwnerToday />
        </Suspense>
      )}
      {canSeeMoney ? (
        <Suspense fallback={<SectionLoading label="Mahine ka jaiza load ho raha hai..." />}>
          <MonthSection month={month} currentMonth={currentMonth} canSeeMoney={canSeeMoney} />
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <StockAlerts />
        </Suspense>
      )}
    </div>
  )
}

function SectionLoading({ label = 'Load ho raha hai...' }: { label?: string }) {
  return <div className="mt-6 animate-pulse rounded-2xl border border-clinic-teal/10 bg-white p-6 text-sm text-clinic-ink/40">{label}</div>
}

async function BackupReminder() {
  const sb = await createClient()
  const { data } = await sb.from('site_settings').select('value').eq('key', 'last_backup_at').maybeSingle()
  const last = data?.value ? String(data.value) : null
  const days = last ? Math.floor((Date.parse(todayKarachi()) - Date.parse(last)) / 86_400_000) : null
  if (days !== null && days <= 7) return null
  return (
    <Link href="/admin/settings?s=backup" className="mt-4 block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {days === null ? 'Data ki copy (backup) abhi tak nahi li gayi.' : `Aakhri backup ${days} din pehle liya tha.`} <span className="font-semibold underline">Abhi lein →</span>
    </Link>
  )
}

async function StockAlerts() {
  const sb = await createClient()
  const { data } = await sb.from('inventory').select('item_name, quantity, reorder_level, is_active')
  const low = (data ?? []).filter((r) => r.is_active !== false && Number(r.quantity) <= Number(r.reorder_level))
  if (low.length === 0) return null
  return (
    <Link href="/admin/inventory" className="mt-6 block rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-700">{low.length} samaan khatam hone wala hai</p>
      <p className="mt-1 text-xs text-red-600">{low.slice(0, 6).map((i) => `${i.item_name} (${Number(i.quantity)})`).join(', ')}</p>
    </Link>
  )
}

async function MonthSection({ month, currentMonth, canSeeMoney }: { month: string; currentMonth: string; canSeeMoney: boolean }) {
  // Samaan ke alerts (kam stock / expiry) aur mahine ka hisaab: sab aik saath
  const supabaseAlerts = await createClient()
  const [stats, { data: stockRows }] = await Promise.all([
    getDashboardStats(month, canSeeMoney),
    supabaseAlerts.from('inventory').select('item_name, quantity, unit, reorder_level, expiry_date, is_active'),
  ])
  const liveStock = (stockRows ?? []).filter((r) => r.is_active !== false)
  const lowStock = liveStock.filter((r) => Number(r.quantity) <= Number(r.reorder_level))
  const expiring = liveStock.filter(
    (r) => r.expiry_date && (new Date(r.expiry_date).getTime() - Date.now()) / 86_400_000 <= 30
  )
  const { dues, dueAmount } = stats

  const monthLabel = new Date(`${month}-01`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
  const isCurrentMonth = month === currentMonth

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-clinic-teal/10 pt-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Mahine ka jaiza</h2>
          <p className="text-sm text-clinic-ink/60">{monthLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/dashboard?month=${shiftMonth(month, -1)}`}
            className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm text-clinic-ink/70"
          >
            ← Pichla
          </Link>
          <form className="flex items-center gap-2">
            <input
              type="month"
              name="month"
              defaultValue={month}
              className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-clinic-teal px-3 py-2 text-sm font-semibold text-white">
              Dekhein
            </button>
          </form>
          <Link
            href={`/admin/dashboard?month=${shiftMonth(month, 1)}`}
            className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm text-clinic-ink/70"
          >
            Agla →
          </Link>
          {!isCurrentMonth && (
            <Link
              href="/admin/dashboard"
              className="rounded-lg bg-clinic-mint px-3 py-2 text-sm font-semibold text-clinic-teal"
            >
              Aaj
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Kul patients" value={stats.totalPatients} />
        <StatCard label="Dental patients" value={stats.dentalCount} accent="teal" />
        <StatCard label="Homeopathic patients" value={stats.homeoCount} accent="amber" />
        {canSeeMoney && (
          <>
            <StatCard label={`Wasooli (${monthLabel})`} value={`Rs. ${stats.income.toLocaleString()}`} accent="green" />
            <StatCard label={`Kharche (${monthLabel})`} value={`Rs. ${stats.expense.toLocaleString()}`} accent="red" />
          </>
        )}
      </div>

      {(lowStock.length > 0 || expiring.length > 0) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {lowStock.length > 0 && (
            <Link href="/admin/inventory" className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">{lowStock.length} samaan khatam hone wala hai</p>
              <p className="mt-1 text-xs text-red-600">
                {lowStock.slice(0, 6).map((i) => `${i.item_name} (${Number(i.quantity)})`).join(', ')}
                {lowStock.length > 6 ? ' ...' : ''}
              </p>
            </Link>
          )}
          {expiring.length > 0 && (
            <Link href="/admin/inventory" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-700">{expiring.length} samaan ki expiry qareeb hai</p>
              <p className="mt-1 text-xs text-amber-600">{expiring.slice(0, 6).map((i) => i.item_name).join(', ')}</p>
            </Link>
          )}
        </div>
      )}

      {/* Income kahan se aa rahi hai */}
      {canSeeMoney && (
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
          <p className="font-display font-semibold text-clinic-ink">
            Kaun si treatment zyada ho rahi hai
          </p>
          <p className="mt-1 text-sm text-clinic-ink/60">{monthLabel}</p>

          {stats.treatments.length === 0 ? (
            <p className="mt-4 text-sm text-clinic-ink/50">
              Is mahine treatment ke naam ke sath koi income record nahi hui.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {stats.treatments.map((t) => {
                const max = stats.treatments[0].total || 1
                return (
                  <div key={t.name}>
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-medium text-clinic-ink">{t.name}</span>
                      <span className="text-clinic-ink">
                        Rs. {t.total.toLocaleString()}
                        <span className="ml-2 text-xs text-clinic-ink/60">
                          {t.count} payments
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-clinic-mint">
                      <div
                        className="h-full rounded-full bg-clinic-teal"
                        style={{ width: `${Math.max(4, (t.total / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
          <p className="font-display font-semibold text-clinic-ink">Wasooli kis department se</p>
          <p className="mt-1 text-sm text-clinic-ink/60">{monthLabel}</p>

          <div className="mt-4 grid gap-3">
            {[
              { label: 'Dental', value: stats.deptIncome.dental, color: 'bg-clinic-teal' },
              {
                label: 'Homeopathic',
                value: stats.deptIncome.homeopathic,
                color: 'bg-clinic-amber',
              },
              {
                label: 'Patient ke bagair (walk-in / general)',
                value: stats.deptIncome.other,
                color: 'bg-clinic-ink/30',
              },
            ].map((d) => {
              const total = stats.income || 1
              return (
                <div key={d.label}>
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="font-medium text-clinic-ink">{d.label}</span>
                    <span className="text-clinic-ink">Rs. {d.value.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-clinic-mint">
                    <div
                      className={`h-full rounded-full ${d.color}`}
                      style={{ width: `${Math.max(2, (d.value / total) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <Link
            href={`/admin/reports?month=${month}`}
            className="mt-4 inline-block text-sm font-semibold text-clinic-teal hover:underline"
          >
            Poori report dekhein →
          </Link>
        </section>
      </div>
      )}

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Pending Appointment Requests</h2>

        {stats.pendingAppointments.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-clinic-mint text-left text-clinic-ink/60">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Treatment</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {stats.pendingAppointments.map((a) => (
                  <tr key={a.id} className="border-t border-clinic-teal/10">
                    <td className="px-4 py-2">{a.patient_name}</td>
                    <td className="px-4 py-2">{a.phone}</td>
                    <td className="px-4 py-2 capitalize">{a.department ?? '—'}</td>
                    <td className="px-4 py-2">{a.treatment_name ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <a
                        href={`https://wa.me/${toInternationalPKNumber(a.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-whatsapp px-3 py-1 text-xs font-semibold text-white"
                      >
                        WhatsApp
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-clinic-ink/50">No pending appointment requests.</p>
        )}
      </div>
    </>
  )
}

/** Doctor ke liye sab se pehle: aaj kaun aa raha hai, kaun reh gaya, lab ka kya bana */
async function TodayBoard({ perms }: { perms: string[] }) {
  const supabase = await createClient()
  const today = todayKarachi()
  const canAppt = perms.includes('appointments.view')
  const canLab = perms.includes('lab.view')
  const days = await getReminderDays()
  const [todayRes, missedRes, labRes, soonRes, activeRes, visitsTodayRes, cvTodayRes] = await Promise.all([
    canAppt
      ? supabase
          .from('appointments')
          .select('id, patient_name, phone, treatment_name, preferred_time, status, patient_id')
          .is('deleted_at', null)
          .eq('preferred_date', today)
          .in('status', ['pending', 'confirmed', 'arrived', 'completed'])
          .order('preferred_time', { ascending: true })
      : Promise.resolve({ data: [] }),
    canAppt
      ? supabase
          .from('appointments')
          .select('id, patient_name, phone, treatment_name, preferred_date, patient_id')
          .is('deleted_at', null)
          .lt('preferred_date', today)
          .gte('preferred_date', new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10))
          .eq('status', 'confirmed')
          .order('preferred_date', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
    canLab
      ? supabase
          .from('lab_cases')
          .select('id, case_number, work_type, lab_name, due_date, status, patients(full_name)')
          .is('deleted_at', null)
          .in('status', ['pending', 'sent', 'in_progress', 'received'])
          .order('due_date', { ascending: true })
          .limit(30)
      : Promise.resolve({ data: [] }),
    canAppt
      ? supabase
          .from('appointments')
          .select('id, patient_name, phone, treatment_name, preferred_date, preferred_time, patient_id, doctor')
          .is('deleted_at', null)
          .gt('preferred_date', today)
          .lte('preferred_date', addDays(today, days))
          .in('status', ['pending', 'confirmed'])
          .order('preferred_date')
          .order('preferred_time')
          .limit(40)
      : Promise.resolve({ data: [] }),
    perms.includes('clinical.view')
      ? supabase.from('patient_treatments').select('id', { count: 'exact', head: true }).eq('status', 'active')
      : Promise.resolve({ count: null }),
    perms.includes('clinical.view')
      ? supabase.from('visit_notes').select('patient_id').eq('visit_date', today).is('voided_at', null)
      : Promise.resolve({ data: null }),
    // Nayi visit (jis mein sirf muaina / prescription ho aur treatment na ho) bhi gini jaye
    perms.includes('clinical.view')
      ? supabase.from('clinical_visits').select('patient_id').eq('visit_date', today).eq('status', 'finished')
      : Promise.resolve({ data: null }),
  ])
  const tpl = mapTemplates(((await supabase.from('message_templates').select('key, body')).data ?? []) as { key: string; body: string }[])
  const soon = (soonRes.data ?? []) as { id: string; patient_name: string; phone: string; treatment_name: string | null; preferred_date: string; preferred_time: string | null; patient_id: string | null; doctor: string | null }[]
  const activeCount = 'count' in activeRes ? activeRes.count : null
  const seenToday = visitsTodayRes.data
    ? new Set([...(visitsTodayRes.data as { patient_id: string }[]), ...((cvTodayRes.data ?? []) as { patient_id: string }[])].map((v) => v.patient_id)).size
    : null
  const todays = (todayRes.data ?? []) as { id: string; patient_name: string; phone: string; treatment_name: string | null; preferred_time: string | null; status: string; patient_id: string | null }[]
  const missed = (missedRes.data ?? []) as { id: string; patient_name: string; phone: string; treatment_name: string | null; preferred_date: string; patient_id: string | null }[]
  const labs = ((labRes.data ?? []) as unknown as { id: string; case_number: string | null; work_type: string | null; lab_name: string; due_date: string | null; status: string; patients: { full_name: string } | null }[])
    .filter((l) => l.status === 'received' || (l.due_date && l.due_date <= today))
  if (!canAppt && !canLab) return null

  const who = (a: { patient_id: string | null; patient_name: string; phone: string }) =>
    a.patient_id ? (
      <Link href={`/admin/patients/${a.patient_id}`} className="font-medium text-clinic-ink hover:text-clinic-teal">
        {a.patient_name}
      </Link>
    ) : (
      <Link href={`/admin/search?q=${encodeURIComponent(a.phone)}`} className="font-medium text-clinic-ink hover:text-clinic-teal">
        {a.patient_name}
      </Link>
    )

  return (
    <>
    {(seenToday !== null || activeCount !== null) && (
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {seenToday !== null && (
          <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
            <p className="text-xs text-clinic-ink/50">Aaj ke patients (visit hua)</p>
            <p className="font-display text-2xl font-semibold text-clinic-ink">{seenToday}</p>
          </div>
        )}
        {canAppt && (
          <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
            <p className="text-xs text-clinic-ink/50">Aaj ki appointments</p>
            <p className="font-display text-2xl font-semibold text-clinic-ink">{todays.length}</p>
          </div>
        )}
        {canAppt && (
          <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
            <p className="text-xs text-clinic-ink/50">Agle {days} din</p>
            <p className="font-display text-2xl font-semibold text-clinic-ink">{soon.length}</p>
          </div>
        )}
        {activeCount !== null && (
          <Link href="/admin/treatments" className="rounded-2xl border border-clinic-teal/10 bg-white p-4 hover:border-clinic-teal">
            <p className="text-xs text-clinic-ink/50">Chalti treatments</p>
            <p className="font-display text-2xl font-semibold text-clinic-ink">{activeCount}</p>
          </Link>
        )}
      </div>
    )}
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      {canAppt && (
        <section className="rounded-2xl border border-clinic-teal/15 bg-white p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="font-display font-semibold text-clinic-ink">Aaj ki appointments ({todays.length})</p>
            <Link href="/admin/appointments" className="text-xs font-semibold text-clinic-teal">Sab →</Link>
          </div>
          {todays.some((a) => a.status === 'arrived') && (
            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="text-xs font-semibold text-sky-800">Intezar mein ({todays.filter((a) => a.status === 'arrived').length})</p>
              <div className="mt-1 grid gap-1 text-sm">
                {todays.filter((a) => a.status === 'arrived').map((a) => (
                  <p key={a.id}>
                    {who(a)} <span className="text-xs text-clinic-ink/50">{[a.preferred_time, a.treatment_name].filter(Boolean).join(' · ')}</span>
                    {a.patient_id && (
                      <Link href={`/admin/patients/${a.patient_id}`} className="ml-2 text-xs font-semibold text-clinic-teal">Visit shuru →</Link>
                    )}
                  </p>
                ))}
              </div>
            </div>
          )}
          {todays.length === 0 ? (
            <p className="mt-3 text-sm text-clinic-ink/50">Aaj koi appointment nahi.</p>
          ) : (
            <div className="mt-2 divide-y divide-clinic-teal/10">
              {todays.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {who(a)}
                    <span className="ml-2 text-xs text-clinic-ink/50">{[a.preferred_time, a.treatment_name].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : a.status === 'arrived' ? 'bg-sky-50 text-sky-700' : a.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-clinic-mint text-clinic-teal'}`}>
                    {a.status === 'completed' ? 'Dekh liye' : a.status === 'arrived' ? 'Intezar mein' : a.status === 'pending' ? 'Request' : 'Aana hai'}
                  </span>
                </div>
              ))}
            </div>
          )}
          {soon.length > 0 && (
            <div className="mt-3 rounded-xl bg-clinic-mint/60 p-3">
              <p className="text-xs font-semibold text-clinic-teal">Agle {days} din ki appointments — reminder bhejein</p>
              <div className="mt-1 grid gap-1.5 text-sm">
                {soon.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {who(a)}{' '}
                      <span className="text-xs text-clinic-ink/50">
                        · {fmtDate(a.preferred_date)}
                        {a.preferred_time ? ` ${a.preferred_time}` : ''}
                        {a.treatment_name ? ` · ${a.treatment_name}` : ''}
                      </span>
                    </span>
                    <WhatsAppMenu items={[{ label: 'Yaad dehani (reminder)', href: apptReminderLink(a, tpl) }]} label="Reminder" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {missed.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">Nahi aaye (pichle 30 din) — call karein</p>
              <div className="mt-1 grid gap-1 text-sm">
                {missed.map((a) => (
                  <p key={a.id}>
                    {who(a)} <span className="text-xs text-clinic-ink/50">· {fmtDate(a.preferred_date)}{a.treatment_name ? ` · ${a.treatment_name}` : ''}</span>
                    <a href={`tel:${a.phone.replace(/[^0-9+]/g, '')}`} className="ml-2 text-xs font-semibold text-clinic-teal">Call</a>
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      {canLab && (
        <section className="rounded-2xl border border-clinic-teal/15 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="font-display font-semibold text-clinic-ink">Lab ({labs.length})</p>
            <Link href="/admin/lab" className="text-xs font-semibold text-clinic-teal">Sab →</Link>
          </div>
          {labs.length === 0 ? (
            <p className="mt-3 text-sm text-clinic-ink/50">Aaj lab ka koi kaam due nahi.</p>
          ) : (
            <div className="mt-2 grid gap-1.5 text-sm">
              {labs.slice(0, 8).map((l) => (
                <Link key={l.id} href={`/admin/lab/${l.id}`} className="rounded-lg px-2 py-1 hover:bg-clinic-mint">
                  <span className="font-medium">{l.patients?.full_name ?? '—'}</span>
                  <span className="ml-1 text-xs text-clinic-ink/50">
                    {l.work_type} · {l.status === 'received' ? 'aa gaya, fit karna hai' : `due ${fmtDate(l.due_date)}`}
                    {l.status !== 'received' && l.due_date && l.due_date < today && (
                      <b className="ml-1 text-red-600">· {Math.round((new Date(today).getTime() - new Date(l.due_date).getTime()) / 86400000)} din late, lab se poochein</b>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
    </>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPermissions, getStaffProfile, isOwnerRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { fmtDate, money, todayKarachi } from '@/lib/karachi'
import { toothTitle as toothLabel } from '@/lib/teeth'

const FILTERS = [
  { k: 'active', l: 'Chal rahi' },
  { k: 'planned', l: 'Plan' },
  { k: 'due', l: 'Baqaya wali' },
  { k: 'completed', l: 'Mukammal' },
]

/** Sab patients ki treatments aik jagah: kaunsi chal rahi hai, aakhri visit kab, agla kab, kitna baqaya */
export default async function TreatmentsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const staff = await getStaffProfile()
  const perms = await getPermissions()
  if (!perms.includes('clinical.view') && !perms.includes('billing.view')) redirect('/admin/dashboard?denied=1')
  const canMoney = isOwnerRole(staff.role) || perms.includes('billing.view')
  const sp = await searchParams
  const f = FILTERS.some((x) => x.k === sp.f) ? (sp.f as string) : 'active'
  const q = (sp.q ?? '').replace(/[%,()*\\"']/g, ' ').trim()
  const today = todayKarachi()

  const supabase = await createClient()
  let query = supabase
    .from('treatment_overview')
    .select('id, patient_id, full_name, mr_number, phone, name, teeth, status, doctor, started_on, charged, paid, balance, last_visit_no, last_visit_date, next_date, next_time')
    .order('last_visit_date', { ascending: false, nullsFirst: false })
    .limit(300)
  if (f === 'due') query = query.gt('balance', 0).neq('status', 'cancelled')
  else query = query.eq('status', f)
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,mr_number.ilike.%${q}%,name.ilike.%${q}%`)
  const { data, error } = await query
  const rows = data ?? []

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Treatments</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">Har patient ki har treatment. Click karein to patient ki profile khulegi, wahan &quot;Agla visit&quot;.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTERS.filter((x) => x.k !== 'due' || canMoney).map((x) => (
          <Link
            key={x.k}
            href={`/admin/treatments?f=${x.k}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${f === x.k ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/15 bg-white text-clinic-ink/70'}`}
          >
            {x.l}
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="f" value={f} />
          <input name="q" defaultValue={q} placeholder="Patient / phone / treatment" className="w-56 rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">Talash</button>
        </form>
      </div>

      {error && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Treatments load nahi huin: {error.message}</p>}

      <div className="mt-4 grid gap-2">
        {rows.length === 0 && !error && (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 bg-white p-8 text-center text-sm text-clinic-ink/50">Is list mein koi treatment nahi.</p>
        )}
        {rows.map((r) => {
          return (
            <Link
              key={r.id}
              href={`/admin/patients/${r.patient_id}`}
              className="grid gap-2 rounded-2xl border border-clinic-teal/10 bg-white p-4 transition-colors hover:border-clinic-teal sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="font-semibold text-clinic-ink">
                  {r.name}
                  {(r.teeth as string[] | null)?.length ? (
                    <span className="ml-2 text-sm font-medium text-clinic-teal">{(r.teeth as string[]).map(toothLabel).join(', ')}</span>
                  ) : null}
                </p>
                <p className="text-sm capitalize text-clinic-ink/70">
                  {r.full_name} <span className="text-xs normal-case text-clinic-ink/40">{r.mr_number} · {r.phone}</span>
                </p>
              </div>
              <div className="text-sm">
                <p className="text-xs text-clinic-ink/50">Aakhri visit</p>
                <p className="text-clinic-ink">{r.last_visit_no ? `V${r.last_visit_no} · ${fmtDate(r.last_visit_date)}` : '—'}</p>
              </div>
              <div className="text-sm">
                <p className="text-xs text-clinic-ink/50">Agla visit</p>
                <p className={r.next_date === today ? 'font-semibold text-clinic-teal' : 'text-clinic-ink/60'}>
                  {r.next_date ? `${fmtDate(r.next_date)}${r.next_time ? ' ' + r.next_time : ''}` : '—'}
                </p>
              </div>
              {canMoney && (
                <div className="text-right text-sm">
                  <p className="text-xs text-clinic-ink/50">Baqaya</p>
                  <p className={`font-semibold ${Number(r.balance) > 0 ? 'text-red-600' : 'text-clinic-ink/50'}`}>{money(r.balance)}</p>
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

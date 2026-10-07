import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

const TABLES = [
  'patients',
  'transactions',
  'installments',
  'treatment_plans',
  'treatment_episodes',
  'inventory',
  'lab_cases',
  'prescriptions',
  'staff_profiles',
  'invoices',
  'payments',
  'treatment_catalog',
  'staff_members',
  'expense_categories',
  'day_closings',
]

interface AuditRow {
  id: number
  created_at: string
  actor_name: string | null
  actor_role: string | null
  action: string
  table_name: string
  record_id: string | null
  changed_fields: string[] | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
}

const SKIP = new Set(['updated_at'])

function show(v: unknown) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function summary(r: AuditRow) {
  const src = r.new_data ?? r.old_data ?? {}
  const label =
    (src.full_name as string) ||
    (src.treatment_name as string) ||
    (src.title as string) ||
    (src.item_name as string) ||
    ''
  return label
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; from?: string; to?: string }>
}) {
  await requireAdmin()
  const params = await searchParams
  const supabase = await createClient()

  let q = supabase
    .from('audit_log')
    .select('id, created_at, actor_name, actor_role, action, table_name, record_id, changed_fields, old_data, new_data')
    .order('created_at', { ascending: false })
    .limit(200)

  if (params.table) q = q.eq('table_name', params.table)
  if (params.from) q = q.gte('created_at', `${params.from}T00:00:00+05:00`)
  if (params.to) q = q.lte('created_at', `${params.to}T23:59:59+05:00`)

  const { data, error } = await q

  if (error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Audit Log</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Audit log abhi chalu nahi hua</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase mein <strong>phase2-audit-permissions.sql</strong> chalayein (pehle test
            project par).
          </p>
        </div>
      </div>
    )
  }

  const rows = (data ?? []) as AuditRow[]

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Audit Log</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Kisne, kab, kya badla. Ye record koi edit ya delete nahi kar sakta.
      </p>

      <form className="mt-4 flex flex-wrap items-center gap-2">
        <select
          name="table"
          defaultValue={params.table ?? ''}
          className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
        >
          <option value="">Sab</option>
          {TABLES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={params.from ?? ''} className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
        <input type="date" name="to" defaultValue={params.to ?? ''} className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
          Dekhein
        </button>
        <Link href="/admin/audit" className="text-sm text-clinic-ink/60 hover:underline">
          Reset
        </Link>
      </form>

      <p className="mt-3 text-xs text-clinic-ink/50">Taaza 200 entries dikh rahi hain.</p>

      <div className="mt-3 grid gap-3">
        {rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-6 text-center text-sm text-clinic-ink/60">
            Koi entry nahi.
          </p>
        )}
        {rows.map((r) => {
          const keys = (r.changed_fields ?? []).filter((k) => !SKIP.has(k))
          return (
            <div key={r.id} className="rounded-2xl border border-clinic-teal/10 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-clinic-ink">
                  <span
                    className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.action === 'INSERT'
                        ? 'bg-emerald-50 text-emerald-700'
                        : r.action === 'DELETE'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {r.action === 'INSERT' ? 'Naya' : r.action === 'UPDATE' ? 'Tabdeeli' : 'Delete'}
                  </span>
                  {r.table_name} {summary(r) && `· ${summary(r)}`}
                </p>
                <p className="text-xs text-clinic-ink/60">
                  {new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })} ·{' '}
                  {r.actor_name ?? 'System'}
                  {r.actor_role ? ` (${r.actor_role})` : ''}
                </p>
              </div>

              {r.action === 'UPDATE' && keys.length > 0 && (
                <div className="mt-2 grid gap-1 text-xs text-clinic-ink/70">
                  {keys.map((k) => (
                    <p key={k}>
                      <span className="font-semibold">{k}:</span>{' '}
                      <span className="text-red-700 line-through">{show(r.old_data?.[k])}</span>{' '}
                      → <span className="text-emerald-700">{show(r.new_data?.[k])}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LabCaseForm, { type LabOption, type PatientOption } from '@/components/admin/LabCaseForm'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  sent: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-clinic-teal/10 text-clinic-teal',
  received: 'bg-emerald-50 text-emerald-700',
  fitted: 'bg-emerald-100 text-emerald-800',
  remake: 'bg-red-50 text-red-700',
}

const STATUSES = ['all', 'pending', 'sent', 'in_progress', 'received', 'fitted', 'remake'] as const

export default async function LabPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const status = params.status || 'all'

  const supabase = await createClient()

  let query = supabase
    .from('lab_cases')
    .select('id, case_number, lab_name, work_type, tooth_numbers, status, due_date, cost, patients(full_name, mr_number)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const [casesRes, labsRes, patientsRes] = await Promise.all([
    query,
    supabase.from('labs').select('id, name, whatsapp').eq('is_active', true).order('name'),
    supabase
      .from('patients')
      .select('id, full_name, mr_number')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  // Table missing -> phase5.sql not run
  if (casesRes.error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Lab</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase → SQL Editor mein <strong>phase5.sql</strong> chalayein.
          </p>
        </div>
      </div>
    )
  }

  const cases = casesRes.data ?? []
  const today = new Date().toISOString().slice(0, 10)

  const { data: allCases } = await supabase
    .from('lab_cases')
    .select('status')
    .is('deleted_at', null)

  function countFor(s: string) {
    if (s === 'all') return allCases?.length ?? 0
    return allCases?.filter((c) => c.status === s).length ?? 0
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Lab Work</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">
            Crown, bridge, denture ke work orders — lab ko WhatsApp par bhejein.
          </p>
        </div>
        <LabCaseForm
          labs={(labsRes.data ?? []) as LabOption[]}
          patients={(patientsRes.data ?? []) as PatientOption[]}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/lab?status=${s}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
              status === s
                ? 'bg-clinic-teal text-white'
                : 'border border-clinic-teal/10 bg-white text-clinic-ink/60'
            }`}
          >
            {s.replace('_', ' ')} ({countFor(s)})
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3">
        {cases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-10 text-center text-sm text-clinic-ink/50">
            Koi lab case nahi hai.
          </div>
        ) : (
          cases.map((c) => {
            const patient = c.patients as unknown as { full_name: string; mr_number: string } | null
            const overdue =
              c.due_date && c.due_date < today && !['received', 'fitted'].includes(c.status)

            return (
              <Link
                key={c.id}
                href={`/admin/lab/${c.id}`}
                className={`block rounded-2xl border bg-white p-4 transition-colors hover:border-clinic-teal ${
                  overdue ? 'border-red-200' : 'border-clinic-teal/10'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-clinic-teal">
                      {c.case_number}
                    </p>
                    <p className="mt-0.5 font-medium text-clinic-ink">
                      {patient?.full_name ?? 'Unknown patient'}
                      <span className="ml-2 text-xs text-clinic-ink/40">{patient?.mr_number}</span>
                    </p>
                    <p className="mt-1 text-sm text-clinic-ink/60">
                      {c.work_type ?? 'Lab work'} · Tooth{' '}
                      {(c.tooth_numbers ?? []).join(', ') || '—'} · {c.lab_name}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        STATUS_STYLES[c.status] ?? 'bg-clinic-mint text-clinic-ink/50'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                    {c.due_date && (
                      <p
                        className={`mt-1 text-xs ${
                          overdue ? 'font-semibold text-red-600' : 'text-clinic-ink/50'
                        }`}
                      >
                        Due {new Date(c.due_date).toLocaleDateString('en-GB')}
                        {overdue ? ' — late' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

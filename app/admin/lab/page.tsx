import { requirePerm, getStaffProfile, isOwnerRole } from '@/lib/auth'
import Link from 'next/link'
import { toothTitle as toothLabel } from '@/lib/teeth'
import { createClient } from '@/lib/supabase/server'
import LabCaseForm, { type LabOption, type PatientOption } from '@/components/admin/LabCaseForm'
import { todayKarachi } from '@/lib/karachi'

export default async function LabPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; patient?: string; treatment?: string }>
}) {
  await requirePerm('lab.view')
  const isOwner = isOwnerRole((await getStaffProfile()).role)
  const params = await searchParams
  const q = (params.q ?? '').replace(/[%,()*\\"']/g, ' ').trim()

  const supabase = await createClient()

  let query = supabase
    .from('lab_cases')
    .select('id, case_number, lab_name, work_type, tooth_numbers, status, due_date, cost, lab_paid, created_at, patients(full_name, mr_number)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (q) query = query.or(`case_number.ilike.%${q}%,lab_name.ilike.%${q}%,work_type.ilike.%${q}%`)

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

  // Treatment se aaye to patient aur treatment pehle se chune hon
  const uuid = /^[0-9a-f-]{36}$/i
  let fixed: PatientOption | undefined
  let patTreatments: { id: string; name: string; teeth: string[] }[] = []
  if (params.patient && uuid.test(params.patient)) {
    const [{ data: fp }, { data: ft }] = await Promise.all([
      supabase.from('patients').select('id, full_name, mr_number').eq('id', params.patient).is('deleted_at', null).maybeSingle(),
      supabase.from('patient_treatments').select('id, name, teeth').eq('patient_id', params.patient).in('status', ['planned', 'active', 'completed']).order('started_on', { ascending: false }).limit(30),
    ])
    if (fp) fixed = fp as PatientOption
    patTreatments = ((ft ?? []) as { id: string; name: string; teeth: string[] | null }[]).map((t) => ({ id: t.id, name: t.name, teeth: t.teeth ?? [] }))
  }
  const cases = casesRes.data ?? []
  const today = todayKarachi()

  // Har case ki report / files (clinic staff upload karta hai; WhatsApp bhejne se khud "aa gayi" nahi hoti)
  const reports = new Map<string, number>()
  if (cases.length) {
    const { data: files } = await supabase.from('patient_photos').select('lab_case_id').in('lab_case_id', cases.map((c) => c.id))
    for (const f of files ?? []) reports.set(f.lab_case_id as string, (reports.get(f.lab_case_id as string) ?? 0) + 1)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Lab Work</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">
            Work order banayein, lab ko WhatsApp par bhejein, report aaye to case mein upload karein.
          </p>
        </div>
        {isOwner && (
          <Link href="/admin/lab/hisaab" className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal">
            Lab ka hisaab
          </Link>
        )}
        <LabCaseForm
          labs={(labsRes.data ?? []) as LabOption[]}
          patients={(patientsRes.data ?? []) as PatientOption[]}
          fixedPatient={fixed}
          treatments={patTreatments}
          defaultTreatmentId={fixed && params.treatment && uuid.test(params.treatment) ? params.treatment : undefined}
        />
      </div>

      <form className="mt-6 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Case no., lab ya kaam talash karein" className="w-full max-w-sm rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">Talash</button>
      </form>

      <div className="mt-6 grid gap-3">
        {cases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-10 text-center text-sm text-clinic-ink/50">
            Koi lab case nahi hai.
          </div>
        ) : (
          cases.map((c) => {
            const patient = c.patients as unknown as { full_name: string; mr_number: string } | null
            const nReports = reports.get(c.id) ?? 0
            const overdue = c.due_date && c.due_date < today && nReports === 0

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
                      {((c.tooth_numbers ?? []) as string[]).map(toothLabel).join(', ') || '—'} · {c.lab_name}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        nReports > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-clinic-mint text-clinic-ink/60'
                      }`}
                    >
                      {nReports > 0 ? `Report: ${nReports} file` : 'Report abhi nahi'}
                    </span>
                    {Number(c.cost ?? 0) - Number(c.lab_paid ?? 0) > 0 && (
                      <p className="mt-1 text-xs font-semibold text-red-600">
                        Lab ka baqaya Rs. {(Number(c.cost) - Number(c.lab_paid)).toLocaleString()}
                      </p>
                    )}
                    {c.due_date && (
                      <p
                        className={`mt-1 text-xs ${
                          overdue ? 'font-semibold text-red-600' : 'text-clinic-ink/50'
                        }`}
                      >
                        Due {new Date(c.due_date).toLocaleDateString('en-GB')}
                        {overdue ? ', der ho gayi' : ''}
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

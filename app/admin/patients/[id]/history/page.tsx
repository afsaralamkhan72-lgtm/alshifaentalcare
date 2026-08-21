import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PatientHistoryWizard, { type HistoryRecord } from '@/components/admin/PatientHistoryWizard'
import PatientHistorySummary from '@/components/admin/PatientHistorySummary'
import HistoryPrintButton from '@/components/admin/HistoryPrintButton'

export default async function PatientHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const { id } = await params
  const { view } = await searchParams
  const supabase = await createClient()

  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, mr_number, phone, age, gender, department, address, date_of_birth')
    .eq('id', id)
    .single()

  if (!patient) notFound()

  let dentalRecords: {
    id: string
    tooth_number: string
    condition: string
    notes: string | null
    treatment_date: string
  }[] = []

  if (patient.department === 'dental') {
    const { data: dc } = await supabase
      .from('dental_chart')
      .select('id, tooth_number, condition, notes, treatment_date')
      .eq('patient_id', id)
      .order('treatment_date', { ascending: false })
    dentalRecords = dc ?? []
  }

  const { data: history, error } = await supabase
    .from('patient_history')
    .select('*')
    .eq('patient_id', id)
    .maybeSingle()

  const needsMigration = Boolean(error)

  const { data: clinicRow } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'clinic_info')
    .maybeSingle()

  const clinic = (clinicRow?.value ?? {}) as Record<string, string>

  // Once finalised, the full-page summary is the default view. Before that,
  // the wizard is, unless the doctor explicitly asks for the summary.
  const started = Boolean(history?.completed_step)
  const showSummary = view === 'summary' || (view !== 'form' && Boolean(history?.is_finalized))

  return (
    <div>
      <Link
        href={`/admin/patients/${id}`}
        className="text-sm text-clinic-ink/50 hover:text-clinic-teal print:hidden"
      >
        ← {patient.full_name}
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Patient History</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">
            {patient.mr_number} ·{' '}
            {showSummary
              ? 'Poori history aik page par.'
              : 'Select the options and move on, each step saves automatically.'}
          </p>
        </div>

        {started && !needsMigration && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/patients/${id}/history?view=${showSummary ? 'form' : 'summary'}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                showSummary
                  ? 'border border-clinic-teal text-clinic-teal'
                  : 'bg-clinic-teal text-white'
              }`}
            >
              {showSummary ? 'Edit History' : 'View Full Page'}
            </Link>
            {showSummary && <HistoryPrintButton />}
          </div>
        )}
      </div>

      <div className="mt-6">
        {showSummary && !needsMigration ? (
          <PatientHistorySummary
            history={history as Record<string, unknown> | null}
            patient={patient}
            dentalRecords={dentalRecords}
            clinic={clinic}
          />
        ) : (
          <PatientHistoryWizard
            patientId={patient.id}
            patientName={patient.full_name}
            department={patient.department}
            initial={(history ?? null) as HistoryRecord | null}
            dentalRecords={dentalRecords}
            needsMigration={needsMigration}
          />
        )}
      </div>
    </div>
  )
}

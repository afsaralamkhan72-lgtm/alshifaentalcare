import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PatientHistoryWizard, { type HistoryRecord } from '@/components/admin/PatientHistoryWizard'

export default async function PatientHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, mr_number, department')
    .eq('id', id)
    .single()

  if (!patient) notFound()

  const { data: history, error } = await supabase
    .from('patient_history')
    .select('*')
    .eq('patient_id', id)
    .maybeSingle()

  // Table missing -> phase3.sql hasn't been run
  const needsMigration = Boolean(error)

  return (
    <div>
      <Link
        href={`/admin/patients/${id}`}
        className="text-sm text-clinic-ink/50 hover:text-clinic-teal"
      >
        ← {patient.full_name} ki profile
      </Link>

      <h1 className="mt-2 font-display text-2xl font-semibold text-clinic-ink">
        Patient History
      </h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        {patient.mr_number} · Options select karte jayein, har step khud save hota rahega.
      </p>

      <div className="mt-6">
        <PatientHistoryWizard
          patientId={patient.id}
          patientName={patient.full_name}
          department={patient.department}
          initial={(history ?? null) as HistoryRecord | null}
          needsMigration={needsMigration}
        />
      </div>
    </div>
  )
}

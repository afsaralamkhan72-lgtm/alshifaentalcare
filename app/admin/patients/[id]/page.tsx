import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DentalChart from '@/components/admin/DentalChart'
import PatientEditModal from '@/components/admin/PatientEditModal'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: patient } = await supabase.from('patients').select('*').eq('id', id).single()
  if (!patient) notFound()

  let dentalRecords: {
    id: string
    tooth_number: string
    condition: string
    notes: string | null
    treatment_date: string
  }[] = []

  if (patient.department === 'dental') {
    const { data } = await supabase
      .from('dental_chart')
      .select('id, tooth_number, condition, notes, treatment_date')
      .eq('patient_id', id)
      .order('treatment_date', { ascending: false })
    dentalRecords = data ?? []
  }

  return (
    <div>
      <div className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-clinic-teal">{patient.mr_number}</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-clinic-ink">{patient.full_name}</h1>
            <p className="mt-1 text-sm text-clinic-ink/60">{patient.phone}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                patient.department === 'dental' ? 'bg-clinic-teal/10 text-clinic-teal' : 'bg-clinic-amber/10 text-clinic-amber'
              }`}
            >
              {patient.department}
            </span>
            <PatientEditModal
              patient={{
                id: patient.id,
                full_name: patient.full_name,
                phone: patient.phone,
                department: patient.department,
                age: patient.age,
                gender: patient.gender,
                address: patient.address,
                notes: patient.notes,
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-clinic-teal/10 pt-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-clinic-ink/40">Age</p>
            <p className="text-clinic-ink">{patient.age ?? '—'}</p>
          </div>
          <div>
            <p className="text-clinic-ink/40">Gender</p>
            <p className="capitalize text-clinic-ink">{patient.gender ?? '—'}</p>
          </div>
          <div>
            <p className="text-clinic-ink/40">Registered</p>
            <p className="text-clinic-ink">{new Date(patient.created_at).toLocaleDateString('en-GB')}</p>
          </div>
          <div>
            <p className="text-clinic-ink/40">Address</p>
            <p className="text-clinic-ink">{patient.address ?? '—'}</p>
          </div>
        </div>
      </div>

      {patient.department === 'dental' ? (
        <div id="dental-chart" className="mt-6 scroll-mt-6">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Interactive Dental Chart</h2>
          <div className="mt-3">
            <DentalChart patientId={patient.id} initialRecords={dentalRecords} />
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-6 text-center text-sm text-clinic-ink/60">
          Homeopathic patients ke liye dental chart applicable nahi. Prescriptions module
          agle phase mein aayega.
        </div>
      )}
    </div>
  )
}

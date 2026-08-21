import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LabOrderActions from '@/components/admin/LabOrderActions'
import ClinicLogo from '@/components/ClinicLogo'
import { toothLabel } from '@/lib/teeth'
import { CLINIC } from '@/clinic.config'

interface LabCase {
  id: string
  case_number: string | null
  lab_name: string
  lab_whatsapp: string | null
  work_type: string | null
  tooth_numbers: string[] | null
  shade: string | null
  material: string | null
  pontic_design: string | null
  instructions: string | null
  impression_date: string | null
  due_date: string | null
  status: string
  cost: number | null
  patients: { full_name: string; mr_number: string | null; age: number | null; gender: string | null } | null
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB') : '—'
}

export default async function LabOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lab_cases')
    .select(
      'id, case_number, lab_name, lab_whatsapp, work_type, tooth_numbers, shade, material, pontic_design, instructions, impression_date, due_date, status, cost, patients(full_name, mr_number, age, gender)'
    )
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const c = data as unknown as LabCase
  const patient = c.patients
  const teeth = c.tooth_numbers ?? []

  const { data: clinicRow } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'clinic_info')
    .maybeSingle()

  const clinic = (clinicRow?.value ?? {}) as Record<string, string>

  return (
    <div>
      <Link href="/admin/lab" className="text-sm text-clinic-ink/50 hover:text-clinic-teal print:hidden">
        ← Sab Lab Cases
      </Link>

      <div className="mt-3">
        <LabOrderActions
          caseNumber={c.case_number ?? ''}
          labName={c.lab_name}
          labWhatsapp={c.lab_whatsapp}
          patientName={patient?.full_name ?? ''}
          workType={c.work_type}
          teeth={teeth}
          shade={c.shade}
          material={c.material}
          dueDate={c.due_date}
          instructions={c.instructions}
        />
      </div>

      {/* Printed sheet */}
      <div
        id="lab-sheet"
        className="mx-auto max-w-2xl rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-8"
      >
        <div className="flex items-start justify-between border-b border-clinic-teal/20 pb-4">
          <div className="flex items-start gap-4">
          <ClinicLogo logoUrl={clinic.logo_url} size={56} />
          <div>
            <p className="font-display text-xl font-semibold text-clinic-teal">
              {clinic.name ?? CLINIC.name}
            </p>
            <p className="text-sm text-clinic-ink/60">
              {clinic.doctor_name ?? CLINIC.doctor.name}
            </p>
            <p className="mt-1 text-xs text-clinic-ink/50">
              {clinic.address ?? CLINIC.address.full} · {clinic.phone ?? CLINIC.phone.display}
            </p>
          </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-clinic-ink/50">Case No.</p>
            <p className="font-display text-lg font-semibold text-clinic-ink">{c.case_number}</p>
          </div>
        </div>

        <p className="mt-6 font-display text-lg font-semibold text-clinic-ink">
          Lab Work Order
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-clinic-ink/50">Laboratory</p>
            <p className="font-medium text-clinic-ink">{c.lab_name}</p>
          </div>
          <div>
            <p className="text-xs text-clinic-ink/50">Patient</p>
            <p className="font-medium text-clinic-ink">
              {patient?.full_name} {patient?.mr_number ? `(${patient.mr_number})` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-clinic-ink/50">Age / Gender</p>
            <p className="font-medium capitalize text-clinic-ink">
              {patient?.age ?? '—'} / {patient?.gender ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-clinic-ink/50">Status</p>
            <p className="font-medium capitalize text-clinic-ink">{c.status.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-clinic-ink/50">Impression Date</p>
            <p className="font-medium text-clinic-ink">{fmt(c.impression_date)}</p>
          </div>
          <div>
            <p className="text-xs text-clinic-ink/50">Due Date</p>
            <p className="font-medium text-clinic-ink">{fmt(c.due_date)}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-clinic-mint/60 p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-clinic-ink/50">Work Type</p>
              <p className="font-medium text-clinic-ink">{c.work_type ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-clinic-ink/50">Material</p>
              <p className="font-medium text-clinic-ink">{c.material ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-clinic-ink/50">Shade</p>
              <p className="font-medium text-clinic-ink">{c.shade ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-clinic-ink/50">Pontic Design</p>
              <p className="font-medium text-clinic-ink">{c.pontic_design ?? '—'}</p>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-xs text-clinic-ink/50">Tooth Numbers</p>
            {teeth.length === 0 ? (
              <p className="font-medium text-clinic-ink">·</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {teeth.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-clinic-teal bg-white px-2 py-1 font-display text-sm font-semibold text-clinic-teal"
                  >
                    {toothLabel(t)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {c.instructions && (
          <div className="mt-4">
            <p className="text-xs text-clinic-ink/50">Instructions</p>
            <p className="mt-1 whitespace-pre-line text-sm text-clinic-ink">{c.instructions}</p>
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-clinic-ink/50">
          <div className="border-t border-clinic-ink/20 pt-2">Doctor&apos;s Signature</div>
          <div className="border-t border-clinic-ink/20 pt-2">Lab Received By</div>
        </div>
      </div>
    </div>
  )
}

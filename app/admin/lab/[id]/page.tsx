import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LabOrderActions from '@/components/admin/LabOrderActions'
import LabMoney from '@/components/admin/LabMoney'
import LabReports from '@/components/admin/LabReports'
import type { MediaItem } from '@/components/admin/MediaStrip'
import { getPermissions, requirePerm, getStaffProfile, isOwnerRole } from '@/lib/auth'
import LabCaseDelete from '@/components/admin/LabCaseDelete'
import ClinicLogo from '@/components/ClinicLogo'
import { toothTitle as toothLabel } from '@/lib/teeth'
import { CLINIC } from '@/clinic.config'
import LabPatientNotify from '@/components/admin/LabPatientNotify'
import { messageLink } from '@/lib/messages'
import { mapTemplates } from '@/lib/messageTemplates'
import { fmtDate, numFmt } from '@/lib/karachi'

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
  patient_id: string | null
  treatment_id: string | null
  cost: number | null
  lab_paid: number | null
  patients: { full_name: string; mr_number: string | null; age: number | null; gender: string | null } | null
}

export default async function LabOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm('lab.view')
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lab_cases')
    .select(
      'id, case_number, lab_name, lab_whatsapp, work_type, tooth_numbers, shade, material, pontic_design, instructions, impression_date, due_date, status, cost, lab_paid, patient_id, treatment_id, patients(full_name, mr_number, age, gender)'
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
  const perms = await getPermissions()
  const isOwner = isOwnerRole((await getStaffProfile()).role)
  const [{ data: files }, { data: tr }] = await Promise.all([
    supabase.from('patient_photos').select('id, storage_path, caption, category').eq('lab_case_id', c.id).order('created_at'),
    c.treatment_id ? supabase.from('patient_treatments').select('name, price').eq('id', c.treatment_id).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const [{ data: ph }, { data: nt }, { data: tplRows }] = await Promise.all([
    c.patient_id ? supabase.from('patients').select('phone').eq('id', c.patient_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('lab_cases').select('patient_notified_at').eq('id', c.id).maybeSingle(),
    supabase.from('message_templates').select('key, body'),
  ])
  const waLink =
    patient && ph?.phone
      ? messageLink('lab_ready', { full_name: patient.full_name, phone: ph.phone as string, gender: patient.gender }, { treatment: c.work_type ?? 'kaam' }, mapTemplates(tplRows as { key: string; body: string }[] | null))
      : null

  return (
    <div>
      <div className="flex flex-wrap gap-4 print:hidden">
        <Link href="/admin/lab" className="text-sm text-clinic-ink/50 hover:text-clinic-teal">
          ← Sab Lab Cases
        </Link>
        {c.patient_id && (
          <Link href={`/admin/patients/${c.patient_id}`} className="text-sm text-clinic-ink/50 hover:text-clinic-teal">
            Patient profile →
          </Link>
        )}
        {isOwner && (
          <span className="ml-auto">
            <LabCaseDelete id={c.id} caseNumber={c.case_number ?? 'Ye case'} paid={Number(c.lab_paid ?? 0)} goTo="/admin/lab" small />
          </span>
        )}
      </div>

      <div className="mt-3">
        <LabReports caseId={c.id} patientId={c.patient_id} treatmentId={c.treatment_id} files={(files ?? []) as MediaItem[]} canUpload={perms.includes('lab.manage')} />
        {c.status === 'received' && c.patient_id && (
          <LabPatientNotify caseId={c.id} patientId={c.patient_id} patient={patient && ph?.phone ? { name: patient.full_name, phone: ph.phone as string, department: 'dental' } : null} workType={c.work_type} waLink={waLink} notifiedAt={((nt as { patient_notified_at?: string | null } | null)?.patient_notified_at) ?? null} />
        )}
        {tr && Number((tr as { price?: number }).price ?? 0) > 0 && perms.includes('billing.view') && (
          <p className="mb-4 rounded-xl border border-clinic-teal/10 bg-white p-3 text-sm text-clinic-ink/80 print:hidden">
            Is treatment ({(tr as { name: string }).name}) ki qeemat Rs. {numFmt(Number((tr as { price: number }).price))} · lab ka kharcha Rs. {numFmt(Number(c.cost ?? 0))} ·{' '}
            <b>bachat Rs. {numFmt((Number((tr as { price: number }).price) - Number(c.cost ?? 0)))}</b>
          </p>
        )}
        <LabMoney caseId={c.id} status={c.status} cost={Number(c.cost ?? 0)} labPaid={Number(c.lab_paid ?? 0)} />
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
              {patient?.full_name ?? 'Patient ka naam nahi'} {patient?.mr_number ? `(${patient.mr_number})` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-clinic-ink/50">Age / Gender</p>
            <p className="font-medium capitalize text-clinic-ink">
              {patient?.age ?? '—'} / {patient?.gender ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-clinic-ink/50">Treatment</p>
            <p className="font-medium text-clinic-ink">{(tr as { name?: string } | null)?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-clinic-ink/50">Impression Date</p>
            <p className="font-medium text-clinic-ink">{fmtDate(c.impression_date)}</p>
          </div>
          <div>
            <p className="text-xs text-clinic-ink/50">Due Date</p>
            <p className="font-medium text-clinic-ink">{fmtDate(c.due_date)}</p>
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

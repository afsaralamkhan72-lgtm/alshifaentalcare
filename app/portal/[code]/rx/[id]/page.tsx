import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { CLINIC } from '@/clinic.config'
import SheetPrintButton from '@/components/admin/SheetPrintButton'
import PrescriptionSheet, { type RxItem } from '@/components/PrescriptionSheet'

export const metadata = { title: `Prescription | ${CLINIC.name}`, robots: { index: false, follow: false } }

/** Patient apni prescription dekhe / print kare. Code hi chaabi hai; prescription isi patient ki honi chahiye. */
export default async function PortalRxPage({ params }: { params: Promise<{ code: string; id: string }> }) {
  const { code, id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const supabase = createAdminClient()
  if (!supabase) notFound()
  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, mr_number, age, gender')
    .eq('portal_code', code.toLowerCase())
    .is('deleted_at', null)
    .maybeSingle()
  if (!patient) notFound()
  const { data: rx } = await supabase
    .from('prescriptions')
    .select('id, items, notes_en, notes_ur, prescribed_date, treatment_id')
    .eq('id', id)
    .eq('patient_id', patient.id)
    .maybeSingle()
  if (!rx) notFound()
  let treatmentName: string | null = null
  if (rx.treatment_id) {
    const { data: t } = await supabase.from('patient_treatments').select('name').eq('id', rx.treatment_id).eq('patient_id', patient.id).maybeSingle()
    treatmentName = t?.name ?? null
  }
  return (
    <div className="min-h-screen bg-clinic-sand">
      <div className="mx-auto max-w-3xl px-3 py-4 sm:py-8">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <Link href={`/portal/${encodeURIComponent(code)}`} className="text-sm text-clinic-ink/60 hover:text-clinic-teal">← Mera record</Link>
          <SheetPrintButton label="Print / PDF save" />
        </div>
        <PrescriptionSheet
          rx={{ items: (rx.items ?? []) as RxItem[], notes_en: rx.notes_en, notes_ur: rx.notes_ur, prescribed_date: rx.prescribed_date, treatmentName, patient }}
        />
        <p className="mt-3 text-center text-[11px] text-clinic-ink/40 print:hidden">Dawa doctor ke bataye hisaab se hi lein.</p>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { CLINIC } from '@/clinic.config'
import { loadShare } from '@/lib/shareGate'
import SheetPrintButton from '@/components/admin/SheetPrintButton'
import PrescriptionSheet, { type RxItem } from '@/components/PrescriptionSheet'

export const dynamic = 'force-dynamic'
export const metadata = { title: `Prescription | ${CLINIC.name}`, robots: { index: false, follow: false } }

export default async function ShareRxPage({ params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const st = await loadShare(token)
  if (st.s !== 'ok') return <Link href={`/r/${token}`} className="block p-6 text-center text-sm text-clinic-teal underline">Pehle apna record kholein</Link>
  const sb = createAdminClient()
  if (!sb) notFound()
  const { data: rx } = await sb.from('prescriptions').select('id, items, notes_en, notes_ur, prescribed_date, treatment_id').eq('id', id).eq('patient_id', st.patientId).maybeSingle()
  if (!rx) notFound()
  let treatmentName: string | null = null
  if (rx.treatment_id) {
    const { data: t } = await sb.from('patient_treatments').select('name').eq('id', rx.treatment_id).eq('patient_id', st.patientId).maybeSingle()
    treatmentName = t?.name ?? null
  }
  const p = await sb.from('patients').select('full_name, mr_number, age, gender').eq('id', st.patientId).maybeSingle()
  return (
    <div className="min-h-screen bg-clinic-sand">
      <div className="mx-auto max-w-3xl px-3 py-4 sm:py-8">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <Link href={`/r/${token}`} className="text-sm text-clinic-ink/60 hover:text-clinic-teal">← Mera record</Link>
          <SheetPrintButton label="Print / PDF save" />
        </div>
        <PrescriptionSheet rx={{ items: (rx.items ?? []) as RxItem[], notes_en: rx.notes_en, notes_ur: rx.notes_ur, prescribed_date: rx.prescribed_date, treatmentName, patient: p.data }} />
      </div>
    </div>
  )
}

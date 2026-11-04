import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requirePerm } from '@/lib/auth'
import RxPrint from '@/components/print/RxPrint'
import { type RxItem } from '@/components/PrescriptionSheet'
import { getPrintCfg } from '@/lib/printSettings'
import { aftercareFor } from '@/lib/printTemplates'
import { renderTemplate } from '@/lib/messageTemplates'

export default async function PrescriptionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm('prescriptions.view')
  const { id } = await params
  const supabase = await createClient()
  const { data: rx } = await supabase
    .from('prescriptions')
    .select('id, department, items, notes_en, notes_ur, prescribed_date, patient_id, treatment_id, patients(full_name, mr_number, age, gender, phone, portal_code)')
    .eq('id', id)
    .maybeSingle()
  if (!rx) notFound()

  const p = rx.patients as unknown as { full_name: string; mr_number: string | null; age: number | null; gender: string | null; phone: string; portal_code: string | null } | null
  let treatmentName: string | null = null
  if (rx.treatment_id) {
    const { data: t } = await supabase.from('patient_treatments').select('name').eq('id', rx.treatment_id).maybeSingle()
    treatmentName = t?.name ?? null
  }
  const printCfg = await getPrintCfg()
  const { data: ci } = await supabase.from('site_settings').select('value').eq('key', 'clinic_info').maybeSingle()
  const logoUrl = ((ci?.value ?? {}) as { logo_url?: string }).logo_url ?? null
  const dept = (rx.department as string | null) ?? 'dental'
  const aftercare: Record<string, string> = {}
  for (const a of aftercareFor(dept)) aftercare[a.key] = renderTemplate(a.key, {}, printCfg.tpl)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/admin/patients/${rx.patient_id}`} className="text-sm text-clinic-ink/50 hover:text-clinic-teal">
          ← Patient
        </Link>
      </div>
      <RxPrint
        rx={{ items: (rx.items ?? []) as RxItem[], notes_en: rx.notes_en, notes_ur: rx.notes_ur, prescribed_date: rx.prescribed_date, treatmentName, patient: p }}
        dept={dept}
        patientId={rx.patient_id}
        rxId={rx.id}
        logo={printCfg.logo}
        logoUrl={logoUrl}
        defaultTpl={dept === 'homeopathic' ? printCfg.defaults.rx_homeo : printCfg.defaults.rx_dental}
        aftercare={aftercare}
        phone={p?.phone ?? null}
        patientName={p?.full_name ?? ''}
        layout={printCfg.layout}
      />
    </div>
  )
}

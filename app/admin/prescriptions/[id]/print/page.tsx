import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requirePerm } from '@/lib/auth'
import RxPrint from '@/components/print/RxPrint'
import DocShare from '@/components/print/DocShare'
import { type RxItem } from '@/components/PrescriptionSheet'
import { getPrintCfg } from '@/lib/printSettings'
import { aftercareFor } from '@/lib/printTemplates'
import { renderTemplate } from '@/lib/messageTemplates'
import { billForRx } from '@/lib/visitDocs'

export default async function PrescriptionPrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; tpl?: string; w?: string }> }) {
  await requirePerm('prescriptions.view')
  const { id } = await params
  const { t: forTreatment, tpl: askTpl, w: askWhat } = await searchParams
  const supabase = await createClient()
  const { data: rx } = await supabase
    .from('prescriptions')
    .select('id, department, items, notes_en, notes_ur, prescribed_date, patient_id, treatment_id, clinical_visit_id, patients(full_name, mr_number, age, gender, phone, portal_code, address)')
    .eq('id', id)
    .maybeSingle()
  if (!rx) notFound()

  const p = rx.patients as unknown as { full_name: string; mr_number: string | null; age: number | null; gender: string | null; phone: string; portal_code: string | null; address: string | null } | null
  let treatmentName: string | null = null
  if (rx.treatment_id) {
    const { data: t } = await supabase.from('patient_treatments').select('name').eq('id', rx.treatment_id).maybeSingle()
    treatmentName = t?.name ?? null
  }
  // Ilaaj ke card se aaye hon to us ilaaj ki doosri (purani) prescriptions ke link
  let others: { id: string; date: string }[] = []
  if (forTreatment && /^[0-9a-f-]{36}$/.test(forTreatment)) {
    const { data: vn } = await supabase.from('visit_notes').select('clinical_visit_id').eq('treatment_id', forTreatment).eq('patient_id', rx.patient_id).is('voided_at', null).not('clinical_visit_id', 'is', null)
    const cv = [...new Set(((vn ?? []) as { clinical_visit_id: string }[]).map((x) => x.clinical_visit_id))]
    if (cv.length) {
      const { data: rs } = await supabase.from('prescriptions').select('id, prescribed_date').in('clinical_visit_id', cv).neq('id', rx.id).order('prescribed_date', { ascending: false })
      others = ((rs ?? []) as { id: string; prescribed_date: string }[]).map((r) => ({ id: r.id, date: r.prescribed_date }))
    }
  }
  const printCfg = await getPrintCfg()
  const { bill, href: billHref } = await billForRx(supabase, { patient_id: rx.patient_id, clinical_visit_id: rx.clinical_visit_id ?? null, prescribed_date: rx.prescribed_date })
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
        <DocShare
          fileName={'Prescription-' + (p?.full_name ?? 'mareez').replace(/[^A-Za-z0-9]+/g, '-') + '-' + rx.prescribed_date + '.pdf'}
          patientId={rx.patient_id}
          rxId={rx.id}
          phone={p?.phone ?? null}
          message={'Assalam o Alaikum ' + (p?.full_name ?? '') + ',\n\nAap ki prescription (' + rx.prescribed_date + ') bhej rahe hain.'}
        />
      </div>
      {others.length > 0 && (
        <p className="mb-3 flex flex-wrap gap-3 text-xs print:hidden" data-testid="rx-others">
          <span className="text-clinic-ink/60">Is ilaaj ki purani prescription:</span>
          {others.map((o) => (
            <Link key={o.id} href={'/admin/prescriptions/' + o.id + '/print?t=' + forTreatment} className="font-semibold text-clinic-teal underline">
              {o.date}
            </Link>
          ))}
        </p>
      )}
      <RxPrint
        rx={{ items: (rx.items ?? []) as RxItem[], notes_en: rx.notes_en, notes_ur: rx.notes_ur, prescribed_date: rx.prescribed_date, treatmentName, patient: p }}
        dept={dept}
        rxId={rx.id}
        logo={printCfg.logo}
        logoUrl={logoUrl}
        defaultTpl={askTpl === 'duo' ? 'duo' : dept === 'homeopathic' ? printCfg.defaults.rx_homeo : printCfg.defaults.rx_dental}
        bill={bill}
        billHref={billHref}
        initialWhat={askWhat === 'both' ? 'both' : 'rx'}
        patientInfo={{ name: p?.full_name ?? '', mr: p?.mr_number ?? null, age: p?.age ?? null, gender: p?.gender ?? null, address: p?.address ?? null, phone: p?.phone ?? null }}
        aftercare={aftercare}
        phone={p?.phone ?? null}
        layout={printCfg.layout}
      />
    </div>
  )
}

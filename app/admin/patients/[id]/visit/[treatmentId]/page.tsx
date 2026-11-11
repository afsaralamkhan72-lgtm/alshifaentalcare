import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissions, getStaffProfile, isOwnerRole } from '@/lib/auth'
import { todayKarachi } from '@/lib/karachi'
import { mapTemplates } from '@/lib/messageTemplates'
import FollowUpVisit, { type FuMaterial, type FuMedicine, type FuStage, type FuVisit } from '@/components/admin/visit/FollowUpVisit'

export const dynamic = 'force-dynamic'

const num = (v: unknown) => Number(v) || 0

export default async function FollowUpVisitPage({ params }: { params: Promise<{ id: string; treatmentId: string }> }) {
  const { id, treatmentId } = await params
  const supabase = await createClient()
  const [staff, perms] = await Promise.all([getStaffProfile(), getPermissions()])
  const can = (p: string) => perms.includes(p)
  if (!can('clinical.edit')) redirect('/admin/patients/' + id)
  const isOwner = isOwnerRole(staff.role)
  const canMoney = isOwner || can('billing.view')
  const today = todayKarachi()

  const [pRes, tRes] = await Promise.all([
    supabase.from('patients').select('id, full_name, phone, gender, mr_number, deleted_at').eq('id', id).maybeSingle(),
    supabase.from('patient_treatments').select('id, patient_id, catalog_id, name, teeth, status').eq('id', treatmentId).maybeSingle(),
  ])
  const patient = pRes.data
  const t = tRes.data
  if (!patient || patient.deleted_at || !t || t.patient_id !== id) notFound()

  const back = '/admin/patients/' + id
  const shell = (body: React.ReactNode) => (
    <div className="mx-auto max-w-2xl">
      <Link href={back} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-clinic-teal">
        ← Mareez ke profile par wapas
      </Link>
      {body}
    </div>
  )
  if (t.status !== 'active') {
    return shell(
      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" data-testid="fu-not-active">
        Ye ilaaj ({t.name}) abhi chal nahi raha ({t.status === 'planned' ? 'sirf plan hai' : t.status === 'completed' ? 'mukammal ho chuka' : 'cancel hai'}). Agli visit sirf chalte ilaaj ki khulti hai.
      </div>,
    )
  }

  const [vRes, bRes, sRes, mRes, invRes, medRes, dRes, tplRes, pbRes, ivRes] = await Promise.all([
    supabase.from('visit_notes').select('id, visit_no, visit_date, procedure, notes').eq('treatment_id', treatmentId).is('voided_at', null).order('visit_date', { ascending: false }).order('visit_no', { ascending: false }),
    canMoney ? supabase.from('treatment_balances').select('charged, paid, balance').eq('treatment_id', treatmentId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('treatment_stages').select('id, label, sort_order, done_on').eq('treatment_id', treatmentId).order('sort_order'),
    t.catalog_id ? supabase.from('treatment_materials').select('inventory_id, default_qty, inventory(item_name, unit)').eq('treatment_id', t.catalog_id) : Promise.resolve({ data: [] }),
    supabase.from('inventory').select('id, item_name, unit').eq('is_active', true).is('deleted_at', null).order('item_name'),
    can('prescriptions.write') ? supabase.from('medicines').select('id, category, name, strength, potency, default_dose, default_frequency, default_duration, instructions').eq('is_active', true).order('name') : Promise.resolve({ data: [] }),
    supabase.from('clinical_visits').select('id, complaint, findings, diagnoses, draft_extra').eq('patient_id', id).eq('status', 'draft').eq('visit_date', today).limit(1),
    supabase.from('message_templates').select('key, body'),
    canMoney ? supabase.from('patient_balances').select('balance').eq('patient_id', id).maybeSingle() : Promise.resolve({ data: null }),
    canMoney ? supabase.from('invoices').select('id, total, paid_amount, invoice_date, created_at').eq('patient_treatment_id', treatmentId).eq('status', 'active').order('invoice_date').order('created_at') : Promise.resolve({ data: [] }),
  ])

  const draft = (dRes.data ?? [])[0] as { id: string; complaint: { items?: unknown[]; other?: string } | null; findings: unknown; diagnoses: unknown[] | null; draft_extra: { rows?: unknown[]; lines?: unknown[] } | null } | undefined
  const draftHasWork =
    !!draft &&
    ((draft.complaint?.items?.length ?? 0) > 0 ||
      Boolean(draft.complaint?.other) ||
      (Array.isArray(draft.diagnoses) && draft.diagnoses.length > 0) ||
      (draft.draft_extra?.rows?.length ?? 0) > 0 ||
      (draft.draft_extra?.lines?.length ?? 0) > 0)
  if (draftHasWork) {
    return shell(
      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" data-testid="fu-draft-block">
        Is mareez ki aaj ki ek adhoori visit pehle se khuli hai (us mein kaam likha hua hai). Pehle profile par ja kar us visit ko khatam karein, phir yahan aayein.
      </div>,
    )
  }

  const visits = ((vRes.data ?? []) as FuVisit[]).slice(0, 5)
  const visitCount = (vRes.data ?? []).length
  const linked: FuMaterial[] = ((mRes.data ?? []) as unknown as { inventory_id: string; default_qty: number; inventory: { item_name: string; unit: string | null } | { item_name: string; unit: string | null }[] | null }[]).map((m) => {
    const inv = Array.isArray(m.inventory) ? m.inventory[0] : m.inventory
    return { inventory_id: m.inventory_id, name: inv?.item_name ?? '', unit: inv?.unit ?? null, default_qty: num(m.default_qty) }
  }).filter((m) => m.name)
  const linkedIds = new Set(linked.map((m) => m.inventory_id))
  const stock: FuMaterial[] = ((invRes.data ?? []) as { id: string; item_name: string; unit: string | null }[]).filter((i) => !linkedIds.has(i.id)).map((i) => ({ inventory_id: i.id, name: i.item_name, unit: i.unit, default_qty: 1 }))

  return shell(
    <FollowUpVisit
      patient={{ id: patient.id, full_name: patient.full_name, phone: patient.phone, gender: (patient.gender as string | null) ?? null, mr_number: (patient.mr_number as string | null) ?? null }}
      treatment={{ id: t.id, name: t.name, teeth: (t.teeth ?? []) as string[], catalog_id: (t.catalog_id as string | null) ?? null }}
      visitNo={visitCount + 1}
      visits={visits}
      stages={('error' in sRes && sRes.error ? [] : sRes.data ?? []) as FuStage[]}
      linked={linked}
      stock={stock}
      medicines={(medRes.data ?? []) as FuMedicine[]}
      money={canMoney ? { charged: num(bRes.data?.charged), paid: num(bRes.data?.paid), balance: num(bRes.data?.balance), patientBalance: num(pbRes.data?.balance) } : null}
      dues={((ivRes.data ?? []) as { id: string; total: number; paid_amount: number }[]).map((i) => ({ id: i.id, due: Math.round((num(i.total) - num(i.paid_amount)) * 100) / 100 })).filter((i) => i.due > 0)}
      canCollect={can('billing.collect')}
      canRx={can('prescriptions.write')}
      canLab={can('lab.view')}
      tpl={mapTemplates(tplRes.data as { key: string; body: string }[] | null)}
      today={today}
    />,
  )
}

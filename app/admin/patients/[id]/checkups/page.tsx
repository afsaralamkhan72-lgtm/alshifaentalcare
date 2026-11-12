import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissions, getStaffProfile, isOwnerRole } from '@/lib/auth'
import { HistorySection, type PatientRow } from '../_sections'

export const dynamic = 'force-dynamic'

export default async function CheckupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [staff, perms, pRes] = await Promise.all([getStaffProfile(), getPermissions(), supabase.from('patients').select('*').eq('id', id).maybeSingle()])
  const patient = pRes.data
  if (!patient || patient.deleted_at) notFound()
  const can = (p: string) => perms.includes(p)
  if (!can('clinical.view')) notFound()
  const canMoney = isOwnerRole(staff.role) || can('billing.view')
  const { data: hist } = await supabase.from('patient_history').select('*').eq('patient_id', id).maybeSingle()
  return (
    <div className="mx-auto grid max-w-3xl gap-4" data-testid="checkups-page">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={'/admin/patients/' + id} className="inline-flex min-h-[44px] items-center rounded-full border border-clinic-teal/30 px-4 py-2 text-sm font-semibold text-clinic-teal">
          ← Mareez ka profile
        </Link>
        <p className="text-sm text-clinic-ink/70">
          <span className="font-semibold capitalize text-clinic-ink">{patient.full_name}</span>
          {patient.mr_number ? ' · ' + patient.mr_number : ''}
        </p>
      </div>
      <h1 className="font-display text-xl font-semibold text-clinic-ink">Checkup aur muaina</h1>
      <p className="-mt-3 text-sm text-clinic-ink/60">Har visit ki takleef, tashkhees aur dawa. Jis visit mein kisi ilaaj par kaam hua, us ilaaj ka naam dabane se us ka page khulta hai.</p>
      <HistorySection open patient={patient as PatientRow} history={(hist as Record<string, unknown> | null) ?? null} canClinical canMoney={canMoney} canRx={can('prescriptions.view')} />
    </div>
  )
}

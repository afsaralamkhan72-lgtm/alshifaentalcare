import Link from 'next/link'
import { Suspense } from 'react'
import LiveSearch from '@/components/admin/LiveSearch'
import { createClient } from '@/lib/supabase/server'
import { getStaffProfile, isOwnerRole, requirePerm } from '@/lib/auth'
import PatientsToolbar from '@/components/admin/PatientsToolbar'
import PatientsTable, { type PatientRow } from '@/components/admin/PatientsTable'

interface SearchParams {
  department?: string
  q?: string
}

/** Sirf list mein dikhne wale patients ka baqaya (pehle saare patients ka hisaab aata tha) */
async function getBalances(ids: string[]) {
  if (ids.length === 0) return {}
  const supabase = await createClient()
  const { data } = await supabase.from('patient_balances').select('patient_id, balance').in('patient_id', ids).gt('balance', 0)
  const out: Record<string, number> = {}
  for (const r of data ?? []) out[r.patient_id] = Number(r.balance)
  return out
}

async function getKnownDoctors() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('treating_doctors')
    .select('name')
    .eq('is_active', true)
    .order('name')
  return (data ?? []).map((d) => d.name)
}

async function getPatients(params: SearchParams) {
  const supabase = await createClient()

  let query = supabase
    .from('patients')
    .select('id, mr_number, full_name, phone, department, age, created_at, portal_code, primary_doctor')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (params.department && params.department !== 'all') {
    query = query.eq('department', params.department)
  }

  if (params.q) {
    const safeQ = params.q.replace(/[,%()*\\"']/g, ' ').trim()
    query = query.or(`full_name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%,mr_number.ilike.%${safeQ}%`)
  }

  const { data } = await query.limit(100)
  return data ?? []
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requirePerm('patients.view')
  const params = await searchParams
  const profile = await getStaffProfile()
  const canBill = isOwnerRole(profile.role)
  const [patients, knownDoctors] = await Promise.all([getPatients(params), getKnownDoctors()])
  const balances = canBill ? await getBalances(patients.map((p) => p.id as string)) : {}

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Patients</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">{patients.length} patient(s) found</p>
        </div>
        <PatientsToolbar knownDoctors={knownDoctors} />
      </div>

      <form className="mt-6 flex flex-wrap gap-3">
        <select
          name="department"
          defaultValue={params.department ?? 'all'}
          className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
        >
          <option value="all">All Departments</option>
          <option value="dental">Dental</option>
          <option value="homeopathic">Homeopathic</option>
        </select>
        <Suspense>
          <LiveSearch />
        </Suspense>
        <button type="submit" className="rounded-lg bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      <div className="mt-6">
        <PatientsTable
          patients={patients as PatientRow[]}
          knownDoctors={knownDoctors}
          balances={balances}
          canBill={canBill}
        />
      </div>
    </div>
  )
}

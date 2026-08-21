import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PatientsToolbar from '@/components/admin/PatientsToolbar'

interface SearchParams {
  department?: string
  q?: string
}

async function getPatients(params: SearchParams) {
  const supabase = await createClient()
  let query = supabase
    .from('patients')
    .select('id, mr_number, full_name, phone, department, age, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (params.department && params.department !== 'all') {
    query = query.eq('department', params.department)
  }

  if (params.q) {
    const safeQ = params.q.replace(/[,%]/g, '')
    query = query.or(`full_name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`)
  }

  const { data } = await query.limit(100)
  return data ?? []
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const patients = await getPatients(params)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clinic-ink">Patients</h1>
          <p className="mt-1 text-sm text-clinic-ink/60">{patients.length} patient(s) found</p>
        </div>
        <PatientsToolbar />
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
        <input
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Search by name or phone..."
          className="min-w-[200px] flex-1 rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60">
            <tr>
              <th className="px-4 py-3">MR#</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-t border-clinic-teal/10">
                <td className="px-4 py-3 font-medium text-clinic-ink">{p.mr_number}</td>
                <td className="px-4 py-3">{p.full_name}</td>
                <td className="px-4 py-3">{p.phone}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      p.department === 'dental' ? 'bg-clinic-teal/10 text-clinic-teal' : 'bg-clinic-amber/10 text-clinic-amber'
                    }`}
                  >
                    {p.department}
                  </span>
                </td>
                <td className="px-4 py-3">{p.age ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/patients/${p.id}`} className="text-sm font-semibold text-clinic-teal hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-clinic-ink/50">
                  Koi patient nahi mila.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

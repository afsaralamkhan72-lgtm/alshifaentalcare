import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

async function getDentalPatients() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('patients')
    .select('id, mr_number, full_name, phone')
    .is('deleted_at', null)
    .eq('department', 'dental')
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}

export default async function DentalChartIndexPage() {
  const patients = await getDentalPatients()

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Dental Chart</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Patient select karein unka interactive tooth chart kholne ke liye.
      </p>

      <div className="mt-6 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
        {patients.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-clinic-ink/50">
            Koi dental patient register nahi hua abhi.
          </p>
        ) : (
          patients.map((p) => (
            <Link
              key={p.id}
              href={`/admin/patients/${p.id}#dental-chart`}
              className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-clinic-mint/20"
            >
              <div>
                <p className="font-medium text-clinic-ink">{p.full_name}</p>
                <p className="text-xs text-clinic-ink/50">
                  {p.mr_number} · {p.phone}
                </p>
              </div>
              <span className="font-semibold text-clinic-teal">Open Chart →</span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

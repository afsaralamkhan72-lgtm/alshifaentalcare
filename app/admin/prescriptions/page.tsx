import { createClient } from '@/lib/supabase/server'
import PrescriptionForm from '@/components/admin/PrescriptionForm'

interface PrescriptionItem {
  name_en?: string
  name_ur?: string
  potency?: string
  dosage?: string
  frequency?: string
  duration?: string
}

async function getData() {
  const supabase = await createClient()

  const [patientsRes, recentRes] = await Promise.all([
    supabase
      .from('patients')
      .select('id, full_name, phone, department, mr_number')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('prescriptions')
      .select('id, department, items, prescribed_date, patients(full_name, mr_number)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return {
    patients: patientsRes.data ?? [],
    recent: recentRes.data ?? [],
  }
}

export default async function PrescriptionsPage() {
  const { patients, recent } = await getData()

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Prescriptions</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Bilingual (English / اردو) prescription banayein aur WhatsApp par bhejein.
      </p>

      <div className="mt-6">
        <PrescriptionForm patients={patients} />
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold text-clinic-ink">Recent Prescriptions</h2>

      <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-clinic-ink/50">
            Abhi koi prescription record nahi hui.
          </p>
        ) : (
          recent.map((rx) => {
            const patient = rx.patients as unknown as { full_name: string; mr_number: string } | null
            const items = (rx.items ?? []) as PrescriptionItem[]

            return (
              <div key={rx.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-clinic-ink">
                    {patient?.full_name ?? 'Unknown'}{' '}
                    <span className="text-xs text-clinic-ink/40">{patient?.mr_number}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                        rx.department === 'dental'
                          ? 'bg-clinic-teal/10 text-clinic-teal'
                          : 'bg-clinic-amber/10 text-clinic-amber'
                      }`}
                    >
                      {rx.department}
                    </span>
                    <span className="text-xs text-clinic-ink/40">
                      {new Date(rx.prescribed_date).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-clinic-ink/60">
                  {items.map((it) => it.name_en || it.name_ur).filter(Boolean).join(' · ')}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

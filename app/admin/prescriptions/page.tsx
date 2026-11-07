import Link from 'next/link'
import { requirePerm } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import PatientPicker from '@/components/admin/PatientPicker'

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

  const { data } = await supabase
    .from('prescriptions')
    .select('id, department, items, prescribed_date, patients(id, full_name, mr_number)')
    .order('created_at', { ascending: false })
    .limit(60)

  return { recent: data ?? [] }
}

export default async function PrescriptionsPage() {
  await requirePerm('prescriptions.view')
  const { recent } = await getData()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Prescriptions</h1>
        <PatientPicker />
      </div>
      <p className="mt-1 text-xs text-clinic-ink/50">Naya prescription: patient chunein, us ki visit mein dawaiyan likhein. Phir yahan nazar aayegi.</p>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Pichli prescriptions dekhein aur print karein. <strong>Nayi prescription</strong> patient ke page par visit ke andar likhi jati hai (taake wo visit aur bill se juri rahe).
      </p>

      <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-clinic-ink/50">
            Abhi koi prescription record nahi hui.
          </p>
        ) : (
          recent.map((rx) => {
            const patient = rx.patients as unknown as { id: string; full_name: string; mr_number: string } | null
            const items = (rx.items ?? []) as PrescriptionItem[]

            return (
              <div key={rx.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-clinic-ink">
                    {patient ? (
                      <Link href={`/admin/patients/${patient.id}`} className="hover:text-clinic-teal">
                        {patient.full_name}
                      </Link>
                    ) : (
                      'Unknown'
                    )}{' '}
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
                    <Link href={`/admin/prescriptions/${rx.id}/print`} className="text-xs font-semibold text-clinic-teal hover:underline">
                      Print
                    </Link>
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

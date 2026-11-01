import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requirePerm } from '@/lib/auth'
import { CLINIC } from '@/clinic.config'
import { fmtDate } from '@/lib/karachi'
import SheetPrintButton from '@/components/admin/SheetPrintButton'

interface RxItem {
  name_en?: string
  name_ur?: string
  potency?: string
  dosage?: string
  frequency?: string
  duration?: string
}

export default async function PrescriptionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm('prescriptions.view')
  const { id } = await params
  const supabase = await createClient()
  const { data: rx } = await supabase
    .from('prescriptions')
    .select('id, department, items, notes_en, notes_ur, prescribed_date, patient_id, treatment_id, patients(full_name, mr_number, age, gender, phone)')
    .eq('id', id)
    .maybeSingle()
  if (!rx) notFound()

  const p = rx.patients as unknown as { full_name: string; mr_number: string | null; age: number | null; gender: string | null; phone: string } | null
  let treatmentName: string | null = null
  if (rx.treatment_id) {
    const { data: t } = await supabase.from('patient_treatments').select('name').eq('id', rx.treatment_id).maybeSingle()
    treatmentName = t?.name ?? null
  }
  const items = (rx.items ?? []) as RxItem[]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/patients/${rx.patient_id}`} className="text-sm text-clinic-ink/50 hover:text-clinic-teal">
          ← Patient
        </Link>
        <SheetPrintButton />
      </div>

      <div id="print-sheet" className="rounded-2xl border border-clinic-teal/10 bg-white p-8 text-clinic-ink">
        <header className="flex items-start justify-between border-b-2 border-clinic-teal pb-4">
          <div>
            <p className="font-display text-2xl font-semibold text-clinic-teal">{CLINIC.name}</p>
            <p className="text-sm text-clinic-ink/70">{CLINIC.tagline}</p>
            <p className="mt-1 text-xs text-clinic-ink/60">
              {CLINIC.address.full} · {CLINIC.phone.display}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{CLINIC.doctor.name}</p>
            <p className="text-xs text-clinic-ink/70">{CLINIC.doctor.qualification}</p>
            {CLINIC.doctor.registration && <p className="text-xs text-clinic-ink/70">Reg. No: {CLINIC.doctor.registration}</p>}
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <p>
            <span className="text-clinic-ink/50">Patient: </span>
            <span className="font-semibold capitalize">{p?.full_name}</span>
          </p>
          <p>
            <span className="text-clinic-ink/50">MR: </span>
            {p?.mr_number ?? '—'}
          </p>
          <p>
            <span className="text-clinic-ink/50">Age/Sex: </span>
            {p?.age ?? '—'} / <span className="capitalize">{p?.gender ?? '—'}</span>
          </p>
          <p>
            <span className="text-clinic-ink/50">Date: </span>
            {fmtDate(rx.prescribed_date)}
          </p>
        </section>
        {treatmentName && <p className="mt-1 text-sm text-clinic-ink/60">Treatment: {treatmentName}</p>}

        <p className="mt-6 font-display text-3xl font-semibold text-clinic-teal">℞</p>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-clinic-ink/20 text-left text-xs text-clinic-ink/50">
              <th className="py-1.5">#</th>
              <th className="py-1.5">Medicine</th>
              <th className="py-1.5">Dose</th>
              <th className="py-1.5">Kitni baar</th>
              <th className="py-1.5">Kitne din</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-clinic-ink/10 align-top">
                <td className="py-2 pr-2 text-clinic-ink/50">{i + 1}</td>
                <td className="py-2 pr-2">
                  <p className="font-semibold">
                    {it.name_en}
                    {it.potency ? ` ${it.potency}` : ''}
                  </p>
                  {it.name_ur && (
                    <p dir="rtl" className="text-right text-clinic-ink/70">
                      {it.name_ur}
                    </p>
                  )}
                </td>
                <td className="py-2 pr-2">{it.dosage}</td>
                <td className="py-2 pr-2">{it.frequency}</td>
                <td className="py-2">{it.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(rx.notes_en || rx.notes_ur) && (
          <div className="mt-4 rounded-lg bg-clinic-sand/60 p-3 text-sm">
            {rx.notes_en && <p>{rx.notes_en}</p>}
            {rx.notes_ur && (
              <p dir="rtl" className="mt-1 text-right">
                {rx.notes_ur}
              </p>
            )}
          </div>
        )}

        <footer className="mt-16 flex items-end justify-between text-xs text-clinic-ink/60">
          <p>{CLINIC.timings.full}</p>
          <div className="text-center">
            <div className="w-48 border-t border-clinic-ink/40" />
            <p className="mt-1">Signature</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

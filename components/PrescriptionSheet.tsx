import { CLINIC } from '@/clinic.config'
import { fmtDate } from '@/lib/karachi'

export interface RxItem {
  name_en?: string
  name_ur?: string
  potency?: string
  dosage?: string
  frequency?: string
  duration?: string
  instructions?: string
  mode?: string
}
export interface RxSheetData {
  items: RxItem[]
  notes_en: string | null
  notes_ur: string | null
  prescribed_date: string
  treatmentName: string | null
  patient: { full_name: string; mr_number: string | null; age: number | null; gender: string | null } | null
}

/** Prescription ka saaf safha (print / PDF / patient portal, teeno jagah wahi) */
export default function PrescriptionSheet({ rx, bare = false }: { rx: RxSheetData; bare?: boolean }) {
  const p = rx.patient
  return (
    <div id={bare ? undefined : 'print-sheet'} className={bare ? 'text-clinic-ink' : 'rounded-2xl border border-clinic-teal/10 bg-white p-5 text-clinic-ink sm:p-8'}>
      {!bare && <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-clinic-teal pb-4">
        <div>
          <p className="font-display text-2xl font-semibold text-clinic-teal">{CLINIC.name}</p>
          <p className="text-sm text-clinic-ink/70">{CLINIC.tagline}</p>
          <p className="mt-1 text-xs text-clinic-ink/60">
            {CLINIC.address.full} · {CLINIC.phone.display}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-semibold">{CLINIC.doctor.name}</p>
          <p className="text-xs text-clinic-ink/70">{CLINIC.doctor.qualification}</p>
          {CLINIC.doctor.registration && <p className="text-xs text-clinic-ink/70">Reg. No: {CLINIC.doctor.registration}</p>}
        </div>
      </header>}

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
      {rx.treatmentName && <p className="mt-1 text-sm text-clinic-ink/60">Treatment: {rx.treatmentName}</p>}

      <p className="mt-6 font-display text-3xl font-semibold text-clinic-teal">℞</p>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-xs sm:text-sm">
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
            {rx.items.map((it, i) => (
              <tr key={i} className="border-b border-clinic-ink/10 align-top">
                <td className="py-2 pr-2 text-clinic-ink/50">{i + 1}</td>
                <td className="py-2 pr-2">
                  <p className="font-semibold">
                    {it.name_en || it.name_ur}
                    {it.potency ? ` ${it.potency}` : ''}
                  </p>
                  {it.name_en && it.name_ur && (
                    <p dir="rtl" className="text-right text-clinic-ink/70">
                      {it.name_ur}
                    </p>
                  )}
                  {it.instructions && <p className="text-xs text-clinic-ink/60">{it.instructions}</p>}
                  {it.mode === 'dispense' && <p className="text-[11px] text-clinic-ink/50">(clinic se di gayi)</p>}
                </td>
                <td className="py-2 pr-2">{it.dosage}</td>
                <td className="py-2 pr-2">{it.frequency}</td>
                <td className="py-2">{it.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      <footer className="mt-12 flex flex-wrap items-end justify-between gap-4 text-xs text-clinic-ink/60">
        <p>{CLINIC.timings.full}</p>
        <div className="text-center">
          <div className="w-48 border-t border-clinic-ink/40" />
          <p className="mt-1">Signature</p>
        </div>
      </footer>
    </div>
  )
}

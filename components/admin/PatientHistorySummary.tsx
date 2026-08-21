import { HISTORY_STEPS } from '@/lib/history-steps'
import ClinicLogo from '@/components/ClinicLogo'

type SectionData = Record<string, unknown>

interface Props {
  history: Record<string, unknown> | null
  patient: {
    full_name: string
    mr_number: string | null
    phone: string
    age: number | null
    gender: string | null
    department: string
    address: string | null
    date_of_birth: string | null
  }
  dentalRecords: {
    id: string
    tooth_number: string
    condition: string
    notes: string | null
    treatment_date: string
  }[]
  clinic: Record<string, string>
}

/** Renders a stored value as readable text */
function display(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) return value.length ? value.join(', ') : null
  if (typeof value === 'number') return String(value)
  return String(value)
}

export default function PatientHistorySummary({
  history,
  patient,
  dentalRecords,
  clinic,
}: Props) {
  const finalized = Boolean(history?.is_finalized)

  return (
    <div id="history-sheet" className="rounded-2xl border border-clinic-teal/10 bg-white p-8">
      {/* Letterhead */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-clinic-teal/20 pb-4">
        <div className="flex items-start gap-4">
          <ClinicLogo logoUrl={clinic.logo_url} size={56} />
          <div>
          <p className="font-display text-xl font-semibold text-clinic-teal">
            {clinic.name ?? 'Al Shifa Health Care'}
          </p>
          <p className="text-sm text-clinic-ink/60">
            {clinic.doctor_name ?? 'Dr. Muhammad Khalid Mahmood'}
          </p>
          <p className="mt-1 text-xs text-clinic-ink/50">
            {clinic.address ?? 'Numaish, Nizami Road, Karachi'} · {clinic.phone ?? '0342-2078639'}
          </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-clinic-ink/50">MR Number</p>
          <p className="font-display text-lg font-semibold text-clinic-ink">
            {patient.mr_number}
          </p>
          {finalized && (
            <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Finalised
            </span>
          )}
        </div>
      </div>

      <p className="mt-6 font-display text-lg font-semibold text-clinic-ink">
        Patient History
      </p>

      {/* Registration details */}
      <Section title="Patient Details">
        <Grid
          items={[
            ['Name', patient.full_name],
            ['Phone', patient.phone],
            ['Age', patient.age ? String(patient.age) : null],
            ['Gender', patient.gender],
            ['Department', patient.department],
            [
              'Date of Birth',
              patient.date_of_birth
                ? new Date(patient.date_of_birth).toLocaleDateString('en-GB')
                : null,
            ],
            ['Address', patient.address],
          ]}
        />
      </Section>

      {/* Every wizard step, in order */}
      {HISTORY_STEPS.map((step) => {
        const section = (history?.[step.column] as SectionData) ?? {}

        const items = step.fields
          .map((f) => [f.label, display(section[f.key])] as [string, string | null])
          .filter(([, v]) => v !== null)

        if (items.length === 0) return null

        return (
          <Section key={step.column} title={step.title}>
            <Grid items={items} />
          </Section>
        )
      })}

      {/* Dental chart findings */}
      {dentalRecords.length > 0 && (
        <Section title="Dental Chart">
          <div className="grid gap-2">
            {dentalRecords.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-baseline gap-2 border-b border-clinic-teal/10 pb-2 text-sm last:border-0"
              >
                <span className="rounded-md border border-clinic-teal px-2 py-0.5 font-display text-xs font-semibold text-clinic-teal">
                  {r.tooth_number}
                </span>
                <span className="font-medium capitalize text-clinic-ink">
                  {r.condition.replace(/_/g, ' ')}
                </span>
                {r.notes && <span className="text-clinic-ink/60">— {r.notes}</span>}
                <span className="ml-auto text-xs text-clinic-ink/40">
                  {new Date(r.treatment_date).toLocaleDateString('en-GB')}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Signatures */}
      <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-clinic-ink/50">
        <div className="border-t border-clinic-ink/20 pt-2">Doctor&apos;s Signature</div>
        <div className="border-t border-clinic-ink/20 pt-2">Patient / Guardian Signature</div>
      </div>

      <p className="mt-6 text-center text-xs text-clinic-ink/40">
        Printed {new Date().toLocaleDateString('en-GB')}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <p className="text-xs font-semibold uppercase tracking-wide text-clinic-amber">{title}</p>
      <div className="mt-2 rounded-xl bg-clinic-mint/40 p-4">{children}</div>
    </section>
  )
}

function Grid({ items }: { items: [string, string | null][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className={value && value.length > 60 ? 'sm:col-span-2' : ''}>
          <dt className="text-xs text-clinic-ink/50">{label}</dt>
          <dd className="mt-0.5 text-sm text-clinic-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

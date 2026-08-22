import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CLINIC, timingsLine } from '@/clinic.config'
import ClinicLogo from '@/components/ClinicLogo'
import HistoryPrintButton from '@/components/admin/HistoryPrintButton'
import { toothLabel } from '@/lib/teeth'

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB') : '—'
}

export default async function TreatmentSummaryPage({
  params,
}: {
  params: Promise<{ id: string; episodeId: string }>
}) {
  const { id, episodeId } = await params
  const supabase = await createClient()

  const [episodeRes, patientRes, clinicRes] = await Promise.all([
    supabase.from('treatment_episodes').select('*').eq('id', episodeId).maybeSingle(),
    supabase
      .from('patients')
      .select('full_name, mr_number, phone, age, gender, department')
      .eq('id', id)
      .single(),
    supabase.from('site_settings').select('value').eq('key', 'clinic_info').maybeSingle(),
  ])

  const episode = episodeRes.data
  const patient = patientRes.data
  if (!episode || !patient) notFound()

  const clinic = (clinicRes.data?.value ?? {}) as Record<string, string>
  const teeth = (episode.tooth_numbers ?? []) as string[]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/admin/patients/${id}`}
          className="text-sm text-clinic-ink/50 hover:text-clinic-teal"
        >
          ← {patient.full_name}
        </Link>
        <HistoryPrintButton />
      </div>

      <div
        id="history-sheet"
        className="mx-auto mt-4 max-w-2xl overflow-hidden rounded-2xl border border-clinic-teal/20 bg-white"
      >
        {/* Letterhead */}
        <div className="flex items-start gap-4 bg-clinic-teal px-4 py-6 text-white sm:px-8">
          <div className="rounded-lg bg-white p-1.5">
            <ClinicLogo logoUrl={clinic.logo_url} size={48} />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-white">
              {clinic.name ?? CLINIC.name}
            </p>
            <p className="text-sm text-white/90">{clinic.doctor_name ?? CLINIC.doctor.name}</p>
            <p className="mt-1 text-xs text-white/80">
              {clinic.address ?? CLINIC.address.full} · {clinic.phone ?? CLINIC.phone.display}
            </p>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-8">
          <p className="font-display text-lg font-semibold text-clinic-ink">
            Treatment Completion Record
          </p>

          {/* Patient */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium text-clinic-ink/70">Patient</p>
              <p className="font-medium text-clinic-ink">{patient.full_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-clinic-ink/70">MR Number</p>
              <p className="font-medium text-clinic-ink">{patient.mr_number}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-clinic-ink/70">Age / Gender</p>
              <p className="font-medium capitalize text-clinic-ink">
                {patient.age ?? '—'} / {patient.gender ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-clinic-ink/70">Phone</p>
              <p className="font-medium text-clinic-ink">{patient.phone}</p>
            </div>
          </div>

          {/* Treatment */}
          <div className="mt-6 rounded-xl bg-clinic-mint/60 p-4">
            <p className="font-display text-lg font-semibold text-clinic-teal">
              {episode.title}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-medium text-clinic-ink/70">Shuru</p>
                <p className="font-medium text-clinic-ink">{fmt(episode.started_on)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-clinic-ink/70">Mukammal</p>
                <p className="font-medium text-clinic-ink">{fmt(episode.completed_on)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-clinic-ink/70">Total Visits</p>
                <p className="font-medium text-clinic-ink">{episode.visit_count}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-clinic-ink/70">Doctor</p>
                <p className="font-medium text-clinic-ink">{episode.doctor_name ?? '—'}</p>
              </div>
            </div>

            {teeth.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-clinic-ink/70">Teeth Treated</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {teeth.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-clinic-teal bg-white px-2 py-1 font-display text-sm font-semibold text-clinic-teal"
                    >
                      {toothLabel(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {episode.summary && (
            <div className="mt-4">
              <p className="text-xs font-medium text-clinic-ink/70">Notes</p>
              <p className="mt-1 whitespace-pre-line text-sm text-clinic-ink">
                {episode.summary}
              </p>
            </div>
          )}

          {/* Hisaab */}
          <div className="mt-6 border-t border-clinic-teal/20 pt-4">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-clinic-ink">Total Charges</span>
              <span className="font-medium">
                Rs. {Number(episode.total_charged).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-clinic-ink">Total Paid</span>
              <span className="font-medium text-emerald-700">
                Rs. {Number(episode.total_paid).toLocaleString()}
              </span>
            </div>
            <div
              className={`mt-2 flex justify-between rounded-xl px-4 py-3 text-base ${
                Number(episode.balance_left) > 0
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-clinic-teal text-white'
              }`}
            >
              <span className="font-semibold">
                {Number(episode.balance_left) > 0 ? 'Baqaya' : 'Hisaab Clear'}
              </span>
              <span className="font-display font-semibold">
                Rs. {Number(episode.balance_left).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-clinic-ink/60">
            <div className="border-t border-clinic-ink/20 pt-2">Doctor&apos;s Signature</div>
            <div className="border-t border-clinic-ink/20 pt-2">Patient Signature</div>
          </div>

          <p className="mt-6 border-t border-clinic-teal/20 pt-4 text-center text-xs text-clinic-ink/70">
            {clinic.timings || timingsLine(clinic.closed_day)}
          </p>
        </div>
      </div>
    </div>
  )
}

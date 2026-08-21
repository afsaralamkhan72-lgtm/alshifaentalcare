import Link from 'next/link'

export interface TimelineEntry {
  date: string
  kind: 'visit' | 'treatment' | 'prescription'
  title: string
  detail?: string | null
  doctor?: string | null
  amount?: number | null
  nextVisit?: string | null
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function daysBetween(a: string, b: string) {
  return Math.round(
    Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000
  )
}

const STYLES: Record<TimelineEntry['kind'], { label: string; dot: string; chip: string }> = {
  visit: {
    label: 'Visit',
    dot: 'bg-clinic-teal',
    chip: 'bg-clinic-teal/10 text-clinic-teal',
  },
  treatment: {
    label: 'Treatment',
    dot: 'bg-clinic-amber',
    chip: 'bg-clinic-amber/10 text-clinic-amber',
  },
  prescription: {
    label: 'Prescription',
    dot: 'bg-emerald-600',
    chip: 'bg-emerald-50 text-emerald-700',
  },
}

export default function VisitTimeline({
  entries,
  patientId,
}: {
  entries: TimelineEntry[]
  patientId: string
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-6 text-center text-sm text-clinic-ink/60">
        Ye patient ka pehla visit hai. Koi purana record nahi.
      </div>
    )
  }

  const last = entries[0]
  const today = new Date().toISOString().slice(0, 10)
  const gap = daysBetween(last.date, today)
  const visitCount = entries.filter((e) => e.kind === 'visit').length

  return (
    <div className="rounded-2xl border border-clinic-teal/20 bg-white p-6">
      {/* Sabse pehle: pichli baar kab aaya aur kya hua */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-clinic-teal/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-clinic-amber">
            Pichla Visit
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-clinic-ink">
            {last.title}
          </p>
          <p className="mt-0.5 text-sm text-clinic-ink/70">
            {fmt(last.date)}
            {gap > 0 && ` · ${gap} din pehle`}
            {last.doctor && ` · ${last.doctor}`}
          </p>
          {last.detail && (
            <p className="mt-1 text-sm text-clinic-ink/70">{last.detail}</p>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs font-medium text-clinic-ink/70">Total Visits</p>
          <p className="font-display text-2xl font-semibold text-clinic-teal">
            {visitCount || entries.length}
          </p>
        </div>
      </div>

      {/* Poori timeline */}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-clinic-ink/60">
        Poora Record
      </p>

      <ol className="mt-3 space-y-0">
        {entries.map((e, i) => {
          const style = STYLES[e.kind]
          const isLast = i === entries.length - 1

          return (
            <li key={`${e.date}-${i}`} className="relative flex gap-3 pb-4">
              {/* line + dot */}
              <div className="flex flex-col items-center">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                {!isLast && <span className="mt-1 w-px flex-1 bg-clinic-teal/15" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-clinic-ink">{e.title}</p>
                  <span className="shrink-0 text-xs text-clinic-ink/60">{fmt(e.date)}</span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.chip}`}>
                    {style.label}
                  </span>
                  {e.doctor && (
                    <span className="text-xs text-clinic-ink/60">{e.doctor}</span>
                  )}
                  {e.amount != null && e.amount > 0 && (
                    <span className="text-xs font-medium text-clinic-ink">
                      Rs. {e.amount.toLocaleString()}
                    </span>
                  )}
                </div>

                {e.detail && (
                  <p className="mt-1 text-sm text-clinic-ink/70">{e.detail}</p>
                )}

                {e.nextVisit && (
                  <p className="mt-1 text-xs font-medium text-clinic-teal">
                    Agla visit: {fmt(e.nextVisit)}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <Link
        href={`/admin/patients/${patientId}/history?view=summary`}
        className="mt-2 inline-block text-sm font-semibold text-clinic-teal hover:underline"
      >
        Poori history dekhein →
      </Link>
    </div>
  )
}

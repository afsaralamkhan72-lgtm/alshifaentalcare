import Link from 'next/link'
import { money, numFmt, fmtDate } from '@/lib/karachi'

export interface DayRow {
  id: string
  label: string
  total: number
  paidToday: number
  balance: number
}
export interface DayVisit {
  dateLabel: string
  isToday: boolean
  visitId: string
  count: number
  rows: DayRow[]
  total: number
  paidToday: number
  balance: number
  patientBalance: number | null
  summary: string
  waHref: string | null
  nextDate: string | null
}

/** Profile par: aaj (ya akhri visit wale din) ke sab kaam ek jagah; ek Invoice, ek WhatsApp */
export default function DayVisitCard({ d }: { d: DayVisit }) {
  const btn = 'inline-flex min-h-[44px] items-center rounded-full px-5 py-2 text-sm font-semibold'
  return (
    <div className="mb-3 rounded-2xl border-2 border-clinic-teal/40 bg-white p-3 sm:p-4" data-testid="day-visit">
      <h3 className="font-display text-lg font-semibold text-clinic-ink" data-testid="day-title">
        {d.isToday ? 'Aaj ki visit' : d.dateLabel + ' ki visit'}
        {d.isToday && <span className="ml-2 text-sm font-normal text-clinic-ink/55">{d.dateLabel}</span>}
      </h3>
      <p className="mb-2 text-xs text-clinic-ink/55">Ek hi visit mein {d.rows.length} kaam hue</p>
      {d.summary && (
        <p className="mb-3 whitespace-pre-line rounded-lg bg-clinic-mint/40 px-3 py-2 text-sm text-clinic-ink" data-testid="day-summary">
          {d.summary}
        </p>
      )}
      <div className="text-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_3.9rem_3.9rem_4rem] gap-x-1 border-b border-clinic-ink/10 pb-1 text-[11px] font-semibold text-clinic-ink/50">
          <span>Kaam</span>
          <span className="text-right">Bill Rs.</span>
          <span className="text-right">Mila</span>
          <span className="text-right">Baqaya</span>
        </div>
        {d.rows.map((r) => (
          <div key={r.id} data-testid="day-row" className="grid grid-cols-[minmax(0,1fr)_3.9rem_3.9rem_4rem] gap-x-1 border-b border-clinic-ink/10 py-1.5">
            <span className="break-words">{r.label}</span>
            <span className="text-right">{numFmt(r.total)}</span>
            <span className="text-right">{numFmt(r.paidToday)}</span>
            <span className={'text-right ' + (r.balance > 0 ? 'font-semibold text-red-600' : '')}>{numFmt(r.balance)}</span>
          </div>
        ))}
        <div data-testid="day-total" className="grid grid-cols-[minmax(0,1fr)_3.9rem_3.9rem_4rem] gap-x-1 border-t-2 border-clinic-ink pt-1.5 font-semibold">
          <span>Kul</span>
          <span className="text-right">{numFmt(d.total)}</span>
          <span className="text-right">{numFmt(d.paidToday)}</span>
          <span className={'text-right ' + (d.balance > 0 ? 'text-red-600' : '')}>{numFmt(d.balance)}</span>
        </div>
        {d.patientBalance != null && d.patientBalance !== d.balance && (
          <p className="mt-1 text-xs text-clinic-ink/60" data-testid="day-patient-balance">
            Marez ka kul baqaya (purane samet): <span className="font-semibold text-red-600">{money(Math.max(0, d.patientBalance))}</span>
          </p>
        )}
        {d.nextDate && <p className="mt-1 text-xs text-clinic-ink/60">Agli visit: {fmtDate(d.nextDate)}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={'/admin/visits/' + d.visitId + '/invoice'} data-testid="day-invoice" className={btn + ' bg-clinic-teal text-white'}>
          Invoice (sab kaam)
        </Link>
        {d.waHref && (
          <a href={d.waHref} target="_blank" rel="noreferrer" data-testid="day-wa" className={btn + ' bg-whatsapp text-white'}>
            WhatsApp (sab kaam)
          </a>
        )}
      </div>
    </div>
  )
}

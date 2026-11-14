import Link from 'next/link'
import { money, numFmt, fmtDate } from '@/lib/karachi'
import WorkStatusButton from './WorkStatusButton'

export interface GroupVisitChip {
  no: number
  date: string
  procedure: string | null
  notes: string | null
}
export interface GroupWork {
  id: string
  label: string
  status: string
  charged: number
  paid: number
  balance: number
  visits: GroupVisitChip[]
  rxId: string | null
  waHref: string | null
}
export interface VisitGroup {
  key: string
  visitId: string | null
  title: string
  dateLabel: string
  sortDate: string
  summary: string
  works: GroupWork[]
  total: number
  paid: number
  balance: number
  allDone: boolean
  open: boolean
  invoiceHref: string | null
  rxHref: string | null
  bothHref: string | null
  waHref: string | null
  nextDate: string | null
}

const tone: Record<string, string> = { active: 'bg-sky-100 text-sky-800', completed: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-gray-100 text-gray-600', planned: 'bg-amber-100 text-amber-800' }
const chip: Record<string, string> = { active: 'chal rahi', completed: 'mukammal', cancelled: 'cancel', planned: 'sirf plan' }

function WorkCard({ w, patientId, canMoney, canClinical }: { w: GroupWork; patientId: string; canMoney: boolean; canClinical: boolean }) {
  const btn = 'inline-flex min-h-[40px] items-center rounded-full px-4 py-1.5 text-xs font-semibold'
  return (
    <div data-testid="work-card" className="rounded-xl border border-clinic-teal/20 bg-clinic-mint/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={'/admin/patients/' + patientId + '/treatment/' + w.id} data-testid="work-title" className="min-w-0 break-words font-semibold text-clinic-ink hover:text-clinic-teal">
          {w.label}
        </Link>
        <span className={'rounded-full px-2 py-0.5 text-[11px] ' + (tone[w.status] ?? '')}>{chip[w.status] ?? w.status}</span>
      </div>
      {canMoney && (
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs" data-testid="work-money">
          <div className="rounded-lg bg-white px-1 py-1">
            <div className="text-clinic-ink/50">Bill</div>
            <div className="font-semibold">{numFmt(w.charged)}</div>
          </div>
          <div className="rounded-lg bg-white px-1 py-1">
            <div className="text-clinic-ink/50">Mila</div>
            <div className="font-semibold text-emerald-700">{numFmt(w.paid)}</div>
          </div>
          <div className="rounded-lg bg-white px-1 py-1">
            <div className="text-clinic-ink/50">Baqaya</div>
            <div className={'font-semibold ' + (w.balance > 0 ? 'text-red-600' : '')}>{numFmt(Math.max(0, w.balance))}</div>
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5" data-testid="work-visits">
        {w.visits.map((v) => (
          <span key={v.no + v.date} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-clinic-ink/70">
            Visit {v.no} · {fmtDate(v.date)}
          </span>
        ))}
        {w.visits.length === 0 && <span className="text-[11px] text-clinic-ink/50">abhi koi visit nahi</span>}
      </div>
      <details className="mt-2" data-testid="work-summary">
        <summary className="cursor-pointer text-xs font-semibold text-clinic-teal">Khulasa dekhein</summary>
        <div className="mt-1 grid gap-1 text-xs text-clinic-ink/80">
          {w.visits.map((v) => (
            <p key={v.no + v.date} className="rounded-lg bg-white px-2 py-1">
              <span className="font-semibold">Visit {v.no} ({fmtDate(v.date)}):</span> {[v.procedure, v.notes].filter(Boolean).join(' — ') || 'koi tafseel nahi likhi'}
            </p>
          ))}
          {canMoney && w.balance > 0 && <p className="text-red-600">Baqi: Rs. {numFmt(w.balance)} ka hisaab baqi hai</p>}
        </div>
      </details>
      <div className="mt-2 flex flex-wrap gap-2">
        {canClinical && w.status === 'active' && (
          <Link href={'/admin/patients/' + patientId + '/visit/' + w.id} data-testid="work-next" className={btn + ' bg-clinic-teal text-white'}>
            + Visit {w.visits.length + 1}
          </Link>
        )}
        {canMoney && (
          <Link href={'/admin/patients/' + patientId + '/treatment/' + w.id + '/invoice'} data-testid="work-invoice" className={btn + ' border border-clinic-teal text-clinic-teal'}>
            Invoice
          </Link>
        )}
        {w.waHref && (
          <a href={w.waHref} target="_blank" rel="noreferrer" data-testid="work-wa" className={btn + ' bg-whatsapp text-white'}>
            WhatsApp
          </a>
        )}
        {canClinical && w.status !== 'cancelled' && w.status !== 'planned' && <WorkStatusButton treatmentId={w.id} status={w.status} balance={w.balance} />}
      </div>
    </div>
  )
}

/** Ek visit = ek card. Andar har kaam ka chhota card; neeche sab kaam ka milla hua Invoice / Prescription / WhatsApp. */
export default function VisitGroupCard({ g, patientId, canMoney, canClinical }: { g: VisitGroup; patientId: string; canMoney: boolean; canClinical: boolean }) {
  const btn = 'inline-flex min-h-[44px] items-center rounded-full px-5 py-2 text-sm font-semibold'
  return (
    <details open={g.open} data-testid="visit-group" className="group mb-3 rounded-2xl border-2 border-clinic-teal/30 bg-white">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-3 sm:p-4" data-testid="vg-head">
        <span>
          <span className="font-display text-lg font-semibold text-clinic-ink" data-testid="vg-title">
            {g.title}
          </span>
          <span className="ml-2 text-xs text-clinic-ink/55">{g.dateLabel}</span>
          <span className="block text-xs text-clinic-ink/60">
            {g.works.length} kaam{g.allDone ? ' · sab mukammal' : ''}
            {canMoney && (g.balance > 0 ? <span className="font-semibold text-red-600"> · baqaya {money(g.balance)}</span> : g.total > 0 ? <span className="text-emerald-700"> · hisaab saaf</span> : null)}
          </span>
        </span>
        <span className="text-xs font-semibold text-clinic-teal">kholein / band</span>
      </summary>
      <div className="grid gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
        {g.summary && (
          <p className="whitespace-pre-line rounded-lg bg-clinic-mint/40 px-3 py-2 text-sm text-clinic-ink" data-testid="vg-summary">
            {g.summary}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {g.works.map((w) => (
            <WorkCard key={w.id} w={w} patientId={patientId} canMoney={canMoney} canClinical={canClinical} />
          ))}
        </div>
        {canMoney && g.total > 0 && (
          <p className="text-sm" data-testid="vg-total">
            Kul bill <span className="font-semibold">{money(g.total)}</span> · mila <span className="font-semibold text-emerald-700">{money(g.paid)}</span> · baqaya{' '}
            <span className={'font-semibold ' + (g.balance > 0 ? 'text-red-600' : '')}>{money(Math.max(0, g.balance))}</span>
          </p>
        )}
        {g.nextDate && <p className="text-xs text-clinic-ink/60">Agli visit: {fmtDate(g.nextDate)}</p>}
        <div className="flex flex-wrap gap-2">
          {canMoney && g.invoiceHref && (
            <Link href={g.invoiceHref} data-testid="vg-invoice" className={btn + ' bg-clinic-teal text-white'}>
              Invoice (sab kaam)
            </Link>
          )}
          {g.rxHref && (
            <Link href={g.rxHref} data-testid="vg-rx" className={btn + ' bg-clinic-teal text-white'}>
              Prescription
            </Link>
          )}
          {canMoney && g.bothHref && (
            <Link href={g.bothHref} data-testid="vg-both" className={btn + ' border border-clinic-teal text-clinic-teal'}>
              Invoice + Prescription
            </Link>
          )}
          {g.waHref && (
            <a href={g.waHref} target="_blank" rel="noreferrer" data-testid="vg-wa" className={btn + ' bg-whatsapp text-white'}>
              WhatsApp (sab kaam)
            </a>
          )}
        </div>
      </div>
    </details>
  )
}

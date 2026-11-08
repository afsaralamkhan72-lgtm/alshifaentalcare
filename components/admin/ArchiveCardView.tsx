export interface ArchiveCard {
  patient_id: string
  first_visit: string | null
  last_visit: string | null
  visits: number
  treatments: { name: string; teeth?: string[]; price?: number | string; status?: string; on?: string | null }[]
  total_billed: number | string
  total_paid: number | string
  with_money: boolean
  removed: { prescriptions?: number; photos?: number; chart?: number }
  archived_at: string
}

const fmt = (n: number | string) => 'Rs. ' + Number(n || 0).toLocaleString('en-PK')
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

export default function ArchiveCardView({ card, canMoney }: { card: ArchiveCard; canMoney: boolean }) {
  const done = (card.treatments ?? []).filter((t) => t.status !== 'cancelled')
  return (
    <section className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-4" data-testid="archive-card">
      <h2 className="font-display text-base font-semibold text-clinic-ink">Purana record (summary card)</h2>
      <p className="mt-0.5 text-xs text-clinic-ink/60">
        Jagah bachane ke liye {day(card.archived_at)} ko purani detail (visit notes, chart, nuskhe, photos) hata di gayi. Neeche sirf khulasa baqi hai.
      </p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-clinic-ink/55">Pehli aur aakhri visit</dt>
          <dd className="font-semibold text-clinic-ink">{day(card.first_visit)} → {day(card.last_visit)}</dd>
        </div>
        <div>
          <dt className="text-xs text-clinic-ink/55">Kul visits</dt>
          <dd className="font-semibold text-clinic-ink">{card.visits}</dd>
        </div>
        {canMoney && (
          <div>
            <dt className="text-xs text-clinic-ink/55">Kul bill / Kul mile</dt>
            <dd className="font-semibold text-clinic-ink">{fmt(card.total_billed)} / {fmt(card.total_paid)}</dd>
          </div>
        )}
      </dl>
      {done.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-clinic-ink/60">Kaam jo hue</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {done.slice(0, 40).map((t, i) => (
              <li key={i} className="rounded-full bg-white px-2.5 py-1 text-xs text-clinic-ink ring-1 ring-amber-200">
                {t.name}
                {t.teeth && t.teeth.length > 0 ? ` (${t.teeth.join(', ')})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {card.with_money && <p className="mt-3 text-[11px] text-clinic-ink/55">Is mareez ke purane bill aur payment ke record bhi hata diye gaye hain; upar ka total unka khulasa hai.</p>}
    </section>
  )
}

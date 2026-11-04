'use client'

import { CLINIC } from '@/clinic.config'
import { fmtDate, money } from '@/lib/karachi'
import { accentOf, type PrintLayout } from '@/lib/printLayout'
import type { PrintLogo } from '@/lib/printTemplates'
import LetterheadFrame from '@/components/print/LetterheadFrame'
import SoftHeader from '@/components/print/SoftHeader'
import ShareQr from '@/components/print/ShareQr'

export interface StatementData {
  patient: { id: string; name: string; mr: string | null; phone: string; age: number | null }
  date: string
  cards: { old: number; work: number; paid: number; now: number }
  /** kis cheez ka kitna: har bill (cancel wale alag dikhte hain) */
  bills: { id: string; date: string; no: string; what: string; total: number; discount: number; paid: number; balance: number; due: string | null; void: boolean }[]
  pays: { id: string; date: string; what: string; amount: number; method: string | null; refund: boolean; reversed: boolean }[]
  book: { date: string; label: string; charge: number; payment: number; balance: number }[]
  totals: { charges: number; paid: number; balance: number }
  oldBalance: number
  timings: string
}

const METHOD: Record<string, string> = { cash: 'Cash', bank: 'Bank', easypaisa: 'Easypaisa', jazzcash: 'JazzCash' }

export default function StatementSheet({ d, logo, logoUrl, layout }: { d: StatementData; logo: PrintLogo; logoUrl: string | null; layout: PrintLayout }) {
  const acc = accentOf(layout)
  const lh = Boolean(layout.letterhead.data)
  const sh = layout.show
  const th: React.CSSProperties = { background: 'rgb(var(--c-mint))', padding: '7px 8px', fontSize: '0.85em', textAlign: 'left', fontWeight: 600 }
  const td: React.CSSProperties = { padding: '7px 8px', borderBottom: '1px solid rgb(var(--c-mint))', verticalAlign: 'top', overflowWrap: 'anywhere' }
  const r: React.CSSProperties = { textAlign: 'right', whiteSpace: 'nowrap' }
  const green = '#047857'
  const dueRows = d.bills.filter((b) => !b.void && b.balance > 0)
  const h2: React.CSSProperties = { fontSize: '1.05em', fontWeight: 700, margin: '22px 0 8px', color: 'rgb(var(--c-ink))' }
  const card = (k: string, v: number, kind: 'plain' | 'good' | 'main') => (
    <div style={{ padding: '14px 8px', textAlign: 'center', background: kind === 'main' ? acc : kind === 'good' ? 'rgb(var(--c-mint))' : '#fff', color: kind === 'main' ? '#fff' : kind === 'good' ? green : 'rgb(var(--c-ink))', flex: '1 1 120px', minWidth: 0 }}>
      <p style={{ fontSize: '0.8em', opacity: 0.8 }}>{k}</p>
      <p style={{ fontSize: '1.45em', fontWeight: 600, marginTop: 4 }}>{money(v)}</p>
    </div>
  )

  return (
    <LetterheadFrame layout={layout} id="print-sheet">
      <div
        style={{
          fontSize: `${14 * layout.scale}px`,
          color: 'rgb(var(--c-ink))',
          background: '#fff',
          borderRadius: lh ? 0 : 14,
          border: lh ? 'none' : '1px solid rgb(var(--c-mint))',
          overflow: 'hidden',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {!lh && <SoftHeader logo={logo} logoUrl={logoUrl} layout={layout} />}
        <div style={{ padding: lh ? 0 : '8px 24px 20px' }}>
          <p style={{ fontSize: '1.6em', margin: '18px 0 12px' }}>Payment Statement</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px 24px' }}>
            <div><p style={{ fontSize: '0.8em', opacity: 0.6 }}>Patient</p><p style={{ fontWeight: 600 }}>{d.patient.name}</p></div>
            {sh.mr && <div><p style={{ fontSize: '0.8em', opacity: 0.6 }}>MR Number</p><p style={{ fontWeight: 600 }}>{d.patient.mr ?? '—'}</p></div>}
            <div><p style={{ fontSize: '0.8em', opacity: 0.6 }}>Phone</p><p style={{ fontWeight: 600 }}>{d.patient.phone}</p></div>
            <div><p style={{ fontSize: '0.8em', opacity: 0.6 }}>Date</p><p style={{ fontWeight: 600 }}>{fmtDate(d.date)}</p></div>
            {sh.age && d.patient.age != null && <div><p style={{ fontSize: '0.8em', opacity: 0.6 }}>Umar</p><p style={{ fontWeight: 600 }}>{d.patient.age} saal</p></div>}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 18, border: '1px solid rgb(var(--c-mint))', borderRadius: 14, overflow: 'hidden' }}>
            {card('Purana Baqaya', d.cards.old, 'plain')}
            {card('Aaj Ka Kaam', d.cards.work, 'plain')}
            {card('Aaj Mile', d.cards.paid, 'good')}
            {card('Ab Baqaya', d.cards.now, 'main')}
          </div>

          {(dueRows.length > 0 || d.oldBalance > 0) && (
            <>
              <p style={h2}>Baqaya Tafseel</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ display: 'table-header-group' }}>
                  <tr><th style={th}>Cheez</th><th style={th}>Kab hua</th><th style={{ ...th, ...r }}>Qeemat</th><th style={{ ...th, ...r }}>Diya</th><th style={{ ...th, ...r }}>Baqaya</th><th style={th}>Kab tak</th></tr>
                </thead>
                <tbody>
                  {d.oldBalance > 0 && (
                    <tr><td style={td}>Purana hisaab</td><td style={td}>—</td><td style={{ ...td, ...r }}>—</td><td style={{ ...td, ...r }}>—</td><td style={{ ...td, ...r, fontWeight: 600 }}>{money(d.oldBalance)}</td><td style={td}>—</td></tr>
                  )}
                  {dueRows.map((b) => (
                    <tr key={b.id} style={{ breakInside: 'avoid' }}>
                      <td style={td}>{b.what}</td>
                      <td style={td}>{fmtDate(b.date)}</td>
                      <td style={{ ...td, ...r }}>{money(b.total)}</td>
                      <td style={{ ...td, ...r, color: green }}>{money(b.paid)}</td>
                      <td style={{ ...td, ...r, fontWeight: 600 }}>{money(b.balance)}</td>
                      <td style={td}>{b.due ? fmtDate(b.due) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <p style={h2}>Kis cheez ka kitna aaya, kitna diya</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ display: 'table-header-group' }}>
              <tr><th style={th}>Bill</th><th style={th}>Cheez</th><th style={{ ...th, ...r }}>Aaya</th><th style={{ ...th, ...r }}>Riyayat</th><th style={{ ...th, ...r }}>Diya</th><th style={{ ...th, ...r }}>Raha</th></tr>
            </thead>
            <tbody>
              {d.bills.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', opacity: 0.6 }}>Koi bill nahi.</td></tr>}
              {d.bills.map((b) => (
                <tr key={b.id} style={{ breakInside: 'avoid', opacity: b.void ? 0.5 : 1, textDecoration: b.void ? 'line-through' : 'none' }}>
                  <td style={td}>{b.no}<br /><span style={{ fontSize: '0.8em', opacity: 0.6 }}>{fmtDate(b.date)}</span></td>
                  <td style={td}>{b.what || '—'}</td>
                  <td style={{ ...td, ...r }}>{money(b.total + b.discount)}</td>
                  <td style={{ ...td, ...r }}>{b.discount > 0 ? `− ${money(b.discount)}` : '—'}</td>
                  <td style={{ ...td, ...r, color: green }}>{money(b.paid)}</td>
                  <td style={{ ...td, ...r, fontWeight: 600 }}>{b.void ? 'Cancel' : money(b.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {d.pays.length > 0 && (
            <>
              <p style={h2}>Payments: kab, kis cheez ke liye, kitni</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ display: 'table-header-group' }}>
                  <tr><th style={th}>Tareekh</th><th style={th}>Kis cheez ke liye</th><th style={th}>Tareeqa</th><th style={{ ...th, ...r }}>Raqam</th></tr>
                </thead>
                <tbody>
                  {d.pays.map((p) => (
                    <tr key={p.id} style={{ breakInside: 'avoid', opacity: p.reversed ? 0.5 : 1, textDecoration: p.reversed ? 'line-through' : 'none' }}>
                      <td style={td}>{fmtDate(p.date)}</td>
                      <td style={td}>{p.what || '—'}{p.refund ? ' (wapas)' : ''}</td>
                      <td style={td}>{p.method ? METHOD[p.method] ?? p.method : '—'}</td>
                      <td style={{ ...td, ...r, color: p.refund ? '#b91c1c' : green }}>{p.refund ? '− ' : ''}{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <p style={h2}>Poora Hisaab Kitab</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ display: 'table-header-group' }}>
              <tr><th style={th}>Tareekh</th><th style={th}>Tafseel</th><th style={{ ...th, ...r }}>Charge</th><th style={{ ...th, ...r }}>Mila</th><th style={{ ...th, ...r }}>Balance</th></tr>
            </thead>
            <tbody>
              {d.book.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', opacity: 0.6 }}>Koi hisaab nahi.</td></tr>}
              {d.book.map((b, i) => (
                <tr key={i} style={{ breakInside: 'avoid' }}>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(b.date)}</td>
                  <td style={td}>{b.label}</td>
                  <td style={{ ...td, ...r }}>{b.charge ? money(b.charge) : ''}</td>
                  <td style={{ ...td, ...r, color: green }}>{b.payment ? money(b.payment) : ''}</td>
                  <td style={{ ...td, ...r }}>{money(b.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 14, borderTop: '1px solid rgb(var(--c-mint))', paddingTop: 10, display: 'grid', gap: 4 }}>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Kul Charges (treatment ki qeemat)</span><span>{money(d.totals.charges)}</span></p>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Kul Payment Mili</span><span style={{ color: green }}>{money(d.totals.paid)}</span></p>
            <p style={{ display: 'flex', justifyContent: 'space-between', background: acc, color: '#fff', borderRadius: 12, padding: '12px 16px', fontSize: '1.2em', fontWeight: 600, marginTop: 6 }}><span>Baqaya</span><span>{money(d.totals.balance)}</span></p>
          </div>

          <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, breakInside: 'avoid' }}>
            {sh.qr ? <ShareQr patientId={d.patient.id} /> : <span />}
            {sh.stamp && layout.stamp && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={layout.stamp} alt="Mohar" style={{ height: 80, width: 'auto' }} />
            )}
          </div>

          <div style={{ marginTop: 16, borderTop: '2px solid rgb(var(--c-gold, 212 175 55) / 0.5)', paddingTop: 10, textAlign: 'center', fontSize: '0.85em', display: 'grid', gap: 2 }}>
            {sh.timings && <p>{d.timings}</p>}
            {sh.payment && <p>Easypaisa: {CLINIC.payments.easypaisa} · JazzCash: {CLINIC.payments.jazzcash}</p>}
            {layout.texts.footer.trim() && <p>{layout.texts.footer}</p>}
            {sh.tagline && <p style={{ fontStyle: 'italic', color: acc }}>&ldquo;{layout.texts.tagline.trim() || CLINIC.slogan}&rdquo;</p>}
          </div>
        </div>
      </div>
    </LetterheadFrame>
  )
}

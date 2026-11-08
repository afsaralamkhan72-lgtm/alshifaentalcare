import { CLINIC } from '@/clinic.config'
import { accentOf, type PrintLayout } from '@/lib/printLayout'
import type { PrintLogo } from '@/lib/printTemplates'
import LetterheadFrame from '@/components/print/LetterheadFrame'
import SoftHeader from '@/components/print/SoftHeader'
import { dur } from '@/lib/attendanceUi'
import { fmtDate, moneyWhole } from '@/lib/karachi'

export interface SlipData {
  period: string
  name: string
  title: string | null
  finalized: boolean
  salary: number
  monthMin: number
  effMin: number
  effFrom: string
  rate: number
  entitled: number
  present: number
  absent: number
  leaveUnpaid: number
  lateMin: number
  earlyMin: number
  absentMin: number
  otMin: number
  cutLate: number
  cutEarly: number
  cutAbsent: number
  otAmount: number
  net: number
  entries: { date: string; kind: string; amount: number; note: string | null }[]
  timings: string
}

const KIND: Record<string, string> = { salary_due: 'Mahana tankhwah', bonus: 'Bonus / overtime', deduction: 'Katauti', advance: 'Advance (peshgi)', payout: 'Tankhwah di gayi' }

/** Salary parchi: software ke neele-safed rang mein; letterhead ho to us par. */
export default function SalarySlip({ d, logo, logoUrl, layout }: { d: SlipData; logo: PrintLogo; logoUrl: string | null; layout: PrintLayout }) {
  const acc = accentOf(layout)
  const ledgerTotal = d.entries.reduce((t, e) => t + e.amount, 0)
  const Row = ({ a, b, bold }: { a: string; b: string; bold?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e5e7eb', fontWeight: bold ? 700 : 400 }}>
      <span>{a}</span>
      <span>{b}</span>
    </div>
  )
  return (
    <LetterheadFrame layout={layout} id="print-sheet">
      <div style={{ background: '#fff', fontSize: 13 * layout.scale, color: '#1f2937', border: layout.letterhead.data ? 'none' : '1px solid #e5e7eb', borderRadius: 14 }}>
        {!layout.letterhead.data && <SoftHeader logo={logo} logoUrl={logoUrl} layout={layout} />}
        <div style={{ padding: '18px 24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, color: acc }}>Salary Parchi</p>
              <p style={{ fontSize: 12, opacity: 0.7 }}>Mahina: {d.period} {d.finalized ? '' : '(abhi tayyar nahi, abhi tak ka hisab)'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 17, fontWeight: 700 }}>{d.name}</p>
              {d.title && <p style={{ fontSize: 12, opacity: 0.7 }}>{d.title}</p>}
            </div>
          </div>

          <div style={{ marginTop: 14, background: acc, color: '#fff', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>Is mahine ki banti tankhwah (hazri ke hisab se)</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{moneyWhole(Math.abs(d.net))}</span>
          </div>

          <p style={{ marginTop: 14, fontWeight: 700, color: acc }}>Hisab minute ke hisab se</p>
          <Row a="Mahana tankhwah" b={moneyWhole(Math.abs(d.salary))} />
          <Row a={`Mahine ki kul shift: ${dur(d.monthMin)}`} b={d.rate ? `aik minute = Rs. ${d.rate.toFixed(2)}` : ''} />
          {d.effMin < d.monthMin && <Row a={`Joining (${fmtDate(d.effFrom)}) se ${dur(d.effMin)} ka hisab`} b={moneyWhole(Math.abs(d.entitled))} />}
          <Row a="Banti hui tankhwah" b={moneyWhole(Math.abs(d.entitled))} bold />

          <p style={{ marginTop: 12, fontWeight: 700, color: acc }}>Katauti</p>
          <Row a={`Late: ${dur(d.lateMin)}`} b={d.cutLate ? `- ${moneyWhole(Math.abs(d.cutLate))}` : '—'} />
          <Row a={`Waqt se pehle gaye: ${dur(d.earlyMin)}`} b={d.cutEarly ? `- ${moneyWhole(Math.abs(d.cutEarly))}` : '—'} />
          <Row a={`Ghair-hazri / bagair tankhwah chhutti: ${dur(d.absentMin)}`} b={d.cutAbsent ? `- ${moneyWhole(Math.abs(d.cutAbsent))}` : '—'} />
          <p style={{ marginTop: 12, fontWeight: 700, color: acc }}>Overtime</p>
          <Row a={`Overtime: ${dur(d.otMin)}`} b={d.otAmount ? `+ ${moneyWhole(Math.abs(d.otAmount))}` : '—'} />

          <p style={{ marginTop: 12, fontWeight: 700, color: acc }}>Khate ki entries (is mahine ki)</p>
          {d.entries.length === 0 && <p style={{ fontSize: 12, opacity: 0.6, padding: '6px 0' }}>Abhi koi entry nahi (mahina tayyar hone par yahan aati hain).</p>}
          {d.entries.map((e, i) => (
            <Row key={i} a={`${fmtDate(e.date)} · ${KIND[e.kind] ?? e.kind}${e.note ? ` — ${e.note}` : ''}`} b={`${e.amount >= 0 ? '+' : '-'} ${moneyWhole(Math.abs(e.amount))}`} />
          ))}
          {d.entries.length > 0 && <Row a="Is mahine ka khate ke mutabiq hisab" b={`${ledgerTotal >= 0 ? '' : '- '}${moneyWhole(Math.abs(ledgerTotal))}`} bold />}

          <p style={{ marginTop: 18, fontSize: 11, opacity: 0.6 }}>
            {CLINIC.name} · {d.timings}
          </p>
        </div>
      </div>
    </LetterheadFrame>
  )
}

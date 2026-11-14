'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { CLINIC } from '@/clinic.config'
import { fmtDate } from '@/lib/karachi'
import { rupeesInWords } from '@/lib/words'
import { accentOf, type DuoDoctor, type PrintLayout } from '@/lib/printLayout'
import type { RxSheetData } from '@/components/PrescriptionSheet'
import VerifyQr from '@/components/print/VerifyQr'
import LogoMark from '@/components/print/LogoMark'
import type { PrintLogo } from '@/lib/printTemplates'

export interface BillLine { name: string; tooth: string | null; qty: number; unit_price: number; line_total: number }
export interface BillPart {
  numbers: string[]
  items: BillLine[]
  subtotal: number
  discount: number
  total: number
  paid: number
  balance: number
  /** tasdeeq wale QR ke liye (pehla invoice) */
  id: string | null
}
export interface DuoPatient { name: string; mr: string | null; age: number | null; gender: string | null; address: string | null; phone: string | null }

const n = (v: number) => Number(v).toLocaleString('en-PK')
const line = '1px solid currentColor'

/** Bill ka sada hissa (header ke baghair): kaam, raqam, total aur "Received sum of rupees ..." */
export function BillBody({ bill, title }: { bill: BillPart; title?: string }) {
  const cell: React.CSSProperties = { padding: '0.35em 0.4em', borderBottom: '1px solid rgba(0,0,0,0.15)', verticalAlign: 'top' }
  const head: React.CSSProperties = { ...cell, borderBottom: line, fontWeight: 700, fontSize: '0.85em', textAlign: 'left' }
  const row = (label: string, value: string, bold = false) => (
    <p style={{ display: 'flex', justifyContent: 'space-between', gap: '1em', fontWeight: bold ? 700 : 400, borderTop: bold ? line : 'none', paddingTop: bold ? '0.25em' : 0 }}>
      <span>{label}</span>
      <span>Rs. {value}</span>
    </p>
  )
  return (
    <div data-testid="bill-body" style={{ breakInside: 'avoid' }}>
      {title && <p style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.85em', marginBottom: '0.3em' }}>{title}{bill.numbers.length ? ' · ' + bill.numbers.join(', ') : ''}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={head}>Description</th>
            <th style={{ ...head, textAlign: 'center', width: '3.2em' }}>Qty</th>
            <th style={{ ...head, textAlign: 'right', width: '6.5em' }}>Rate</th>
            <th style={{ ...head, textAlign: 'right', width: '7em' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((it, i) => (
            <tr key={i} style={{ breakInside: 'avoid' }}>
              <td style={{ ...cell, overflowWrap: 'anywhere' }}>{it.name}{it.tooth ? ` (${it.tooth})` : ''}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{it.qty}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{n(it.unit_price)}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{n(it.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '0.6em', marginLeft: 'auto', width: 'min(100%, 17em)', display: 'grid', gap: '0.15em' }}>
        {bill.discount > 0 && row('Sub Total', n(bill.subtotal))}
        {bill.discount > 0 && row('Discount', n(bill.discount))}
        {row('Total', n(bill.total), true)}
        {row('Received', n(bill.paid))}
        {bill.balance > 0 && row('Balance', n(bill.balance), true)}
      </div>
      {bill.paid > 0 && (
        <p data-testid="bill-words" style={{ marginTop: '0.7em', fontStyle: 'italic' }}>
          Received sum of rupees <b>{rupeesInWords(bill.paid)}</b> only.
        </p>
      )}
    </div>
  )
}

/** Prescription ka sada hissa (header ke baghair): dawaiyan aur hidayat */
export function RxBody({ rx, title }: { rx: RxSheetData; title?: string }) {
  const cell: React.CSSProperties = { padding: '0.35em 0.4em', borderBottom: '1px solid rgba(0,0,0,0.15)', verticalAlign: 'top' }
  const head: React.CSSProperties = { ...cell, borderBottom: line, fontWeight: 700, fontSize: '0.85em', textAlign: 'left' }
  return (
    <div data-testid="rx-body">
      <p style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.85em', marginBottom: '0.3em' }}>
        <span style={{ fontSize: '1.7em', textTransform: 'none', letterSpacing: 0, marginRight: '0.3em' }}>℞</span>
        {title}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...head, width: '2em' }}>#</th>
            <th style={head}>Medicine</th>
            <th style={head}>Dose</th>
            <th style={head}>Kitni baar</th>
            <th style={head}>Kitne din</th>
          </tr>
        </thead>
        <tbody>
          {rx.items.map((it, i) => (
            <tr key={i} style={{ breakInside: 'avoid' }}>
              <td style={cell}>{i + 1}</td>
              <td style={{ ...cell, overflowWrap: 'anywhere' }}>
                <b>{it.name_en || it.name_ur}{it.potency ? ` ${it.potency}` : ''}</b>
                {it.name_en && it.name_ur && <span dir="rtl" style={{ display: 'block', textAlign: 'right' }}>{it.name_ur}</span>}
                {it.instructions && <span style={{ display: 'block', fontSize: '0.85em', opacity: 0.75 }}>{it.instructions}</span>}
                {it.mode === 'dispense' && <span style={{ display: 'block', fontSize: '0.8em', opacity: 0.6 }}>(clinic se di gayi)</span>}
              </td>
              <td style={cell}>{it.dosage}</td>
              <td style={cell}>{it.frequency}</td>
              <td style={cell}>{it.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(rx.notes_en || rx.notes_ur) && (
        <div style={{ marginTop: '0.6em', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 6, padding: '0.4em 0.6em', breakInside: 'avoid' }}>
          {rx.notes_en && <p>{rx.notes_en}</p>}
          {rx.notes_ur && <p dir="rtl" style={{ textAlign: 'right' }}>{rx.notes_ur}</p>}
        </div>
      )}
    </div>
  )
}

/** Purane templates ke andar "dono aik sath" ke liye doosra hissa, aik lakeer ke sath */
export function ExtraPart({ children }: { children: React.ReactNode }) {
  return (
    <div data-testid="extra-part" style={{ marginTop: '1.1em', paddingTop: '0.9em', borderTop: '1px dashed rgba(0,0,0,0.45)', fontSize: '0.95em' }}>
      {children}
    </div>
  )
}

const A4_W = 190 // mm (A4 - 10mm hashiye)
const A4_H = 277
const MM = 96 / 25.4
const MIN_FIT = 0.6

/**
 * Kaghaz ki chauraai par dikhata hai; matn lamba ho to khud chhota kar ke aik safhe mein samata hai (parhne laiq had tak).
 * Chhoti screen par poora kaghaz chhota ho kar dikhta hai, side scroll nahi hota.
 */
export function FitOnePage({ id, children, watch }: { id: string; children: React.ReactNode; watch?: unknown }) {
  const wrap = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  const [screen, setScreen] = useState(1)

  useLayoutEffect(() => {
    const w = wrap.current
    const p = paper.current
    const el = inner.current
    if (!w || !p || !el) return
    const measure = () => {
      const paperPx = A4_W * MM
      p.style.zoom = '1'
      const avail = A4_H * MM
      let z = 1
      for (; z > MIN_FIT; z = Math.round((z - 0.02) * 100) / 100) {
        el.style.zoom = String(z)
        if (p.getBoundingClientRect().height <= avail) break
      }
      el.style.zoom = String(z)
      setFit(z)
      const s = Math.min(1, (w.clientWidth - 2) / paperPx)
      p.style.zoom = String(s)
      setScreen(s)
    }
    measure()
    const ro = new ResizeObserver(() => {
      const s = Math.min(1, (w.clientWidth - 2) / (A4_W * MM))
      if (paper.current) paper.current.style.zoom = String(s)
      setScreen(s)
    })
    ro.observe(w)
    const imgs = Array.from(el.querySelectorAll('img'))
    imgs.forEach((im) => im.addEventListener('load', measure))
    const mo = new MutationObserver(measure)
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      ro.disconnect()
      mo.disconnect()
      imgs.forEach((im) => im.removeEventListener('load', measure))
    }
  }, [watch])

  return (
    <div ref={wrap} data-fit-wrap="" data-testid="fit-wrap" data-fit={fit} style={{ width: '100%', overflow: 'hidden' }}>
      <style>{`
        #${id}, #${id} * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          #${id}, #${id} * { visibility: visible; }
          #${id} { position: absolute !important; left: 0 !important; top: 0 !important; width: ${A4_W}mm !important; zoom: 1 !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
        }
      `}</style>
      <div ref={paper} id={id} data-fit-paper="" style={{ width: `${A4_W}mm`, zoom: screen, background: '#fff', color: '#111', margin: '0 auto', boxShadow: '0 1px 10px rgba(0,0,0,0.12)' }}>
        <div ref={inner} data-fit-inner="" style={{ zoom: fit }}>{children}</div>
      </div>
    </div>
  )
}

function DoctorBlock({ d, align }: { d: DuoDoctor; align: 'left' | 'right' }) {
  if (!d.name.trim() && !d.sub_name.trim()) return <div />
  return (
    <div data-testid={'duo-doc-' + align} style={{ textAlign: align, minWidth: 0, overflowWrap: 'anywhere' }}>
      {d.name.trim() && <p style={{ fontWeight: 700, fontSize: '1.05em' }}>{d.name}</p>}
      {d.degree.trim() && <p style={{ fontSize: '0.85em' }}>{d.degree}</p>}
      {d.title.trim() && <p style={{ fontSize: '0.85em' }}>{d.title}</p>}
      {(d.sub_name.trim() || d.sub_phone.trim()) && (
        <div data-testid={'duo-sub-' + align} style={{ marginTop: '0.45em', fontSize: '0.82em' }}>
          {d.sub_name.trim() && <p style={{ fontWeight: 600 }}>{d.sub_name}</p>}
          {d.sub_phone.trim() && <p>{d.sub_phone}</p>}
        </div>
      )}
    </div>
  )
}

/** Settings khali hon to software ke purane (clinic config) naam; koi naam apni taraf se nahi banta */
export function duoDoctors(layout: PrintLayout): { left: DuoDoctor; right: DuoDoctor } {
  const l = layout.duo.left
  const left: DuoDoctor = l.name.trim() ? l : { ...l, name: CLINIC.doctor.name, degree: l.degree || CLINIC.doctor.qualification }
  return { left, right: layout.duo.right }
}

/** Do doctor wala upar ka hissa: clinic ka naam, dono taraf doctor, beech mein pata aur timing */
export function DuoHead({ layout, logo = null, logoUrl = null }: { layout: PrintLayout; logo?: PrintLogo | null; logoUrl?: string | null }) {
  const acc = accentOf(layout)
  const { left, right } = duoDoctors(layout)
  const address = layout.duo.address.trim() || CLINIC.address.full
  const timings = layout.duo.timings.trim() || CLINIC.timings.full
  const anySub = Boolean(left.sub_phone.trim() || right.sub_phone.trim())
  const showLogo = Boolean(logo && (logo.data || logoUrl) && !layout.letterhead.data)
  return (
    <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7em' }}>
          {showLogo && logo && <span data-testid="duo-logo" style={{ display: 'inline-flex' }}><LogoMark logo={logo} fallbackUrl={logoUrl} scale={0.9} /></span>}
          <p data-testid="duo-clinic" style={{ textAlign: 'center', fontSize: '2.2em', fontWeight: 800, color: acc, lineHeight: 1.15, textDecoration: 'underline', textUnderlineOffset: '0.18em' }}>{CLINIC.name}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: '0.8em', marginTop: '0.7em', alignItems: 'start' }}>
          <DoctorBlock d={left} align="left" />
          <div data-testid="duo-center" style={{ textAlign: 'center', fontSize: '0.85em', overflowWrap: 'anywhere' }}>
            <p>{address}</p>
            <p style={{ marginTop: '0.2em' }}>{timings}</p>
            {!anySub && <p style={{ marginTop: '0.2em' }}>{CLINIC.phone.display}</p>}
          </div>
          <DoctorBlock d={right} align="right" />
        </div>
    </>
  )
}

/** Neeche dono doctors ke naam, mohar aur (agar ho) tasdeeq wala QR */
export function DuoFoot({ layout, verify }: { layout: PrintLayout; verify: { table: 'invoices' | 'prescriptions'; id: string } | null }) {
  const { left, right } = duoDoctors(layout)
  return (
    <div style={{ marginTop: '2.2em', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1em', breakInside: 'avoid' }}>
          <div data-testid="duo-foot-left" style={{ minWidth: '11em' }}>
            {left.name.trim() && <p style={{ borderTop: line, paddingTop: '0.25em', fontWeight: 700 }}>{left.name}</p>}
            {left.degree.trim() && <p style={{ fontSize: '0.8em' }}>{left.degree}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.8em' }}>
            {layout.show.stamp && layout.stamp && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={layout.stamp} alt="Mohar" style={{ height: '5em', width: 'auto' }} />
            )}
            {verify && <VerifyQr table={verify.table} id={verify.id} size={64} />}
          </div>
          <div data-testid="duo-foot-right" style={{ minWidth: '11em', textAlign: 'right' }}>
            {right.name.trim() && <p style={{ borderTop: line, paddingTop: '0.25em', fontWeight: 700 }}>{right.name}</p>}
            {right.degree.trim() && <p style={{ fontSize: '0.8em' }}>{right.degree}</p>}
          </div>
        </div>
  )
}

/**
 * "Do doctor wala" sada kaghaz: upar clinic ka naam, dono taraf doctor (neeche chhota naam aur number),
 * beech mein pata aur timing; phir mareez, phir prescription aur / ya bill; neeche dono doctors ke naam.
 */
export default function DuoSheet({
  id, layout, patient, date, rx, bill, verify, cancelled = false, logo = null, logoUrl = null,
}: {
  cancelled?: boolean
  id: string
  layout: PrintLayout
  patient: DuoPatient
  date: string
  rx: RxSheetData | null
  bill: BillPart | null
  verify: { table: 'invoices' | 'prescriptions'; id: string } | null
  logo?: PrintLogo | null
  logoUrl?: string | null
}) {
  const acc = accentOf(layout)
  const both = Boolean(rx && bill)
  const info: [string, string][] = []
  if (patient.age != null || patient.gender) info.push(['Age / Sex', [patient.age != null ? String(patient.age) : '', patient.gender ?? ''].filter(Boolean).join(' / ')])
  if (patient.mr) info.push(['MR No', patient.mr])
  if (patient.phone) info.push(['Phone', patient.phone])
  return (
    <FitOnePage id={id} watch={[rx, bill, layout]}>
      <div data-testid="duo-sheet" style={{ fontSize: `${13.5 * layout.scale}px`, lineHeight: 1.45, padding: '4px 10px' }}>
        <DuoHead layout={layout} logo={logo} logoUrl={logoUrl} />
        <div style={{ borderTop: `2px solid ${acc}`, marginTop: '0.7em', paddingTop: '0.5em', display: 'flex', justifyContent: 'space-between', gap: '1em' }}>
          <p>{bill && bill.numbers.length > 0 ? <>Ref: <b>{bill.numbers.join(', ')}</b></> : null}</p>
          {cancelled && <p data-testid="duo-cancelled" style={{ color: '#b91c1c', fontWeight: 800, border: '2px solid #b91c1c', padding: '0 0.6em', borderRadius: 4 }}>CANCELLED</p>}
          <p>Date: <b>{fmtDate(date)}</b></p>
        </div>
        <div data-testid="duo-patient" style={{ marginTop: '0.5em', display: 'flex', flexWrap: 'wrap', gap: '0.2em 1.6em' }}>
          <p>Patient: <b style={{ textTransform: 'capitalize' }}>{patient.name}</b></p>
          {info.map(([k, v]) => <p key={k}>{k}: <b>{v}</b></p>)}
          {patient.address && <p style={{ flexBasis: '100%' }}>Address: <b>{patient.address}</b></p>}
        </div>
        <div style={{ borderTop: line, marginTop: '0.6em', paddingTop: '0.7em', display: 'grid', gap: '1.1em' }}>
          {rx && <RxBody rx={rx} title={both ? 'Prescription' : undefined} />}
          {rx && bill && <div style={{ borderTop: '1px dashed rgba(0,0,0,0.45)' }} />}
          {bill && <BillBody bill={bill} title={both ? 'Invoice' : undefined} />}
        </div>
        <DuoFoot layout={layout} verify={verify} />
      </div>
    </FitOnePage>
  )
}

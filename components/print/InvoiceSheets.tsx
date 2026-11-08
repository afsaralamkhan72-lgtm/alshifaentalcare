'use client'

import { useState } from 'react'
import ClinicLogo from '@/components/ClinicLogo'
import LogoMark from '@/components/print/LogoMark'
import { CLINIC } from '@/clinic.config'
import { fmtDate, money } from '@/lib/karachi'
import { BILL_TEMPLATES, type PrintLogo } from '@/lib/printTemplates'
import { accentOf, DEFAULT_LAYOUT, type PrintLayout } from '@/lib/printLayout'
import LetterheadFrame from '@/components/print/LetterheadFrame'
import SoftHeader from '@/components/print/SoftHeader'
import ShareQr from '@/components/print/ShareQr'
import VerifyQr from '@/components/print/VerifyQr'

export interface InvItem { id: string; name: string; tooth: string | null; qty: number; unit_price: number; line_total: number }
export interface InvData {
  number: string
  date: string
  patientName: string
  mr: string | null
  phone: string
  doctor: string | null
  items: InvItem[]
  subtotal: number
  discountAmount: number
  discountPercent: number
  total: number
  paid: number
  balance: number
  dueDate: string | null
  voided: boolean
  voidReason: string | null
  notes: string | null
  patientId?: string
  age?: number | null
  id?: string
}

const BLUE = '#0b5fa5'
const BLUE_D = '#073b6b'
const BLUE_L = '#e8f2fb'

function Classic({ d, logo, logoUrl }: { d: InvData; logo: PrintLogo; logoUrl: string | null }) {
  return (
    <div id="invoice-sheet" className="relative mt-3 rounded-2xl border border-clinic-teal/10 bg-white p-6 sm:p-8">
      {d.voided && (
        <p className="absolute right-6 top-6 rotate-6 rounded border-2 border-red-500 px-3 py-1 font-display text-lg font-bold uppercase text-red-500">Cancelled</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-clinic-gold/40 pb-4">
        {logo.data ? (
          <div className="flex items-center gap-3">
            <LogoMark logo={logo} />
            <span className="font-display text-lg font-semibold text-clinic-ink">{CLINIC.name}</span>
          </div>
        ) : (
          <ClinicLogo logoUrl={logoUrl} size={52} withName />
        )}
        <div className="text-right text-xs text-clinic-ink/70">
          <p>{CLINIC.address.full}</p>
          <p>{CLINIC.phone.display}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-clinic-ink/50">Invoice</p>
          <p className="font-display text-2xl font-semibold text-clinic-teal">{d.number}</p>
          <p className="text-sm text-clinic-ink/60">{fmtDate(d.date)}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-clinic-ink">{d.patientName}</p>
          <p className="text-clinic-ink/60">{d.mr} · {d.phone}</p>
          {d.doctor && <p className="text-clinic-ink/60">Dr: {d.doctor}</p>}
        </div>
      </div>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-clinic-mint text-left text-clinic-ink/60">
          <tr>
            <th className="px-3 py-2">Treatment</th>
            <th className="px-3 py-2">Daant</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-right">Qeemat</th>
            <th className="px-3 py-2 text-right">Raqam</th>
          </tr>
        </thead>
        <tbody>
          {d.items.map((it) => (
            <tr key={it.id} className="border-t border-clinic-teal/10">
              <td className="px-3 py-2">{it.name}</td>
              <td className="px-3 py-2">{it.tooth ?? '—'}</td>
              <td className="px-3 py-2 text-right">{it.qty}</td>
              <td className="px-3 py-2 text-right">{money(it.unit_price)}</td>
              <td className="px-3 py-2 text-right">{money(it.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <div className="mt-4 ml-auto grid max-w-xs gap-1 text-sm">
        <p className="flex justify-between"><span className="text-clinic-ink/60">Subtotal</span><span>{money(d.subtotal)}</span></p>
        {d.discountAmount > 0 && (
          <p className="flex justify-between"><span className="text-clinic-ink/60">Discount ({d.discountPercent}%)</span><span>− {money(d.discountAmount)}</span></p>
        )}
        <p className="flex justify-between font-semibold"><span>Total</span><span>{money(d.total)}</span></p>
        <p className="flex justify-between text-emerald-700"><span>Mile</span><span>{money(d.paid)}</span></p>
        <p className="flex justify-between border-t border-clinic-teal/10 pt-1 font-display text-lg font-semibold text-amber-700"><span>Baqaya</span><span>{money(d.balance)}</span></p>
        {d.balance > 0 && d.dueDate && <p className="text-right text-xs text-clinic-ink/60">Aakhri tareekh: {fmtDate(d.dueDate)}</p>}
      </div>
      {d.voided && d.voidReason && <p className="mt-4 text-xs text-red-700">Cancel ki wajah: {d.voidReason}</p>}
      {d.notes && <p className="mt-4 text-xs text-clinic-ink/60">Note: {d.notes}</p>}
      <p className="mt-8 text-center text-xs text-clinic-ink/50">{CLINIC.doctor.name} · {CLINIC.name}</p>
    </div>
  )
}

/** Neela template: oopar patti, beech mein jadwal (lambi ho to agle safhe par), neeche hisaab aur clinic ki maloomat. Kuch ek doosre par nahi aata. */
function Blue({ d, logo, logoUrl }: { d: InvData; logo: PrintLogo; logoUrl: string | null }) {
  const th: React.CSSProperties = { background: BLUE, color: '#fff', padding: '8px 10px', fontSize: 12, textAlign: 'left' }
  const td: React.CSSProperties = { padding: '8px 10px', fontSize: 13, borderBottom: `1px solid ${BLUE_L}`, verticalAlign: 'top', overflowWrap: 'anywhere' }
  const row = (k: string, v: string, strong?: boolean, color?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '5px 10px', fontWeight: strong ? 700 : 400, color: color ?? BLUE_D, fontSize: strong ? 15 : 13 }}>
      <span>{k}</span><span>{v}</span>
    </div>
  )
  return (
    <div
      id="invoice-sheet"
      className="relative mt-3 overflow-hidden rounded-2xl border bg-white"
      style={{ borderColor: BLUE_L, minHeight: '24cm', display: 'flex', flexDirection: 'column', color: BLUE_D }}
    >
      {d.voided && (
        <p style={{ position: 'absolute', right: 24, top: 120, transform: 'rotate(6deg)', border: '2px solid #ef4444', color: '#ef4444', padding: '2px 12px', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>Cancelled</p>
      )}
      <div style={{ background: BLUE, color: '#fff', padding: '18px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {(logo.data || logoUrl) && <LogoMark logo={logo} fallbackUrl={logoUrl} badge />}
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>{CLINIC.name}</p>
            <p style={{ fontSize: 12, opacity: 0.85, fontStyle: 'italic' }}>{CLINIC.tagline}</p>
          </div>
        </div>
        <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>INVOICE</p>
      </div>
      <div style={{ height: 6, background: BLUE_D }} />

      <div style={{ padding: '18px 24px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
        <div>
          <p><b>Patient Name:</b> {d.patientName}</p>
          <p><b>Patient ID:</b> {d.mr ?? '—'} · {d.phone}</p>
          {d.doctor && <p><b>Dr:</b> {d.doctor}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p><b>Invoice No:</b> {d.number}</p>
          <p><b>Date:</b> {fmtDate(d.date)}</p>
        </div>
      </div>

      <div style={{ padding: '14px 24px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ display: 'table-header-group' }}>
            <tr>
              <th style={th}>Sr. No.</th>
              <th style={th}>Description</th>
              <th style={{ ...th, textAlign: 'right' }}>Rate</th>
              <th style={{ ...th, textAlign: 'right' }}>Quantity</th>
              <th style={{ ...th, textAlign: 'right' }}>Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((it, i) => (
              <tr key={it.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <td style={td}>{i + 1}</td>
                <td style={td}>{it.name}{it.tooth ? ` (${it.tooth})` : ''}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(it.unit_price)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{it.qty}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '14px 24px 0', display: 'flex', justifyContent: 'flex-end', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div style={{ width: 'min(100%, 300px)', background: BLUE_L, borderRadius: 8, padding: '6px 0' }}>
          {row('Sub Total', money(d.subtotal))}
          {d.discountAmount > 0 && row(`Discount (${d.discountPercent}%)`, `− ${money(d.discountAmount)}`)}
          {row('Net Payable', money(d.total), true)}
          {row('Paid', money(d.paid), false, '#047857')}
          <div style={{ background: BLUE, color: '#fff', borderRadius: 6, margin: '4px 6px 2px' }}>{row('Balance Due', money(d.balance), true, '#fff')}</div>
          {d.balance > 0 && d.dueDate && <p style={{ textAlign: 'right', fontSize: 11, padding: '2px 10px' }}>Aakhri tareekh: {fmtDate(d.dueDate)}</p>}
        </div>
      </div>

      {d.voided && d.voidReason && <p style={{ padding: '10px 24px 0', fontSize: 12, color: '#b91c1c' }}>Cancel ki wajah: {d.voidReason}</p>}
      {d.notes && <p style={{ padding: '10px 24px 0', fontSize: 12 }}><b>Notes:</b> {d.notes}</p>}

      <div style={{ marginTop: 'auto', padding: '24px 24px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div>
          <p style={{ fontFamily: 'cursive', fontStyle: 'italic', fontSize: 26, color: BLUE, lineHeight: 1.1 }}>Thank you!</p>
          <p style={{ fontStyle: 'italic', fontSize: 12 }}>for choosing {CLINIC.name}</p>
        </div>
        <div style={{ width: 84, height: 84, borderRadius: '50%', border: `3px double ${BLUE}`, color: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 9, fontWeight: 700, padding: 8, lineHeight: 1.2, transform: 'rotate(-6deg)' }}>
          {CLINIC.name}<br />{CLINIC.address.city}
        </div>
        <div style={{ minWidth: 150, textAlign: 'center', fontSize: 11, fontWeight: 700 }}>
          <div style={{ borderTop: `1px solid ${BLUE}`, paddingTop: 4 }}>Authorized Signature</div>
        </div>
      </div>
      <div style={{ padding: '14px 24px 0', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div style={{ borderTop: `1px dashed ${BLUE}`, paddingTop: 10, fontSize: 11, lineHeight: 1.6 }}>
          <p style={{ fontWeight: 700 }}>Shartein</p>
          <p>Ada shuda raqam wapas nahi hoti. Baqaya raqam muqarrar tareekh tak ada karein. Bill sambhal kar rakhein.</p>
        </div>
      </div>
      <div style={{ background: BLUE, color: '#fff', marginTop: 12, padding: '10px 24px', fontSize: 11, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <span>{CLINIC.address.full}</span>
        <span>{CLINIC.phone.display}</span>
      </div>
    </div>
  )
}


const GREEN = '#1b7f3b'
const GREEN_D = '#14562a'

/** Software wala neela-safed bill: header, patient ki tafseel, jadwal, hisaab, QR, dastkhat. Settings se har cheez on/off. */
function Soft({ d, logo, logoUrl, layout }: { d: InvData; logo: PrintLogo; logoUrl: string | null; layout: PrintLayout }) {
  const acc = accentOf(layout)
  const lh = Boolean(layout.letterhead.data)
  const sh = layout.show
  const th: React.CSSProperties = { background: acc, color: '#fff', padding: '8px 10px', fontSize: '0.85em', textAlign: 'left' }
  const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid rgb(var(--c-mint))', verticalAlign: 'top', overflowWrap: 'anywhere' }
  const row = (k: string, v: string, bold?: boolean, color?: string) => (
    <p style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '4px 12px', fontWeight: bold ? 700 : 400, color }}><span>{k}</span><span>{v}</span></p>
  )
  const paidStamp = d.total > 0 && d.balance <= 0 && !d.voided
  return (
    <LetterheadFrame layout={layout} id="invoice-sheet">
      <div style={{ position: 'relative', fontSize: `${14 * layout.scale}px`, color: 'rgb(var(--c-ink))', background: '#fff', borderRadius: lh ? 0 : 14, border: lh ? 'none' : '1px solid rgb(var(--c-mint))', overflow: 'hidden' }}>
        {d.voided && <p style={{ position: 'absolute', right: 24, top: 150, transform: 'rotate(6deg)', border: '2px solid #ef4444', color: '#ef4444', padding: '2px 12px', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>Cancelled</p>}
        {!lh && <SoftHeader logo={logo} logoUrl={logoUrl} layout={layout} />}
        <div style={{ padding: lh ? 0 : '8px 24px 20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', margin: '16px 0 10px', gap: 8 }}>
            <p style={{ fontSize: '1.5em' }}>Bill / Invoice</p>
            <p style={{ fontWeight: 600, color: acc }}>{d.number}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px 24px' }}>
            <div><p style={{ fontSize: '0.8em', opacity: 0.6 }}>Patient</p><p style={{ fontWeight: 600 }}>{d.patientName}</p></div>
            {sh.mr && <div><p style={{ fontSize: '0.8em', opacity: 0.6 }}>MR Number</p><p style={{ fontWeight: 600 }}>{d.mr ?? '—'}</p></div>}
            <div><p style={{ fontSize: '0.8em', opacity: 0.6 }}>Phone</p><p style={{ fontWeight: 600 }}>{d.phone}</p></div>
            <div><p style={{ fontSize: '0.8em', opacity: 0.6 }}>Date</p><p style={{ fontWeight: 600 }}>{fmtDate(d.date)}</p></div>
            {sh.age && d.age != null && <div><p style={{ fontSize: '0.8em', opacity: 0.6 }}>Umar</p><p style={{ fontWeight: 600 }}>{d.age} saal</p></div>}
            {sh.doctor && d.doctor && <div><p style={{ fontSize: '0.8em', opacity: 0.6 }}>Doctor</p><p style={{ fontWeight: 600 }}>{d.doctor}</p></div>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead style={{ display: 'table-header-group' }}>
              <tr><th style={th}>#</th><th style={th}>Tafseel</th><th style={th}>Daant</th><th style={{ ...th, textAlign: 'right' }}>Qty</th><th style={{ ...th, textAlign: 'right' }}>Qeemat</th><th style={{ ...th, textAlign: 'right' }}>Total</th></tr>
            </thead>
            <tbody>
              {d.items.map((it, i) => (
                <tr key={it.id} style={{ breakInside: 'avoid' }}>
                  <td style={td}>{i + 1}</td><td style={td}>{it.name}</td><td style={td}>{it.tooth ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{it.qty}</td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(it.unit_price)}</td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginTop: 14, breakInside: 'avoid' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              {sh.qr && d.patientId && <ShareQr patientId={d.patientId} />}
              {paidStamp && <p style={{ display: 'inline-block', border: '3px solid #047857', color: '#047857', borderRadius: 10, padding: '4px 14px', fontWeight: 800, transform: 'rotate(-5deg)' }}>PAID ✓ {layout.texts.thanks}</p>}
            </div>
            <div style={{ width: 'min(100%, 320px)', background: 'rgb(var(--c-mint))', borderRadius: 10, padding: '6px 0' }}>
              {row('Subtotal', money(d.subtotal))}
              {d.discountAmount > 0 && row(`Discount (${d.discountPercent}%)`, `− ${money(d.discountAmount)}`)}
              {row('Kul raqam', money(d.total), true)}
              {row('Mila', money(d.paid), false, '#047857')}
              <div style={{ background: acc, color: '#fff', borderRadius: 8, margin: '4px 6px 2px' }}>{row('Baqaya', money(d.balance), true)}</div>
              {d.balance > 0 && d.dueDate && <p style={{ textAlign: 'right', fontSize: '0.8em', padding: '2px 12px' }}>Aakhri tareekh: {fmtDate(d.dueDate)}</p>}
            </div>
          </div>
          {d.voided && d.voidReason && <p style={{ marginTop: 10, fontSize: '0.85em', color: '#b91c1c' }}>Cancel ki wajah: {d.voidReason}</p>}
          {d.notes && <p style={{ marginTop: 10, fontSize: '0.85em' }}>Note: {d.notes}</p>}
          {(sh.signature || (sh.stamp && layout.stamp)) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginTop: 28, breakInside: 'avoid' }}>
              {sh.signature ? <div style={{ width: 200, borderTop: '1px solid currentColor', paddingTop: 4, fontSize: '0.85em' }}>Patient ke dastkhat</div> : <span />}
              {sh.stamp && layout.stamp && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={layout.stamp} alt="Mohar" style={{ height: 80, width: 'auto' }} />
              )}
            </div>
          )}
          {sh.darood && layout.texts.darood.trim() && <p style={{ marginTop: 16, background: 'rgb(var(--c-mint))', borderRadius: 10, padding: '10px 14px', textAlign: 'center', whiteSpace: 'pre-line', direction: 'rtl' }}>{layout.texts.darood}</p>}
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: '0.85em', display: 'grid', gap: 2 }}>
            {layout.texts.footer.trim() && <p>{layout.texts.footer}</p>}
            {layout.texts.website.trim() && <p style={{ color: acc }}>{layout.texts.website}</p>}
            {sh.timings && <p style={{ opacity: 0.7 }}>{CLINIC.timings.full}</p>}
          </div>
        </div>
      </div>
    </LetterheadFrame>
  )
}

/** Hara bill (Patient Bill / Invoice / بل): hara header, patti, dabbe, PAID stamp, darood ka dabba, footer, dastkhat aur mohar. */
function Green({ d, logo, logoUrl, layout }: { d: InvData; logo: PrintLogo; logoUrl: string | null; layout: PrintLayout }) {
  const G = layout.accent ?? GREEN
  const lh = Boolean(layout.letterhead.data)
  const sh = layout.show
  const th: React.CSSProperties = { background: G, color: '#fff', padding: '7px 10px', fontSize: '0.9em', textAlign: 'left', border: '1px solid #fff' }
  const td: React.CSSProperties = { padding: '6px 10px', border: `1px solid ${G}`, overflowWrap: 'anywhere' }
  const box = (k: string, v: string, hi?: boolean, strong?: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 10px', border: `1px solid ${G}`, background: hi ? G : '#fff', color: hi ? '#fff' : '#111', fontWeight: strong || hi ? 700 : 600 }}>
      <span>{k}</span><span>{v}</span>
    </div>
  )
  const paidStamp = d.total > 0 && d.balance <= 0 && !d.voided
  return (
    <LetterheadFrame layout={layout} id="invoice-sheet">
      <div style={{ position: 'relative', fontSize: `${14 * layout.scale}px`, color: '#111', background: '#fff', overflow: 'hidden', borderRadius: lh ? 0 : 14, border: lh ? 'none' : `1px solid ${G}` }}>
        {d.voided && <p style={{ position: 'absolute', right: 24, top: 150, transform: 'rotate(6deg)', border: '2px solid #ef4444', color: '#ef4444', padding: '2px 12px', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>Cancelled</p>}
        {!lh && (
          <div style={{ background: `linear-gradient(135deg, #ffffff 0%, #eaf6ee 55%, ${G}22 100%)`, padding: '14px 22px 0', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              {(logo.data || logoUrl) && <LogoMark logo={logo} fallbackUrl={logoUrl} />}
              <div>
                <p style={{ fontSize: '2em', fontWeight: 800, color: GREEN_D, lineHeight: 1.1 }}>{CLINIC.name}</p>
                {sh.tagline && <p style={{ display: 'inline-block', marginTop: 6, border: `1px solid ${G}`, borderRadius: 99, padding: '2px 14px', fontWeight: 600, color: GREEN_D, background: '#fff' }}>{layout.texts.tagline.trim() || CLINIC.slogan}</p>}
                {sh.doctor && <p style={{ marginTop: 6, fontWeight: 700 }}>{CLINIC.doctor.name}</p>}
                {sh.doctor && <p style={{ fontSize: '0.85em' }}>{CLINIC.doctor.qualification}</p>}
              </div>
            </div>
            <div style={{ marginTop: 10, borderTop: `3px solid ${G}`, padding: '6px 0', fontSize: '0.85em', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 18px' }}>
              {sh.address && <span>{CLINIC.address.full}</span>}
              {sh.phone && <span>{CLINIC.phone.display}</span>}
            </div>
          </div>
        )}
        <div style={{ padding: lh ? 0 : '10px 22px 18px' }}>
          <p style={{ margin: '4px auto 10px', width: 'fit-content', background: G, color: '#fff', borderRadius: 12, padding: '6px 38px', fontSize: '1.4em', fontWeight: 700 }}>Patient Bill / Invoice / بل</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: `1px solid ${G}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', display: 'grid', gap: 3 }}>
              <p><b>Patient Name:</b> {d.patientName}</p>
              {sh.mr && <p><b>Patient ID:</b> {d.mr ?? '—'}</p>}
              {sh.age && d.age != null && <p><b>Age:</b> {d.age} Years</p>}
              <p><b>Phone:</b> {d.phone}</p>
            </div>
            <div style={{ padding: '8px 12px', display: 'grid', gap: 3, borderLeft: `1px solid ${G}`, alignContent: 'start' }}>
              <p><b>Bill No:</b> {d.number}</p>
              <p><b>Date:</b> {fmtDate(d.date)}</p>
              {sh.doctor && d.doctor && <p><b>Doctor:</b> {d.doctor}</p>}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead style={{ display: 'table-header-group' }}>
              <tr><th style={{ ...th, width: 34 }}>#</th><th style={th}>Description / تفصیل</th><th style={{ ...th, textAlign: 'center' }}>Qty</th><th style={{ ...th, textAlign: 'right' }}>Unit Price (Rs.)</th><th style={{ ...th, textAlign: 'right' }}>Total (Rs.)</th></tr>
            </thead>
            <tbody>
              {d.items.map((it, i) => (
                <tr key={it.id} style={{ breakInside: 'avoid' }}>
                  <td style={td}>{i + 1}</td><td style={td}>{it.name}{it.tooth ? ` (${it.tooth})` : ''}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{it.qty}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{Number(it.unit_price).toLocaleString()}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{Number(it.line_total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginTop: 14, breakInside: 'avoid' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              {sh.payment && (
                <div>
                  <p style={{ fontWeight: 700, color: GREEN_D }}>✔ Payment Method:</p>
                  <p>Easypaisa / JazzCash</p>
                  <p style={{ fontWeight: 700, fontSize: '1.15em' }}>{CLINIC.payments.easypaisa}</p>
                </div>
              )}
              {sh.qr && d.patientId && <ShareQr patientId={d.patientId} size={80} />}
            </div>
            {paidStamp && <p style={{ border: `3px solid ${G}`, color: G, borderRadius: 10, padding: '6px 16px', fontWeight: 800, fontSize: '1.2em', transform: 'rotate(-6deg)', textAlign: 'center' }}>PAID ✓<br /><span style={{ fontSize: '0.8em' }}>{layout.texts.thanks}</span></p>}
            <div style={{ width: 'min(100%, 290px)' }}>
              {box('Sub Total:', money(d.subtotal).replace('Rs. ', ''))}
              {box('Discount:', d.discountAmount > 0 ? `${d.discountAmount.toLocaleString()}` : '0')}
              {box('Total Amount:', Number(d.total).toLocaleString(), true)}
              {box('Paid Amount:', Number(d.paid).toLocaleString())}
              {box('Remaining:', Number(d.balance).toLocaleString(), true)}
            </div>
          </div>
          {d.voided && d.voidReason && <p style={{ marginTop: 10, fontSize: '0.85em', color: '#b91c1c' }}>Cancel ki wajah: {d.voidReason}</p>}
          {d.notes && <p style={{ marginTop: 10, fontSize: '0.85em' }}>Note: {d.notes}</p>}
          {sh.darood && layout.texts.darood.trim() && <p style={{ marginTop: 14, border: `1px solid ${G}`, background: '#eef7f0', borderRadius: 12, padding: '10px 14px', textAlign: 'center', whiteSpace: 'pre-line', direction: 'rtl', fontSize: '1.1em' }}>{layout.texts.darood}</p>}
          <div style={{ marginTop: 12, background: G, color: '#fff', borderRadius: 8, padding: '7px 14px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, fontSize: '0.9em' }}>
            <span>{layout.texts.website.trim() || CLINIC.address.full}</span>
            <span>{layout.texts.footer.trim() || layout.texts.tagline.trim() || CLINIC.slogan}</span>
          </div>
          {(sh.signature || (sh.stamp && layout.stamp)) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginTop: 22, breakInside: 'avoid' }}>
              {sh.signature ? <div style={{ width: 220, borderTop: '1px solid #111', paddingTop: 4 }}>Patient Signature:</div> : <span />}
              {sh.stamp && layout.stamp && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={layout.stamp} alt="Mohar" style={{ height: 90, width: 'auto' }} />
              )}
            </div>
          )}
        </div>
      </div>
    </LetterheadFrame>
  )
}

export default function InvoiceSheets({ d, logo, logoUrl, defaultTpl, layout = DEFAULT_LAYOUT }: { d: InvData; logo: PrintLogo; logoUrl: string | null; defaultTpl: string; layout?: PrintLayout }) {
  const [tpl, setTpl] = useState(BILL_TEMPLATES.some((t) => t.id === defaultTpl) ? defaultTpl : 'soft')
  return (
    <div>
      <style>{`#invoice-sheet, #invoice-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`}</style>
      <label className="mt-3 flex items-center gap-2 text-sm print:hidden">
        Bill ka template
        <select value={tpl} onChange={(e) => setTpl(e.target.value)} className="rounded-lg border border-clinic-teal/25 px-3 py-1.5 text-sm">
          {BILL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
      {tpl === 'soft' ? <Soft d={d} logo={logo} logoUrl={logoUrl} layout={layout} /> : tpl === 'green' ? <Green d={d} logo={logo} logoUrl={logoUrl} layout={layout} /> : tpl === 'blue' ? <Blue d={d} logo={logo} logoUrl={logoUrl} /> : <Classic d={d} logo={logo} logoUrl={logoUrl} />}
      {d.id && !d.voided && (
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <VerifyQr table="invoices" id={d.id} />
        </div>
      )}
    </div>
  )
}

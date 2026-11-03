'use client'

import { useState } from 'react'
import ClinicLogo from '@/components/ClinicLogo'
import LogoMark from '@/components/print/LogoMark'
import { CLINIC } from '@/clinic.config'
import { fmtDate, money } from '@/lib/karachi'
import { BILL_TEMPLATES, type PrintLogo } from '@/lib/printTemplates'

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
      <table className="mt-5 w-full text-sm">
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
      </table>
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
            <p style={{ fontSize: 12, opacity: 0.85 }}>{CLINIC.doctor.name}</p>
          </div>
        </div>
        <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>BILL</p>
      </div>
      <div style={{ height: 6, background: BLUE_D }} />

      <div style={{ padding: '18px 24px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
        <div>
          <p><b>Marez:</b> {d.patientName}</p>
          <p><b>MR:</b> {d.mr ?? '—'} · {d.phone}</p>
          {d.doctor && <p><b>Dr:</b> {d.doctor}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p><b>Bill No:</b> {d.number}</p>
          <p><b>Tareekh:</b> {fmtDate(d.date)}</p>
        </div>
      </div>

      <div style={{ padding: '14px 24px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ display: 'table-header-group' }}>
            <tr>
              <th style={th}>Tafseel</th>
              <th style={th}>Daant</th>
              <th style={{ ...th, textAlign: 'right' }}>Qeemat</th>
              <th style={{ ...th, textAlign: 'right' }}>Qty</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((it) => (
              <tr key={it.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <td style={td}>{it.name}</td>
                <td style={td}>{it.tooth ?? '—'}</td>
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
          {row('Subtotal', money(d.subtotal))}
          {d.discountAmount > 0 && row(`Riyayat (${d.discountPercent}%)`, `− ${money(d.discountAmount)}`)}
          {row('Kul raqam', money(d.total), true)}
          {row('Mila', money(d.paid), false, '#047857')}
          <div style={{ background: BLUE, color: '#fff', borderRadius: 6, margin: '4px 6px 2px' }}>{row('Baqaya', money(d.balance), true, '#fff')}</div>
          {d.balance > 0 && d.dueDate && <p style={{ textAlign: 'right', fontSize: 11, padding: '2px 10px' }}>Aakhri tareekh: {fmtDate(d.dueDate)}</p>}
        </div>
      </div>

      {d.voided && d.voidReason && <p style={{ padding: '10px 24px 0', fontSize: 12, color: '#b91c1c' }}>Cancel ki wajah: {d.voidReason}</p>}
      {d.notes && <p style={{ padding: '10px 24px 0', fontSize: 12 }}>Note: {d.notes}</p>}

      <div style={{ marginTop: 'auto', padding: '24px 24px 0', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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

export default function InvoiceSheets({ d, logo, logoUrl, defaultTpl }: { d: InvData; logo: PrintLogo; logoUrl: string | null; defaultTpl: string }) {
  const [tpl, setTpl] = useState(BILL_TEMPLATES.some((t) => t.id === defaultTpl) ? defaultTpl : 'classic')
  return (
    <div>
      <style>{`#invoice-sheet, #invoice-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`}</style>
      <label className="mt-3 flex items-center gap-2 text-sm print:hidden">
        Bill ka template
        <select value={tpl} onChange={(e) => setTpl(e.target.value)} className="rounded-lg border border-clinic-teal/25 px-3 py-1.5 text-sm">
          {BILL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
      {tpl === 'blue' ? <Blue d={d} logo={logo} logoUrl={logoUrl} /> : <Classic d={d} logo={logo} logoUrl={logoUrl} />}
    </div>
  )
}

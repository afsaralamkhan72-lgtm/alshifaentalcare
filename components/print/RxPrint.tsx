'use client'

import { useMemo, useState } from 'react'
import { toInternationalPKNumber } from '@/lib/phone'
import VerifyQr from '@/components/print/VerifyQr'
import { CLINIC } from '@/clinic.config'
import { fmtDate } from '@/lib/karachi'
import PrescriptionSheet, { type RxSheetData } from '@/components/PrescriptionSheet'
import LogoMark from '@/components/print/LogoMark'
import { rxTemplatesFor, aftercareFor, type PrintLogo, type PrintWhat } from '@/lib/printTemplates'
import DuoSheet, { BillBody, ExtraPart, FitOnePage, type BillPart, type DuoPatient } from '@/components/print/Duo'
import { DEFAULT_LAYOUT, type PrintLayout } from '@/lib/printLayout'
import LetterheadFrame from '@/components/print/LetterheadFrame'
import SoftHeader from '@/components/print/SoftHeader'

const THEME: Record<string, { main: string; dark: string; light: string }> = {
  pad_red: { main: '#c0272d', dark: '#111111', light: '#fbeaea' },
  pad_bw: { main: '#111111', dark: '#111111', light: '#f2f2f2' },
  pad_green: { main: '#1f7a4d', dark: '#0f3d27', light: '#e6f4ec' },
}

interface Care { title: string; cols: { h: string; items: string[] }[]; warn: string }
/** Hidayat text: pehli line unwan, "کریں:" / "نہ کریں:" sarkhiyan, "•" nukat, "!" se shuru line = khabardari */
function parseCare(text: string): Care {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const c: Care = { title: '', cols: [], warn: '' }
  for (const l of lines) {
    if (l.startsWith('!')) c.warn = (c.warn ? c.warn + ' ' : '') + l.slice(1).trim()
    else if (l.startsWith('•') || l.startsWith('-')) {
      if (!c.cols.length) c.cols.push({ h: '', items: [] })
      c.cols[c.cols.length - 1].items.push(l.replace(/^[•-]\s*/, ''))
    } else if (l.endsWith(':') || l.endsWith('：')) c.cols.push({ h: l.replace(/[:：]$/, ''), items: [] })
    else if (!c.title && !c.cols.length) c.title = l
    else {
      if (!c.cols.length) c.cols.push({ h: '', items: [] })
      c.cols[c.cols.length - 1].items.push(l)
    }
  }
  return c
}

function CareBox({ text, color }: { text: string; color: string }) {
  const c = useMemo(() => parseCare(text), [text])
  return (
    <div dir="rtl" style={{ border: `2px solid ${color}`, borderRadius: 10, overflow: 'hidden', breakInside: 'avoid', pageBreakInside: 'avoid', marginTop: 14, fontFamily: 'var(--font-urdu, "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif)' }}>
      {c.title && <div style={{ background: color, color: '#fff', textAlign: 'center', padding: '6px 10px', fontWeight: 700, fontSize: 15 }}>{c.title}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: c.cols.length > 1 ? '1fr 1fr' : '1fr', gap: 0 }}>
        {c.cols.map((col, i) => (
          <div key={i} style={{ padding: '8px 12px', borderInlineStart: i > 0 ? `1px solid ${color}55` : 'none' }}>
            {col.h && <p style={{ fontWeight: 700, color, marginBottom: 4, fontSize: 14 }}>{col.h}</p>}
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, lineHeight: 2 }}>
              {col.items.map((t, j) => <li key={j} style={{ overflowWrap: 'anywhere' }}>• {t}</li>)}
            </ul>
          </div>
        ))}
      </div>
      {c.warn && <p style={{ background: `${color}18`, color, fontWeight: 700, textAlign: 'center', padding: '6px 10px', fontSize: 13 }}>{c.warn}</p>}
    </div>
  )
}

function Pad({
  id, rx, logo, logoUrl, filled, care, qr, extra, sid,
}: { id: string; rx: RxSheetData; logo: PrintLogo; logoUrl: string | null; filled: boolean; care: string; qr: React.ReactNode; extra: React.ReactNode; sid: string | undefined }) {
  const t = THEME[id] ?? THEME.pad_red
  const p = rx.patient
  const homeo = id === 'pad_green'
  const cell: React.CSSProperties = { borderBottom: `1px solid ${t.main}66`, padding: '3px 4px', minHeight: 24, flex: 1 }
  return (
    <div id={sid} style={{ background: '#fff', color: '#111', border: `1px solid ${t.light}`, borderRadius: 12, overflow: 'hidden', minHeight: extra ? undefined : '24cm', display: 'flex', flexDirection: 'column' }}>
      {homeo ? (
        <div style={{ padding: '16px 22px 10px', textAlign: 'center', borderBottom: `3px double ${t.main}`, background: t.light }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>{(logo.data || logoUrl) && <LogoMark logo={logo} fallbackUrl={logoUrl} />}</div>
          <p style={{ fontSize: 26, fontWeight: 700, color: t.main, lineHeight: 1.2, marginTop: 4 }}>{CLINIC.name}</p>
          <p style={{ fontSize: 12, color: t.dark }}>{CLINIC.tagline}</p>
          <p style={{ fontSize: 13, marginTop: 6, color: t.dark }}><b>{CLINIC.doctor.name}</b>{CLINIC.doctor.registration ? ` · Reg. ${CLINIC.doctor.registration}` : ''}</p>
        </div>
      ) : (
      <>
      <div style={{ background: t.main, color: '#fff', padding: '14px 22px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {(logo.data || logoUrl) && <LogoMark logo={logo} fallbackUrl={logoUrl} badge />}
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>{CLINIC.name}</p>
            <p style={{ fontSize: 11, opacity: 0.9 }}>{CLINIC.tagline}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          <p style={{ fontWeight: 700, fontSize: 14 }}>{CLINIC.doctor.name}</p>
          {CLINIC.doctor.registration && <p style={{ opacity: 0.9 }}>Reg. No: {CLINIC.doctor.registration}</p>}
        </div>
      </div>
      <div style={{ height: 5, background: t.dark }} />

      </>
      )}

      <div style={{ padding: '14px 22px 0', display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13 }}>
        <div style={{ ...cell, flex: '2 1 200px' }}><b>Naam: </b>{p?.full_name}</div>
        <div style={{ ...cell, flex: '0 1 90px' }}><b>Umar: </b>{p?.age ?? ''}</div>
        <div style={{ ...cell, flex: '0 1 110px', textTransform: 'capitalize' }}><b>Jins: </b>{p?.gender ?? ''}</div>
        <div style={{ ...cell, flex: '1 1 130px' }}><b>Tareekh: </b>{fmtDate(rx.prescribed_date)}</div>
      </div>

      <div style={{ padding: '14px 22px', flex: 1 }}>
        <p style={{ fontSize: 34, fontWeight: 700, color: t.main, lineHeight: 1 }}>℞</p>
        {filled ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 13 }}>
            <thead style={{ display: 'table-header-group' }}>
              <tr style={{ background: t.light, textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>#</th><th style={{ padding: '6px 8px' }}>Dawa</th>{homeo && <th style={{ padding: '6px 8px' }}>Potency</th>}<th style={{ padding: '6px 8px' }}>Dose</th><th style={{ padding: '6px 8px' }}>Kitni baar</th><th style={{ padding: '6px 8px' }}>Din</th>
              </tr>
            </thead>
            <tbody>
              {rx.items.map((it, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${t.light}`, verticalAlign: 'top', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <td style={{ padding: '6px 8px', color: '#777' }}>{i + 1}</td>
                  <td style={{ padding: '6px 8px', overflowWrap: 'anywhere' }}>
                    <b>{it.name_en || it.name_ur}{!homeo && it.potency ? ` ${it.potency}` : ''}</b>
                    {it.name_en && it.name_ur && <p dir="rtl" style={{ textAlign: 'right' }}>{it.name_ur}</p>}
                    {it.instructions && <p style={{ fontSize: 11, color: '#555' }}>{it.instructions}</p>}
                  </td>
                  {homeo && <td style={{ padding: '6px 8px' }}>{it.potency}</td>}
                  <td style={{ padding: '6px 8px' }}>{it.dosage}</td>
                  <td style={{ padding: '6px 8px' }}>{it.frequency}</td>
                  <td style={{ padding: '6px 8px' }}>{it.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ minHeight: care.trim() ? '7cm' : '12cm' }} />
        )}
        {filled && (rx.notes_en || rx.notes_ur) && (
          <div style={{ marginTop: 12, background: t.light, borderRadius: 8, padding: 10, fontSize: 13, breakInside: 'avoid' }}>
            {rx.notes_en && <p>{rx.notes_en}</p>}
            {rx.notes_ur && <p dir="rtl" style={{ textAlign: 'right' }}>{rx.notes_ur}</p>}
          </div>
        )}
        {care.trim() && <CareBox text={care} color={t.main} />}
        {extra}
      </div>

      <div style={{ padding: '0 22px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div style={{ fontSize: 11 }}>
          {qr}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11 }}>
          <div style={{ width: 170, borderTop: '1px solid #444' }} />
          <p style={{ marginTop: 3 }}>Signature</p>
        </div>
      </div>
      <div style={{ background: t.main, color: '#fff', padding: '8px 22px', fontSize: 11, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
        <span>{CLINIC.address.full}</span>
        <span>{CLINIC.phone.display} · {CLINIC.timings.short}</span>
      </div>
    </div>
  )
}

export default function RxPrint({
  rx, dept, rxId, logo, logoUrl, defaultTpl, aftercare, phone, layout = DEFAULT_LAYOUT, bill = null, billHref = null, patientInfo, initialWhat = 'rx',
}: {
  /** isi visit ka bill (ho to "dono aik sath" chhap sakta hai) */
  bill?: BillPart | null
  /** "Sirf Invoice" ke liye bill ka page */
  billHref?: string | null
  patientInfo: DuoPatient
  initialWhat?: PrintWhat
  rx: RxSheetData
  dept: string
  rxId: string
  logo: PrintLogo
  logoUrl: string | null
  defaultTpl: string
  aftercare: Record<string, string>
  phone: string | null
  layout?: PrintLayout
}) {
  const tpls = rxTemplatesFor(dept)
  const cares = aftercareFor(dept)
  const [tpl, setTpl] = useState(tpls.some((t) => t.id === defaultTpl) ? defaultTpl : 'soft')
  const [filled, setFilled] = useState(true)
  const [careKey, setCareKey] = useState((tpl === 'pad_bw' || tpl === 'pad_green') && cares[0] ? cares[0].key : '')
  const [careText, setCareText] = useState((tpl === 'pad_bw' || tpl === 'pad_green') && cares[0] ? aftercare[cares[0].key] ?? '' : '')
  const [what, setWhat] = useState<PrintWhat>(initialWhat === 'both' && bill ? 'both' : 'rx')

  function chooseTpl(v: string) {
    setTpl(v)
    if ((v === 'pad_bw' || v === 'pad_green') && !careKey && cares[0]) pickCare(cares[0].key)
  }
  function pickCare(k: string) {
    setCareKey(k)
    setCareText(k ? aftercare[k] ?? '' : '')
  }

  const waDigits = toInternationalPKNumber(phone ?? '')
  function waSend(text: string) {
    window.open(`https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }
  const careMsg = `${careText.trim()}\n\n${CLINIC.name}`

  const isPad = tpl.startsWith('pad_')
  const both = what === 'both' && Boolean(bill)
  const extra = both && bill ? <ExtraPart><BillBody bill={bill} title="Invoice" /></ExtraPart> : null
  // Prescription par sirf aik QR: "asli hai" (tasdeeq) wala
  const qr = <VerifyQr table="prescriptions" id={rxId} />
  // Dono aik sath hon to purane templates ko bhi aik safhe mein samaya jata hai
  const wrap = both && tpl !== 'duo' && !(tpl === 'soft' && layout.letterhead.data)
  const sid = wrap ? undefined : 'print-sheet'
  function chooseWhat(v: PrintWhat) {
    if (v === 'bill') {
      if (billHref) window.location.assign(billHref + (billHref.includes('?') ? '&' : '?') + 'tpl=' + (tpl === 'duo' ? 'duo' : ''))
      return
    }
    setWhat(v)
  }
  const input = 'rounded-lg border border-clinic-teal/25 px-3 py-1.5 text-sm'
  return (
    <div>
      <style>{`
        #print-sheet, #print-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          body * { visibility: hidden; }
          #print-sheet, #print-sheet * { visibility: visible; }
          #print-sheet { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
          @page { margin: 10mm; }
        }
      `}</style>
      <div className="mb-4 grid gap-3 rounded-2xl border border-clinic-teal/10 bg-white p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-0 max-w-full items-center gap-2 text-sm">Template
            <select value={tpl} onChange={(e) => chooseTpl(e.target.value)} className={input + ' min-w-0 max-w-full'}>
              {tpls.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 max-w-full items-center gap-2 text-sm">Kya chhape
            <select data-testid="print-what" value={what} onChange={(e) => chooseWhat(e.target.value as PrintWhat)} className={input + ' min-w-0 max-w-full'}>
              <option value="rx">Sirf Prescription</option>
              {bill && <option value="both">Prescription + Invoice aik sath</option>}
              {bill && billHref && <option value="bill">Sirf Invoice</option>}
            </select>
          </label>
          {isPad && (
            <label className="flex items-center gap-2 text-sm">Pad
              <select value={filled ? 'full' : 'blank'} onChange={(e) => setFilled(e.target.value === 'full')} className={input}>
                <option value="full">Bhari hui (dawa likhi hui)</option>
                <option value="blank">Khali (doctor haath se likhein)</option>
              </select>
            </label>
          )}
          <button type="button" onClick={() => window.print()} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">Print / PDF</button>
        </div>

        {isPad && cares.length > 0 && (
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm">Hidayat
              <select value={careKey} onChange={(e) => pickCare(e.target.value)} className={input}>
                <option value="">Koi nahi</option>
                {cares.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            {careKey && (
              <>
                <textarea dir="rtl" rows={8} value={careText} onChange={(e) => setCareText(e.target.value)} className="w-full rounded-lg border border-clinic-teal/25 p-2 text-sm" />
                <p className="text-[11px] text-clinic-ink/50">Yahan badlav sirf isi print ke liye hai. Hamesha ke liye badalna ho to Settings → Messages mein badlein. Format: pehli line unwan, &quot;کریں:&quot; / &quot;نہ کریں:&quot; sarkhi, &quot;•&quot; nukte, &quot;!&quot; se khabardari.</p>
                {waDigits && (
                  <button type="button" onClick={() => waSend(careMsg)} className="w-fit rounded-full bg-whatsapp px-4 py-1.5 text-sm font-semibold text-white">Hidayat WhatsApp par bhejein</button>
                )}
              </>
            )}
          </div>
        )}

        {!bill && <p className="text-[11px] text-clinic-ink/50" data-testid="no-bill-note">Is visit ka bill nahi mila, is liye &quot;aik sath&quot; ka option nahi hai.</p>}
      </div>

      {(() => {
        const sheet = tpl === 'duo' ? (
          <DuoSheet id="print-sheet" logo={logo} logoUrl={logoUrl} layout={layout} patient={patientInfo} date={rx.prescribed_date} rx={rx} bill={both ? bill : null} verify={{ table: 'prescriptions', id: rxId }} />
        ) : tpl === 'soft' ? (
          <LetterheadFrame layout={layout} id={wrap ? 'print-sheet-in' : 'print-sheet'}>
            <div style={{ background: '#fff', color: 'rgb(var(--c-ink))', fontSize: `${14 * layout.scale}px`, borderRadius: layout.letterhead.data ? 0 : 14, border: layout.letterhead.data ? 'none' : '1px solid rgb(var(--c-mint))', overflow: 'hidden', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              {!layout.letterhead.data && <SoftHeader logo={logo} logoUrl={logoUrl} layout={layout} />}
              <div style={{ padding: layout.letterhead.data ? 0 : '12px 24px 20px' }}>
                <PrescriptionSheet rx={rx} bare extra={extra} />
                <div style={{ marginTop: 14 }}>{qr}</div>
                {layout.show.signature && <div style={{ marginTop: 26, width: 200, borderTop: '1px solid currentColor', paddingTop: 4, fontSize: 12 }}>Doctor ke dastkhat</div>}
                {layout.show.stamp && layout.stamp && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={layout.stamp} alt="Mohar" style={{ height: 80, width: 'auto', marginTop: 8 }} />
                )}
              </div>
            </div>
          </LetterheadFrame>
        ) : isPad ? (
          <Pad id={tpl} rx={rx} logo={logo} logoUrl={logoUrl} filled={filled} care={careKey ? careText : ''} qr={qr} extra={extra} sid={sid} />
        ) : (
          <PrescriptionSheet rx={rx} sheetId={sid ?? null} extra={extra} qr={qr} />
        )
        return wrap ? <FitOnePage id="print-sheet" watch={[tpl, filled, careText, what]}>{sheet}</FitOnePage> : sheet
      })()}
    </div>
  )
}

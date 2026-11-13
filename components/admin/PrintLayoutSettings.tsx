'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { DEFAULT_LAYOUT, type DuoDoctor, type PrintLayout } from '@/lib/printLayout'
import type { PrintLogo } from '@/lib/printTemplates'
import InvoiceSheets, { type InvData } from '@/components/print/InvoiceSheets'

const SAMPLE: InvData = {
  number: 'INV-0001', date: new Date().toISOString().slice(0, 10), patientName: 'Namoona Patient', mr: 'AS-D-0001', phone: '0300-0000000', doctor: 'Dr. Doctor', age: 30,
  items: [
    { id: '1', name: 'Consultation', tooth: null, qty: 1, unit_price: 1000, line_total: 1000 },
    { id: '2', name: 'Composite Filling', tooth: '36', qty: 1, unit_price: 5000, line_total: 5000 },
    { id: '3', name: 'Scaling & Polishing', tooth: null, qty: 1, unit_price: 3000, line_total: 3000 },
  ],
  subtotal: 9000, discountAmount: 0, discountPercent: 0, total: 9000, paid: 9000, balance: 0, dueDate: null, voided: false, voidReason: null, notes: null,
}

async function loadImg(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('Ye tasveer khul nahi saki (JPG ya PNG chunein)'))
      i.src = url
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
}


/** PDF ka pehla safha tasveer (PNG) bana deta hai, taa ke PDF letterhead bhi chal sake */
async function pdfFirstPage(file: File): Promise<File> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const page = await doc.getPage(1)
  const base = page.getViewport({ scale: 1 })
  const vp = page.getViewport({ scale: Math.min(3, 1600 / Math.max(base.width, base.height)) })
  const c = document.createElement('canvas')
  c.width = Math.round(vp.width)
  c.height = Math.round(vp.height)
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('PDF nahi khul saka')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  await page.render({ canvasContext: ctx, viewport: vp }).promise
  const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/png'))
  if (!blob) throw new Error('PDF ki tasveer nahi bani')
  return new File([blob], 'letterhead.png', { type: 'image/png' })
}

/** Tasveer ko chhota kar ke (lamba kinara max px) JPEG data URL banata hai, limit se chhota hone tak quality ghatata hai */
async function shrink(file: File, max: number, limit: number, png = false): Promise<string> {
  const img = await loadImg(file)
  const k = Math.min(1, max / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(img.width * k))
  c.height = Math.max(1, Math.round(img.height * k))
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Tasveer nahi bani')
  if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height) }
  ctx.drawImage(img, 0, 0, c.width, c.height)
  if (png) {
    const p = c.toDataURL('image/png')
    if (p.length <= limit) return p
  }
  for (const q of [0.88, 0.78, 0.68, 0.55, 0.42]) {
    const d = c.toDataURL('image/jpeg', q)
    if (d.length <= limit) return d
  }
  throw new Error('Tasveer bohat bari hai, chhoti ya halki tasveer chunein')
}

/** Letterhead mein upar ka header aur neeche ka footer khud dhoondta hai (mm mein, A4 297mm par) */
async function detectBands(dataUrl: string): Promise<{ top: number; bottom: number }> {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Tasveer nahi parhi')); i.src = dataUrl })
  const W = 120
  const H = Math.round((W * 297) / 210)
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Tasveer nahi parhi')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)
  ctx.drawImage(img, 0, 0, W, H)
  const px = ctx.getImageData(0, 0, W, H).data
  const ink: boolean[] = []
  for (let y = 0; y < H; y++) {
    let n = 0
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      if (255 - Math.min(px[i], px[i + 1], px[i + 2]) > 38) n++
    }
    ink.push(n / W > 0.02)
  }
  const gap = Math.max(2, Math.round(H * 0.025))
  const edge = (from: number, dir: 1 | -1) => {
    let last = -1, run = 0, seen = false
    for (let k = 0; k < Math.floor(H * 0.5); k++) {
      const y = from + dir * k
      if (ink[y]) { seen = true; last = k; run = 0 } else if (seen && ++run >= gap) break
    }
    return last
  }
  const t = edge(0, 1)
  const b = edge(H - 1, -1)
  const mm = (rows: number) => Math.round(((rows + 1) / H) * 297 + 4)
  return { top: t < 0 ? 15 : Math.min(110, mm(t)), bottom: b < 0 ? 15 : Math.min(110, mm(b)) }
}

const SHOW_LABELS: { k: keyof PrintLayout['show']; l: string }[] = [
  { k: 'mr', l: 'MR number' }, { k: 'age', l: 'Umar' }, { k: 'doctor', l: 'Doctor ka naam' }, { k: 'phone', l: 'Phone / Easypaisa' },
  { k: 'address', l: 'Address' }, { k: 'tagline', l: 'Tagline' }, { k: 'qr', l: 'QR code' }, { k: 'payment', l: 'Payment ka tareeqa' },
  { k: 'signature', l: 'Dastkhat ki jagah' }, { k: 'stamp', l: 'Clinic ki mohar' }, { k: 'darood', l: 'Darood / dua ka dabba' }, { k: 'timings', l: 'Clinic ka waqt' },
]

export default function PrintLayoutSettings({ initial, logo }: { initial: PrintLayout; logo: PrintLogo }) {
  const router = useRouter()
  const [l, setL] = useState<PrintLayout>(initial)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [tpl, setTpl] = useState('soft')

  const set = (patch: Partial<PrintLayout>) => setL((x) => ({ ...x, ...patch }))
  const duoDoc = (side: 'left' | 'right', patch: Partial<DuoDoctor>) => setL((x) => ({ ...x, duo: { ...x.duo, [side]: { ...x.duo[side], ...patch } } }))
  const lh = (patch: Partial<PrintLayout['letterhead']>) => setL((x) => ({ ...x, letterhead: { ...x.letterhead, ...patch } }))

  async function save() {
    setBusy('save'); setErr(''); setMsg('')
    const { error } = await createClient().from('site_settings').upsert({ key: 'print_layout', value: l, updated_at: new Date().toISOString() })
    setBusy('')
    if (error) return setErr(friendlyError(error.message))
    setMsg('Print layout mehfooz ho gaya. Ab har bill, statement aur prescription isi ke mutabiq chhapegi.')
    router.refresh()
  }

  async function pickLetterhead(f: File | undefined) {
    if (!f) return
    setErr(''); setMsg(''); setBusy('lh')
    try {
      const src = f.type === 'application/pdf' || /\.pdf$/i.test(f.name) ? await pdfFirstPage(f) : f
      const data = await shrink(src, 1500, 450_000)
      const b = await detectBands(data)
      setL((x) => ({ ...x, letterhead: { ...x.letterhead, data, top: b.top, bottom: b.bottom } }))
      setMsg(`Letterhead lag gaya. Software ne upar ${b.top}mm aur neeche ${b.bottom}mm chhor diya. Zaroorat ho to neeche sliders se theek karein.`)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Letterhead nahi chal saka') }
    setBusy('')
  }
  async function redetect() {
    if (!l.letterhead.data) return
    try { const b = await detectBands(l.letterhead.data); lh({ top: b.top, bottom: b.bottom }) } catch (e) { setErr(e instanceof Error ? e.message : 'Nahi hua') }
  }
  async function pickStamp(f: File | undefined) {
    if (!f) return
    setErr(''); setMsg('')
    try { set({ stamp: await shrink(f, 400, 120_000, true) }) } catch (e) { setErr(e instanceof Error ? e.message : 'Mohar nahi lagi') }
  }

  const card = 'rounded-2xl border border-clinic-teal/10 bg-white p-5'
  const input = 'rounded-lg border border-clinic-teal/25 px-3 py-2 text-sm'
  const slider = (label: string, v: number, min: number, max: number, step: number, on: (n: number) => void, unit = '') => (
    <label className="grid gap-1 text-sm">{label}: {v}{unit}
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(Number(e.target.value))} />
    </label>
  )
  const hasLh = Boolean(l.letterhead.data)
  return (
    <div className="grid gap-5">
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}

      <section className={card}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Apna Letterhead</h2>
        <p className="mt-1 text-sm text-clinic-ink/60">Apne letterhead ki poore A4 safhe ki tasveer (JPG/PNG ya PDF) chunein. Software khud dekh lega ke upar header aur neeche footer kitna hai, aur bill/statement/prescription ka matn beech mein rakhega. Matn zyada ho to khud chhota ho kar aik safhe mein aa jayega.</p>
        <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => pickLetterhead(e.target.files?.[0])} className="mt-3 text-sm" />
        {busy === 'lh' && <p className="mt-2 text-sm text-clinic-ink/60">Letterhead dekh raha hai…</p>}
        {hasLh && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {slider('Upar se kitna chhorein', l.letterhead.top, 0, 120, 1, (n) => lh({ top: n }), ' mm')}
            {slider('Neeche se kitna chhorein', l.letterhead.bottom, 0, 120, 1, (n) => lh({ bottom: n }), ' mm')}
            {slider('Left kinara', l.letterhead.left, 0, 60, 1, (n) => lh({ left: n }), ' mm')}
            {slider('Right kinara', l.letterhead.right, 0, 60, 1, (n) => lh({ right: n }), ' mm')}
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button type="button" onClick={redetect} className="rounded-full border border-clinic-teal px-4 py-1.5 text-xs font-semibold text-clinic-teal">Khud dobara andaza lagayein</button>
              <button type="button" onClick={() => lh({ data: null })} className="text-sm text-red-600 underline">Letterhead hatao (software ka apna header)</button>
            </div>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Size, rang aur kya dikhe</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {slider('Likhaai ka size (poore page ka)', Math.round(l.scale * 100), 70, 140, 5, (n) => set({ scale: n / 100 }), '%')}
          <div className="grid gap-1 text-sm">Khaas rang (khali = software ka rang)
            <div className="flex items-center gap-2">
              <input type="color" value={l.accent ?? '#1769d2'} onChange={(e) => set({ accent: e.target.value })} className="h-9 w-14 rounded border border-clinic-teal/25" />
              {l.accent && <button type="button" onClick={() => set({ accent: null })} className="text-xs underline">software ka rang</button>}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SHOW_LABELS.map((s) => (
            <label key={s.k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={l.show[s.k]} onChange={(e) => setL({ ...l, show: { ...l.show, [s.k]: e.target.checked } })} className="h-4 w-4" />
              {s.l}
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-1 text-sm">Clinic ki mohar (stamp) ki tasveer
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" accept="image/*" onChange={(e) => pickStamp(e.target.files?.[0])} className="text-sm" />
            {l.stamp && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.stamp} alt="Mohar" style={{ height: 50 }} />
                <button type="button" onClick={() => set({ stamp: null })} className="text-xs text-red-600 underline">hatao</button>
              </>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-clinic-ink/55">Logo ka size aur safed gola upar &quot;Logo&quot; wale hisse mein hai.</p>
      </section>

      <section className={card}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Likhaai jo aap badal sakte hain</h2>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-sm">Tagline (khali = clinic ki apni)
            <input value={l.texts.tagline} onChange={(e) => setL({ ...l, texts: { ...l.texts, tagline: e.target.value } })} className={input} />
          </label>
          <label className="grid gap-1 text-sm">Shukriya ka lafz (PAID stamp ke saath)
            <input value={l.texts.thanks} onChange={(e) => setL({ ...l, texts: { ...l.texts, thanks: e.target.value } })} className={input} />
          </label>
          <label className="grid gap-1 text-sm">Website
            <input value={l.texts.website} onChange={(e) => setL({ ...l, texts: { ...l.texts, website: e.target.value } })} className={input} placeholder="www.alshifahomeoanddentalcare.com" />
          </label>
          <label className="grid gap-1 text-sm">Neeche ki line
            <input value={l.texts.footer} onChange={(e) => setL({ ...l, texts: { ...l.texts, footer: e.target.value } })} className={input} />
          </label>
          <label className="grid gap-1 text-sm">Darood / dua ka matn
            <textarea rows={3} dir="rtl" value={l.texts.darood} onChange={(e) => setL({ ...l, texts: { ...l.texts, darood: e.target.value } })} className={input} />
          </label>
        </div>
      </section>

      <section className={card} data-testid="duo-settings">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">&quot;Do doctor wala&quot; template</h2>
        <p className="mt-1 text-xs text-clinic-ink/60">Upar dono taraf doctor, un ke neeche chhota naam aur number, beech mein pata aur timing. Ye invoice aur prescription dono par lagta hai. Jo khana khali ho wo nahi chhapta.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {(['left', 'right'] as const).map((side) => (
            <div key={side} className="grid gap-2 rounded-xl border border-clinic-teal/15 p-3">
              <p className="text-sm font-semibold text-clinic-ink">{side === 'left' ? 'Baayein taraf ka doctor' : 'Daayein taraf ka doctor'}</p>
              <label className="grid gap-1 text-sm">Doctor ka naam
                <input data-testid={'duo-' + side + '-name'} value={l.duo[side].name} onChange={(e) => duoDoc(side, { name: e.target.value })} className={input} />
              </label>
              <label className="grid gap-1 text-sm">Degree
                <input data-testid={'duo-' + side + '-degree'} value={l.duo[side].degree} onChange={(e) => duoDoc(side, { degree: e.target.value })} className={input} />
              </label>
              <label className="grid gap-1 text-sm">Ohda
                <input data-testid={'duo-' + side + '-title'} value={l.duo[side].title} onChange={(e) => duoDoc(side, { title: e.target.value })} className={input} />
              </label>
              <label className="grid gap-1 text-sm">Neeche chhota naam
                <input data-testid={'duo-' + side + '-sub'} value={l.duo[side].sub_name} onChange={(e) => duoDoc(side, { sub_name: e.target.value })} className={input} />
              </label>
              <label className="grid gap-1 text-sm">Us ka phone number
                <input data-testid={'duo-' + side + '-phone'} value={l.duo[side].sub_phone} onChange={(e) => duoDoc(side, { sub_phone: e.target.value })} className={input} inputMode="tel" />
              </label>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-sm">Beech mein pata (khali = clinic ka apna pata)
            <input data-testid="duo-address" value={l.duo.address} onChange={(e) => setL({ ...l, duo: { ...l.duo, address: e.target.value } })} className={input} />
          </label>
          <label className="grid gap-1 text-sm">Beech mein clinic ki timing (khali = clinic ki apni timing)
            <input data-testid="duo-timings" value={l.duo.timings} onChange={(e) => setL({ ...l, duo: { ...l.duo, timings: e.target.value } })} className={input} />
          </label>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Live preview (namoona bill)</h2>
          <div className="flex gap-2 text-sm">
            {[['soft', 'Neela-Safed'], ['green', 'Hara'], ['duo', 'Do doctor wala']].map(([id, lb]) => (
              <button key={id} type="button" onClick={() => setTpl(id)} className={`rounded-full px-3 py-1 font-semibold ${tpl === id ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25'}`}>{lb}</button>
            ))}
          </div>
        </div>
        <div style={{ zoom: tpl === 'duo' ? 1 : hasLh ? 0.7 : 0.85 }} className="mt-3">
          <InvoiceSheets preview key={tpl} d={SAMPLE} logo={logo} logoUrl={null} defaultTpl={tpl} layout={l} />
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="button" data-testid="layout-save" disabled={busy === 'save'} onClick={save} className="rounded-full bg-clinic-teal px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Mehfooz karein</button>
        <button type="button" onClick={() => setL(DEFAULT_LAYOUT)} className="text-sm underline">Sab pehle jaisa karein (mehfooz karne tak asar nahi)</button>
      </div>
    </div>
  )
}

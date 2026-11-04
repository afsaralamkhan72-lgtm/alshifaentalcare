'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { BILL_TEMPLATES, RX_TEMPLATES, type PrintDefaults, type PrintLogo } from '@/lib/printTemplates'
import PrintLayoutSettings from '@/components/admin/PrintLayoutSettings'
import type { PrintLayout } from '@/lib/printLayout'

/** Logo ko khud chhota kar ke (compress) data URL banata hai: lamba kinara 600px, ~100KB se kam */
async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('Ye tasveer khul nahi saki'))
      i.src = url
    })
    const max = 600
    const k = Math.min(1, max / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * k))
    const h = Math.max(1, Math.round(img.height * k))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Tasveer nahi bani')
    ctx.drawImage(img, 0, 0, w, h)
    for (const q of [0.9, 0.8, 0.7, 0.55, 0.4]) {
      const d = c.toDataURL('image/webp', q)
      if (d.startsWith('data:image/webp') && d.length < 140_000) return d
    }
    const p = c.toDataURL('image/png')
    if (p.length < 200_000) return p
    throw new Error('Tasveer bohat bari hai, chhoti tasveer chunein')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function PrintSettings({
  logo, defaults, share, remind, layout,
}: {
  logo: PrintLogo
  defaults: PrintDefaults
  share: { days: number; require_last4: boolean }
  remind: { med_days_before: number }
  layout: PrintLayout
}) {
  const router = useRouter()
  const [data, setData] = useState<string | null>(logo.data)
  const [size, setSize] = useState(logo.size)
  const [badge, setBadge] = useState(logo.badge)
  const [df, setDf] = useState(defaults)
  const [days, setDays] = useState(String(share.days))
  const [l4, setL4] = useState(share.require_last4)
  const [rem, setRem] = useState(String(remind.med_days_before))
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function save(key: string, value: unknown, ok: string) {
    setBusy(key)
    setErr('')
    setMsg('')
    const { error } = await createClient().from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() })
    setBusy('')
    if (error) return setErr(friendlyError(error.message))
    setMsg(ok)
    router.refresh()
  }

  async function pick(f: File | undefined) {
    if (!f) return
    setErr('')
    setMsg('')
    try {
      setData(await compressImage(f))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Tasveer nahi chal saki')
    }
  }

  const card = 'rounded-2xl border border-clinic-teal/10 bg-white p-5'
  const input = 'rounded-lg border border-clinic-teal/25 px-3 py-2 text-sm'
  return (
    <div className="grid gap-5">
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}

      <section className={card}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Logo (bill aur prescription par)</h2>
        <p className="mt-1 text-sm text-clinic-ink/60">Tasveer chunein, software khud chhota kar ke theek size mein mehfooz karega. Phir slider se bara/chhota karein.</p>
        <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} className="mt-3 text-sm" />
        {data && (
          <>
            <label className="mt-4 grid gap-1 text-sm">
              Logo ka size: {size}
              <input type="range" min={30} max={250} value={size} onChange={(e) => setSize(Number(e.target.value))} />
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={badge} onChange={(e) => setBadge(e.target.checked)} className="h-4 w-4" />
              Logo ke peeche safed gola rakhein (rangeen patti par safed dabba na dikhe)
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-clinic-teal/15 bg-white p-3">
                <p className="mb-2 text-[11px] text-clinic-ink/50">Safed kaghaz par</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data} alt="logo" style={{ height: size, maxWidth: '100%', objectFit: 'contain' }} />
              </div>
              <div className="rounded-xl bg-red-600 p-3">
                <p className="mb-2 text-[11px] text-white/80">Rangeen patti par</p>
                <span className={badge ? 'inline-flex rounded-full bg-white p-2' : 'inline-flex'}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data} alt="logo" style={{ height: size, maxWidth: '100%', objectFit: 'contain' }} />
                </span>
              </div>
            </div>
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={!data || busy === 'print_logo'} onClick={() => save('print_logo', { data, size, badge }, 'Logo mehfooz ho gaya')} className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
            Logo mehfooz karein
          </button>
          {data && (
            <button type="button" onClick={() => setData(null)} className="text-sm text-red-600 underline">
              hatao
            </button>
          )}
        </div>
        {!data && logo.data && <p className="mt-2 text-xs text-amber-700">&quot;Logo mehfooz karein&quot; dabayein to purana logo hat jayega.</p>}
      </section>

      <PrintLayoutSettings initial={layout} logo={{ data, size, badge }} />

      <section className={card}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Pehle se chuna hua template</h2>
        <p className="mt-1 text-sm text-clinic-ink/60">Print kholte hi yehi aayega. Print ke waqt dropdown se badal bhi sakte hain.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">Bill
            <select value={df.bill} onChange={(e) => setDf({ ...df, bill: e.target.value })} className={input}>
              {BILL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Prescription (Dental)
            <select value={df.rx_dental} onChange={(e) => setDf({ ...df, rx_dental: e.target.value })} className={input}>
              {RX_TEMPLATES.filter((t) => t.dept !== 'homeopathic').map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Prescription (Homeopathic)
            <select value={df.rx_homeo} onChange={(e) => setDf({ ...df, rx_homeo: e.target.value })} className={input}>
              {RX_TEMPLATES.filter((t) => t.dept !== 'dental').map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        </div>
        <button type="button" disabled={busy === 'print_defaults'} onClick={() => save('print_defaults', df, 'Template mehfooz ho gaye')} className="mt-3 rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
          Mehfooz karein
        </button>
      </section>

      <section className={card}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">QR code (patient ka apna record)</h2>
        <p className="mt-1 text-sm text-clinic-ink/60">Prescription par QR scan karne se patient ko apna record aur hisaab dikhta hai. Har print par naya link banta hai jo kuch din baad khud band ho jata hai.</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">Link kitne din chale
            <input type="number" min={1} max={30} value={days} onChange={(e) => setDays(e.target.value)} className={`${input} w-20`} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={l4} onChange={(e) => setL4(e.target.checked)} className="h-4 w-4" />
            Kholne par phone ke aakhri 4 hindse poochein (hifazat)
          </label>
        </div>
        <button type="button" disabled={busy === 'share_cfg'} onClick={() => save('share_cfg', { days: Math.max(1, Math.min(30, Number(days) || 3)), require_last4: l4 }, 'QR ki settings mehfooz')} className="mt-3 rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
          Mehfooz karein
        </button>
      </section>

      <section className={card}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Dawa ki yaad-dahani</h2>
        <label className="mt-2 flex items-center gap-2 text-sm">Dawa khatam hone se kitne din pehle list mein aaye
          <input type="number" min={0} max={30} value={rem} onChange={(e) => setRem(e.target.value)} className={`${input} w-20`} />
        </label>
        <button type="button" disabled={busy === 'reminder_cfg'} onClick={() => save('reminder_cfg', { med_days_before: Math.max(0, Math.min(30, Number(rem) || 0)) }, 'Mehfooz ho gaya')} className="mt-3 rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
          Mehfooz karein
        </button>
      </section>
    </div>
  )
}

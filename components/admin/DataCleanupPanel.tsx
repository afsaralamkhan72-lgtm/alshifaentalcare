'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const LIMIT_MB = 500
const mb = (b: number) => (b / 1024 / 1024).toLocaleString('en-US', { maximumFractionDigits: 1 })

interface Usage {
  db_bytes: number
  tables: { name: string; bytes: number }[]
}
interface Preview {
  patients: number
  visits: number
  notes: number
  prescriptions: number
  photos: number
  charts: number
  invoices: number
  payments: number
}

const PERIODS: { k: string; l: string; months: number }[] = [
  { k: '6', l: '6 mahine se purana', months: 6 },
  { k: '12', l: '1 saal se purana', months: 12 },
  { k: '24', l: '2 saal se purana', months: 24 },
  { k: '36', l: '3 saal se purana', months: 36 },
]

function beforeDate(months: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

export default function DataCleanupPanel() {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [usageErr, setUsageErr] = useState('')
  const [period, setPeriod] = useState('24')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [money, setMoney] = useState(false)
  const [backedUp, setBackedUp] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)

  const loadUsage = useCallback(async () => {
    const { data, error } = await createClient().rpc('db_usage')
    if (error) {
      setUsageErr(/function|does not exist|schema cache/i.test(error.message) ? 'Ye hissa chalane ke liye pehle naya SQL (AL-SHIFA-SAFAI-SQL) Supabase mein chalana hai.' : error.message)
      return
    }
    setUsageErr('')
    setUsage(data as Usage)
  }, [])

  useEffect(() => {
    void loadUsage()
  }, [loadUsage])

  const months = PERIODS.find((x) => x.k === period)?.months ?? 24

  async function doPreview() {
    setMsg(null)
    setPreview(null)
    setTyped('')
    const { data, error } = await createClient().rpc('archive_preview', { p_before: beforeDate(months) })
    if (error) return setMsg({ ok: false, t: error.message })
    setPreview(data as Preview)
  }

  async function doArchive() {
    setBusy(true)
    setMsg(null)
    const sb = createClient()
    let total = 0
    let photos = 0
    try {
      for (let i = 0; i < 200; i++) {
        const { data, error } = await sb.rpc('archive_old_data', { p_before: beforeDate(months), p_confirm: typed, p_include_money: money, p_limit: 25 })
        if (error) throw new Error(error.message)
        const r = data as { done: number; remaining: number; photo_paths: string[] }
        total += r.done
        const paths = (r.photo_paths ?? []).filter(Boolean)
        for (let j = 0; j < paths.length; j += 50) {
          const chunk = paths.slice(j, j + 50)
          const rm = await sb.storage.from('patient-media').remove(chunk)
          if (!rm.error) photos += chunk.length
        }
        if (r.remaining === 0 || r.done === 0) break
      }
      setMsg({ ok: true, t: `${total} mareezon ka purana record hata kar summary card bana diya gaya. ${photos} photo/file bhi hati.` })
      setPreview(null)
      setTyped('')
      await loadUsage()
    } catch (e) {
      setMsg({ ok: false, t: 'Poora nahi hua: ' + (e instanceof Error ? e.message : 'koi masla') + (total ? ` (${total} mareez ho chuke hain)` : '') })
    }
    setBusy(false)
  }

  const used = usage ? usage.db_bytes / 1024 / 1024 : 0
  const pct = Math.min(100, Math.round((used / LIMIT_MB) * 100))
  const bar = pct >= 85 ? 'bg-red-500' : pct >= 65 ? 'bg-amber-500' : 'bg-clinic-teal'

  return (
    <div className="grid gap-4" data-testid="cleanup-panel">
      <div className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Jagah (Supabase free)</h2>
        {usageErr ? (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{usageErr}</p>
        ) : !usage ? (
          <p className="mt-2 text-sm text-clinic-ink/60">Dekh raha hoon…</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-clinic-ink">
              <span className="font-semibold">{mb(usage.db_bytes)} MB</span> bhara hua, {LIMIT_MB} MB mein se ({pct}%)
            </p>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-clinic-mint" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full ${bar}`} style={{ width: pct + '%' }} />
            </div>
            <p className="mt-2 text-[11px] text-clinic-ink/55">Ye sirf database ki jagah hai. Photos aur X-ray Supabase ki alag Storage mein hoti hain (free mein 1 GB), woh yahan nahi gini jati.</p>
            {usage.tables.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-semibold text-clinic-teal">Sab se zyada jagah kis ne li</summary>
                <ul className="mt-1 grid gap-0.5 text-xs text-clinic-ink/70">
                  {usage.tables.map((t) => (
                    <li key={t.name} className="flex justify-between gap-3">
                      <span>{t.name}</span>
                      <span>{mb(t.bytes)} MB</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>

      <div className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Purana data hatayein (summary card rakh kar)</h2>
        <p className="mt-1 text-sm text-clinic-ink/60">
          Jin mareezon ko aap ke chune hue arse se kisi ne nahi dekha aur jin ka koi baqaya ya chalti treatment nahi, un ki purani detail (visit notes, chart, nuskhe, photos) hat jati hai. Mareez ki ID, naam, phone aur ek summary card (kitni visits, kaun se kaam, kul bill) baqi rehte hain.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold text-clinic-ink" htmlFor="cleanup-period">Kitna purana:</label>
          <select id="cleanup-period" value={period} onChange={(e) => { setPeriod(e.target.value); setPreview(null) }} className="rounded-lg border border-clinic-teal/25 bg-white px-3 py-2 text-sm">
            {PERIODS.map((x) => <option key={x.k} value={x.k}>{x.l}</option>)}
          </select>
          <button type="button" onClick={doPreview} disabled={busy} data-testid="cleanup-preview" className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal disabled:opacity-40">
            Pehle dekhein kitna hatega
          </button>
        </div>

        {preview && (
          <div className="mt-4 grid gap-3 rounded-xl border border-amber-300 bg-amber-50/60 p-3" data-testid="cleanup-result">
            {preview.patients === 0 ? (
              <p className="text-sm text-clinic-ink">Is arse mein koi mareez nahi mila jis ka data hatana mumkin ho.</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-clinic-ink">{preview.patients} mareez, un ki {preview.visits} visits, {preview.prescriptions} nuskhe, {preview.charts} chart entries, {preview.photos} photos hatengi.</p>
                <label className="flex items-start gap-2 text-sm text-clinic-ink">
                  <input type="checkbox" checked={money} onChange={(e) => setMoney(e.target.checked)} className="mt-0.5 h-5 w-5" data-testid="cleanup-money" />
                  <span>
                    Paison ke record bhi hatao ({preview.invoices} bill, {preview.payments} payments). <span className="text-amber-800">Is se purane mahino ki income / hisaab ki report kam ho jayegi. Aam taur par isay band rehne dein, bill aur payment bahut chhote hote hain.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-clinic-ink">
                  <input type="checkbox" checked={backedUp} onChange={(e) => setBackedUp(e.target.checked)} className="mt-0.5 h-5 w-5" data-testid="cleanup-backup" />
                  <span>
                    Maine pehle <Link href="/admin/settings?s=backup" className="font-semibold text-clinic-teal underline">Backup</Link> le liya hai.
                  </span>
                </label>
                <p className="text-sm font-semibold text-red-700">Ye kaam wapas nahi ho sakta.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE likhein" aria-label="DELETE likhein" data-testid="cleanup-typed" className="rounded-lg border border-red-300 px-3 py-2 text-sm" />
                  <button
                    type="button"
                    onClick={doArchive}
                    disabled={busy || !backedUp || typed.trim().toUpperCase() !== 'DELETE'}
                    data-testid="cleanup-go"
                    className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {busy ? 'Ho raha hai, band na karein…' : 'Hata kar summary card rakhein'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {msg && <p className={`mt-3 rounded-lg p-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`} role="status">{msg.t}</p>}
      </div>
    </div>
  )
}

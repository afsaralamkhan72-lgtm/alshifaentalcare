'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'

export interface NotifyCfg {
  enabled: boolean
  appt: boolean
  appt_days: number
  due: boolean
  due_min: number
  due_every_days: number
}

/** Settings > Notification: Android app ke patients ko khud yaad-dahani (appointment, baqaya) */
export default function AppNotifySettings({ cfg, fcm, cron, patientDevices, staffDevices }: { cfg: NotifyCfg; fcm: boolean; cron: boolean; patientDevices: number; staffDevices: number }) {
  const router = useRouter()
  const [c, setC] = useState<NotifyCfg>(cfg)
  const [msg, setMsg] = useState('')
  const set = <K extends keyof NotifyCfg>(k: K, v: NotifyCfg[K]) => setC((x) => ({ ...x, [k]: v }))

  async function save() {
    setMsg('')
    const { error } = await createClient().from('site_settings').upsert({ key: 'app_notify_cfg', value: c }, { onConflict: 'key' })
    setMsg(error ? friendlyError(error.message) : 'Save ho gaya')
    router.refresh()
  }

  return (
    <section className="mt-8 rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold text-clinic-ink">Android app ki yaad-dahani (patients ko)</h2>
      <p className="mt-1 text-xs text-clinic-ink/55">Ye sirf un patients ko jati hai jin ke phone mein Al Shifa app hai aur unhon ne apna code ek baar likha hai.</p>

      <ul className="mt-3 grid gap-1 text-xs">
        <li className={fcm ? 'text-emerald-700' : 'text-amber-700'}>{fcm ? '✓ Firebase ki chaabi lagi hui hai' : '✗ Firebase ki chaabi nahi lagi (Vercel: FIREBASE_SERVICE_ACCOUNT). Jab tak na lage, kuch nahi jayega.'}</li>
        <li className={cron ? 'text-emerald-700' : 'text-amber-700'}>{cron ? '✓ Roz ka kaam (CRON_SECRET) set hai' : '✗ CRON_SECRET Vercel mein set nahi hai. Jab tak na ho, roz ka kaam nahi chalega.'}</li>
        <li className="text-clinic-ink/60">App wale phone: patients {patientDevices}, staff {staffDevices}</li>
      </ul>

      <label className="mt-4 flex items-center gap-2 text-sm font-medium text-clinic-ink">
        <input type="checkbox" checked={c.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Yaad-dahani chalu
      </label>

      <div className="mt-3 grid gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={c.appt} onChange={(e) => set('appt', e.target.checked)} /> Appointment se
          </label>
          <select value={c.appt_days} onChange={(e) => set('appt_days', Number(e.target.value))} className="rounded-lg border border-clinic-teal/20 px-2 py-1">
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          din pehle batayein
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={c.due} onChange={(e) => set('due', e.target.checked)} /> Baqaya ki yaad-dahani, jab baqaya
          </label>
          <input type="number" min={1} value={c.due_min} onChange={(e) => set('due_min', Number(e.target.value))} className="w-28 rounded-lg border border-clinic-teal/20 px-2 py-1" />
          Rs. ya zyada ho, har
          <input type="number" min={1} max={60} value={c.due_every_days} onChange={(e) => set('due_every_days', Number(e.target.value))} className="w-16 rounded-lg border border-clinic-teal/20 px-2 py-1" />
          din baad
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={save} className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white">Save</button>
        {msg && <span className="text-xs">{msg}</span>}
      </div>
    </section>
  )
}

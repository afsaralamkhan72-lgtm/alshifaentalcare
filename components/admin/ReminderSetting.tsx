'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/** Appointment kitne din pehle "Agle din" list aur Home par nazar aaye (default 3) */
export default function ReminderSetting({ days }: { days: number }) {
  const router = useRouter()
  const [d, setD] = useState(String(days))
  const [msg, setMsg] = useState('')
  async function save() {
    const { error } = await createClient()
      .from('site_settings')
      .upsert({ key: 'appointment_reminder_days', value: { days: Number(d) } }, { onConflict: 'key' })
    setMsg(error ? error.message : 'Save ho gaya')
    router.refresh()
  }
  return (
    <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-clinic-teal/10 pt-4 text-sm text-clinic-ink/70">
      Reminder: appointment se
      <select value={d} onChange={(e) => setD(e.target.value)} className="rounded-lg border border-clinic-teal/20 px-2 py-1">
        {[1, 2, 3, 4, 5, 7].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      din pehle dikhao
      <button onClick={save} className="rounded-full border border-clinic-teal px-3 py-1 text-xs font-semibold text-clinic-teal">
        Save
      </button>
      {msg && <span className="text-xs">{msg}</span>}
    </div>
  )
}

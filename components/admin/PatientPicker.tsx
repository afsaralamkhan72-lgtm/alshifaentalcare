'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type P = { id: string; full_name: string; mr_number: string | null; phone: string | null }

/** Patient chunne ka seedha dabba: naam / phone / MR likhein, patient par dabayein, us ka page (visit wala) khul jata hai. */
export default function PatientPicker({ label = '+ Naya (patient chunein)', hint = 'Patient ka naam, phone ya MR number likhein' }: { label?: string; hint?: string }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<P[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = q.trim().replace(/[%,()]/g, '')
    if (t.length < 2) {
      setRows([])
      return
    }
    setBusy(true)
    const h = setTimeout(async () => {
      const { data } = await createClient()
        .from('patients')
        .select('id, full_name, mr_number, phone')
        .is('deleted_at', null)
        .or(`full_name.ilike.%${t}%,phone.ilike.%${t}%,mr_number.ilike.%${t}%`)
        .order('full_name')
        .limit(8)
      setRows((data ?? []) as P[])
      setBusy(false)
    }, 300)
    return () => clearTimeout(h)
  }, [q])

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
        {label}
      </button>
    )
  }
  return (
    <div className="w-full rounded-2xl border border-clinic-teal/20 bg-white p-3 sm:w-96">
      <div className="flex items-center gap-2">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={hint} className="min-w-0 flex-1 rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm" />
        <button type="button" onClick={() => { setOpen(false); setQ('') }} className="text-sm text-clinic-ink/60">
          Band
        </button>
      </div>
      {busy && <p className="mt-2 text-xs text-clinic-ink/50">Dhoond raha hai...</p>}
      {!busy && q.trim().length >= 2 && rows.length === 0 && <p className="mt-2 text-xs text-clinic-ink/60">Koi patient nahi mila. <Link href="/admin/patients?new=1" className="font-semibold text-clinic-teal underline">Naya patient banayein</Link></p>}
      <ul className="mt-2 divide-y divide-clinic-teal/10">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/patients/${r.id}`} className="flex items-center justify-between gap-2 py-2.5 text-sm hover:text-clinic-teal">
              <span className="font-semibold">{r.full_name}</span>
              <span className="text-xs text-clinic-ink/55">{r.mr_number} {r.phone}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-clinic-ink/50">Patient ka page khulne par &quot;Naya visit shuru karein&quot; dabayein, dawa Qadam 3 mein likhi jati hai.</p>
    </div>
  )
}

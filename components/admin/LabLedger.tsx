'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { fmtDate } from '@/lib/karachi'

export interface LabGroup {
  name: string
  cases: number
  cost: number
  paid: number
  open: { id: string; case_number: string | null; work_type: string | null; patient: string | null; date: string; owed: number }[]
}
const rs = (n: number) => `Rs. ${Number(n).toLocaleString('en-US')}`

export default function LabLedger({ groups }: { groups: LabGroup[] }) {
  const router = useRouter()
  const [payFor, setPayFor] = useState('')
  const [amt, setAmt] = useState('')
  const [method, setMethod] = useState('cash')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const totalOwed = groups.reduce((s, g) => s + (g.cost - g.paid), 0)

  async function pay(g: LabGroup) {
    setBusy(true)
    setErr('')
    setMsg('')
    const { error } = await createClient().rpc('pay_lab_total', { p_lab_name: g.name, p_amount: Number(amt), p_method: method, p_key: key })
    setBusy(false)
    if (error) return setErr(friendlyError(error.message))
    setMsg(`${g.name} ko ${rs(Number(amt))} di gayi (kharche mein bhi likh di)`)
    setPayFor('')
    setAmt('')
    router.refresh()
  }

  if (groups.length === 0) return <p className="mt-4 rounded-2xl border border-dashed border-clinic-teal/20 p-8 text-center text-sm text-clinic-ink/50">Abhi kisi lab case par kharcha nahi likha.</p>

  return (
    <div className="mt-4 grid gap-3">
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm">
        Sab labs ko kul dena: <strong className="text-red-700">{rs(totalOwed)}</strong>
      </p>
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}
      {groups.map((g) => {
        const owed = Math.round((g.cost - g.paid) * 100) / 100
        return (
          <section key={g.name} className="rounded-2xl border border-clinic-teal/10 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-clinic-ink">{g.name}</h2>
                <p className="text-xs text-clinic-ink/55">{g.cases} case · kul kaam {rs(g.cost)} · di gayi {rs(g.paid)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-clinic-ink/60">Dena baqi</p>
                <p className={`font-display text-xl font-semibold ${owed > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{owed > 0 ? rs(owed) : 'saaf'}</p>
              </div>
            </div>
            {owed > 0 && (
              <>
                <ul className="mt-2 grid gap-1 text-sm">
                  {g.open.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/lab/${o.id}`} className="text-clinic-teal hover:underline">{o.case_number ?? 'case'}</Link>
                      <span className="text-xs text-clinic-ink/55">{fmtDate(o.date)} · {o.work_type ?? 'kaam'}{o.patient ? ` · ${o.patient}` : ''}</span>
                      <span className="ml-auto font-medium">{rs(o.owed)}</span>
                    </li>
                  ))}
                </ul>
                {payFor === g.name ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-clinic-teal/10 pt-3">
                    <input type="number" min={1} max={owed} autoFocus value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Kitne diye" className="w-32 rounded-lg border border-clinic-teal/30 px-3 py-1.5 text-sm" />
                    <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-lg border border-clinic-teal/30 px-2 py-1.5 text-sm">
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                      <option value="easypaisa">EasyPaisa</option>
                      <option value="jazzcash">JazzCash</option>
                    </select>
                    <button type="button" disabled={busy || !(Number(amt) > 0)} onClick={() => pay(g)} className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Save</button>
                    <button type="button" onClick={() => setPayFor('')} className="text-xs text-clinic-ink/60">Cancel</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setPayFor(g.name); setAmt(String(owed)); setKey(crypto.randomUUID()); setErr(''); setMsg('') }} className="mt-3 rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white">
                    Is lab ko payment
                  </button>
                )}
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}

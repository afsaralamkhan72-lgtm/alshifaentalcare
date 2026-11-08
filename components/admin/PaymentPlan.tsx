'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { fmtDate, money, todayKarachi } from '@/lib/karachi'
import { buildWhatsAppLink } from '@/lib/whatsapp'

export interface PlanItem { id: string; no: number; due_date: string; amount: number }
export interface Plan { id: string; patient_treatment_id: string; base_paid: number; planned_amount: number; items: PlanItem[] }


function addMonths(d: string, m: number): string {
  const [y, mo, da] = d.split('-').map(Number)
  const t = new Date(Date.UTC(y, mo - 1 + m, 1))
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()
  t.setUTCDate(Math.min(da, last))
  return t.toISOString().slice(0, 10)
}

function split(total: number, n: number, first: string): { due_date: string; amount: string }[] {
  const base = Math.floor((total * 100) / n) / 100
  const rows = Array.from({ length: n }, (_, i) => ({ due_date: addMonths(first, i), amount: String(base) }))
  const rest = Math.round((total - base * n) * 100) / 100
  if (rows.length) rows[rows.length - 1].amount = String(Math.round((base + rest) * 100) / 100)
  return rows
}

/** Qiston ka plan: baqaya ko tareekhon par baantna. Qist ka "ada hua" hona payments se khud nikalta hai. */
export default function PaymentPlan({
  treatmentId,
  paid,
  balance,
  plan,
  canEdit,
  patientName,
  phone,
}: {
  treatmentId: string
  paid: number
  balance: number
  plan: Plan | null
  canEdit: boolean
  patientName: string
  phone: string | null
}) {
  const router = useRouter()
  const today = todayKarachi()
  const [open, setOpen] = useState(false)
  const [n, setN] = useState(3)
  const [first, setFirst] = useState(addMonths(today, 1))
  const [rows, setRows] = useState<{ due_date: string; amount: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const sum = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  async function call(fn: string, args: Record<string, unknown>) {
    setBusy(true)
    setErr('')
    const { error } = await createClient().rpc(fn, args)
    setBusy(false)
    if (error) return setErr(friendlyError(error.message))
    setOpen(false)
    router.refresh()
  }

  if (!plan && !(canEdit && balance > 0)) return null

  if (plan) {
    let applied = balance <= 0 ? Infinity : Math.max(0, paid - plan.base_paid)
    const items = [...plan.items].sort((a, b) => a.no - b.no).map((it) => {
      const got = Math.min(applied, it.amount)
      applied -= got
      const left = Math.round((it.amount - got) * 100) / 100
      const state = left <= 0 ? 'paid' : it.due_date < today ? 'late' : it.due_date === today ? 'today' : 'wait'
      return { ...it, left, state }
    })
    const next = items.find((i) => i.left > 0)
    const remind = (i: (typeof items)[number]) =>
      phone
        ? buildWhatsAppLink({
            phoneOverride: phone,
            customMessage: `Assalam o Alaikum ${patientName},\n\nAap ki qist ${money(i.left)} ${fmtDate(i.due_date)} ko due hai. Meharbani kar ke ada kar dein.\n\nShukriya.`,
          })
        : null
    const CHIP: Record<string, string> = {
      paid: 'bg-emerald-100 text-emerald-800',
      late: 'bg-red-100 text-red-700',
      today: 'bg-amber-100 text-amber-800',
      wait: 'bg-gray-100 text-gray-600',
    }
    const LBL: Record<string, string> = { paid: 'ada', late: 'late', today: 'aaj due', wait: 'baqi' }
    return (
      <div className="mt-2 rounded-lg bg-sky-50 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-sky-900">Qiston ka plan</p>
          {!next && <span className="text-[11px] text-emerald-700">sab qistein ada</span>}
          {canEdit && (
            <button type="button" disabled={busy} onClick={() => confirm('Ye plan band karein? Payments par asar nahi hoga.') && call('cancel_payment_plan', { p_plan: plan.id })} className="ml-auto text-[11px] text-red-600">
              plan band karein
            </button>
          )}
        </div>
        {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
        <ul className="mt-1 grid gap-1">
          {items.map((i) => {
            const link = i.state !== 'paid' ? remind(i) : null
            return (
              <li key={i.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-5 text-xs text-clinic-ink/50">{i.no}.</span>
                <span>{fmtDate(i.due_date)}</span>
                <span className="font-medium">{money(i.amount)}</span>
                {i.state !== 'paid' && i.left < i.amount && <span className="text-[11px] text-clinic-ink/60">(baqi {money(i.left)})</span>}
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${CHIP[i.state]}`}>{LBL[i.state]}</span>
                {link && (i.state === 'late' || i.state === 'today') && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="ml-auto text-[11px] font-semibold text-emerald-700 underline">
                    WhatsApp yaad-dahani
                  </a>
                )}
              </li>
            )
          })}
        </ul>
        <p className="mt-1 text-[11px] text-clinic-ink/50">Payment lene par qistein khud ada hoti jati hain (pehli qist pehle).</p>
      </div>
    )
  }

  // koi plan nahi: banane ka form
  return (
    <div className="mt-2">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setRows(split(balance, n, first))
            setOpen(true)
          }}
          className="rounded-full border border-sky-600 px-3 py-1 text-xs font-semibold text-sky-700"
        >
          Qiston mein karein
        </button>
      ) : (
        <div className="rounded-lg bg-sky-50 p-2">
          <p className="text-xs font-semibold text-sky-900">Baqaya {money(balance)} ko qiston mein baantein</p>
          <div className="mt-1 flex flex-wrap items-end gap-2 text-xs">
            <label className="grid gap-0.5">
              Kitni qistein
              <input type="number" min={1} max={36} value={n} onChange={(e) => setN(Math.max(1, Math.min(36, Number(e.target.value) || 1)))} className="w-20 rounded border border-sky-300 px-2 py-1" />
            </label>
            <label className="grid gap-0.5">
              Pehli qist ki tareekh
              <input type="date" value={first} onChange={(e) => setFirst(e.target.value)} className="rounded border border-sky-300 px-2 py-1" />
            </label>
            <button type="button" onClick={() => setRows(split(balance, n, first))} className="rounded-full bg-sky-600 px-3 py-1 font-semibold text-white">
              Barabar baantein
            </button>
          </div>
          <ul className="mt-2 grid gap-1">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-xs text-clinic-ink/50">{i + 1}.</span>
                <input type="date" value={r.due_date} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, due_date: e.target.value } : x)))} className="rounded border border-sky-300 px-2 py-1 text-xs" />
                <input type="number" min={1} value={r.amount} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} className="w-28 rounded border border-sky-300 px-2 py-1 text-xs" />
              </li>
            ))}
          </ul>
          <p className={`mt-1 text-xs ${sum > balance ? 'text-red-600' : 'text-clinic-ink/60'}`}>
            Jama {money(sum)} / baqaya {money(balance)}
            {sum < balance ? ` (${money(balance - sum)} plan se bahar rahega)` : ''}
          </p>
          {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy || rows.length === 0 || sum <= 0 || sum > balance || rows.some((r) => !r.due_date || !(Number(r.amount) > 0))}
              onClick={() => call('create_payment_plan', { p_treatment: treatmentId, p_items: rows.map((r) => ({ due_date: r.due_date, amount: Number(r.amount) })) })}
              className="rounded-full bg-sky-600 px-4 py-1 text-xs font-semibold text-white disabled:opacity-40"
            >
              Plan mehfooz karein
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-clinic-ink/60">
              rehne dein
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

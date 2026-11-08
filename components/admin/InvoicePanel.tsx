'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'
import { money, fmtDate } from '@/lib/karachi'
import { buildBillText } from '@/lib/billText'
import { askReceipt } from '@/lib/receiptEvent'
import { openFresh } from '@/lib/openFresh'

export interface PayRow {
  id: string
  kind: 'payment' | 'refund'
  amount: number
  method: string | null
  paid_on: string
  note: string | null
  reversed: boolean
}

interface Props {
  invoiceId: string
  patientId: string
  invoiceNumber: string
  status: string
  total: number
  paid: number
  balance: number
  patientName: string
  patientPhone: string
  dueDate: string | null
  payments: PayRow[]
  subtotal: number
  discountAmount: number
  items: { name: string; tooth: string | null; qty: number; line_total: number }[]
}

const METHODS = [
  ['cash', 'Cash'],
  ['bank', 'Bank'],
  ['easypaisa', 'EasyPaisa'],
  ['jazzcash', 'JazzCash'],
]

/** Invoice par kaam: payment lena, ulti karna, cancel, print, WhatsApp. Sab database functions se. */
export default function InvoicePanel(p: Props) {
  const router = useRouter()
  const [amount, setAmount] = useState(p.balance > 0 ? String(p.balance) : '')
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [reason, setReason] = useState('')
  const [mode, setMode] = useState<null | 'void' | string>(null) // 'void' ya payment id
  const keyRef = useRef(crypto.randomUUID())
  const [limit, setLimit] = useState(0)
  const [disc, setDisc] = useState('')
  const [dreason, setDreason] = useState('')
  useEffect(() => {
    createClient().rpc('my_discount_limit').then(({ data }) => setLimit(Number(data ?? 0)))
  }, [])
  const discNum = Math.max(0, Number(disc) || 0)

  const active = p.status === 'active'

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    if (busy) return
    setBusy(true)
    setErr('')
    const { error } = await fn()
    setBusy(false)
    if (error) {
      setErr(error.message)
      return false
    }
    router.refresh()
    return true
  }

  async function receive() {
    const amt = Number(amount) || 0
    if (discNum > 0 && !dreason.trim()) {
      setErr('Discount ki wajah likhein')
      return
    }
    if (discNum + amt > p.balance) {
      setErr(`Discount + payment baqaya (${money(p.balance)}) se zyada hai`)
      return
    }
    const ok = await run(() =>
      discNum > 0
        ? createClient().rpc('collect_with_discount', {
            p_invoice_id: p.invoiceId,
            p_discount: discNum,
            p_amount: amt,
            p_method: method,
            p_reason: dreason.trim() || note || null,
            p_key: keyRef.current,
          })
        : createClient().rpc('collect_payment', {
            p_invoice_id: p.invoiceId,
            p_amount: amt,
            p_method: method,
            p_note: note || null,
            p_key: keyRef.current,
          })
    )
    if (ok) {
      if (amt > 0) askReceipt({ patientId: p.patientId, amount: amt, method })
      keyRef.current = crypto.randomUUID()
      setNote('')
      setAmount('')
      setDisc('')
      setDreason('')
    }
  }

  async function confirmReason() {
    if (!mode) return
    const ok = await run(() =>
      mode === 'void'
        ? createClient().rpc('void_invoice', { p_invoice_id: p.invoiceId, p_reason: reason })
        : createClient().rpc('reverse_payment', { p_payment_id: mode, p_reason: reason })
    )
    if (ok) {
      setMode(null)
      setReason('')
    }
  }

  const wa = buildWhatsAppLink({
    phoneOverride: p.patientPhone,
    customMessage: buildBillText({
      patientName: p.patientName,
      invoiceNumber: p.invoiceNumber,
      items: p.items,
      subtotal: p.subtotal,
      discountAmount: p.discountAmount,
      total: p.total,
      paid: p.paid,
      balance: p.balance,
      dueDate: p.dueDate,
      voided: p.status === 'void',
    }),
  })

  const inputClass =
    'rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <div className="print:hidden">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-sheet, #invoice-sheet * { visibility: visible; }
          #invoice-sheet { position: absolute; left: 0; top: 0; width: 100%; border: none; }
        }
      `}</style>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => window.print()} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
          Print / PDF
        </button>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full bg-whatsapp px-4 py-2 text-sm font-semibold text-white">
          WhatsApp
        </a>
        {active && (
          <button onClick={() => { setMode('void'); setReason(''); setErr('') }} className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">
            Invoice Cancel
          </button>
        )}
      </div>

      {active && p.balance > 0 && (
        <div className="mt-5 rounded-2xl border border-clinic-teal/10 bg-white p-4">
          <p className="font-display font-semibold text-clinic-ink">Payment mili</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={1} max={p.balance} placeholder="Raqam" className={`${inputClass} w-36`} />
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
              {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={`${inputClass} min-w-[160px] flex-1`} />
            {limit > 0 && (
              <div className="flex w-full flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={p.balance}
                  value={disc}
                  data-testid="bill-discount"
                  onChange={(e) => {
                    setDisc(e.target.value)
                    setAmount(String(Math.max(0, p.balance - (Number(e.target.value) || 0))))
                  }}
                  placeholder="Discount Rs. (poore bill par)"
                  className={`${inputClass} w-56`}
                />
                {discNum > 0 && (
                  <input value={dreason} onChange={(e) => setDreason(e.target.value)} placeholder="Discount ki wajah (zaroori)" className={`${inputClass} min-w-[160px] flex-1`} />
                )}
                <span className="text-[11px] text-clinic-ink/50">aap ki had {limit}%</span>
              </div>
            )}
            <button onClick={receive} disabled={busy || (!Number(amount) && !discNum)} className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {busy ? 'Save...' : 'Payment Save'}
            </button>
          </div>
        </div>
      )}

      {p.payments.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-clinic-mint text-left text-clinic-ink/60">
              <tr>
                <th className="px-4 py-2">Tareekh</th>
                <th className="px-4 py-2">Qism</th>
                <th className="px-4 py-2">Tareeqa</th>
                <th className="px-4 py-2 text-right">Raqam</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {p.payments.map((x) => (
                <tr key={x.id} className="border-t border-clinic-teal/10">
                  <td className="px-4 py-2">{fmtDate(x.paid_on)}</td>
                  <td className="px-4 py-2">
                    {x.kind === 'payment' ? (x.reversed ? 'Payment (ulti ho chuki)' : 'Payment') : 'Refund'}
                    {x.note ? <span className="ml-1 text-xs text-clinic-ink/50">· {x.note}</span> : null}
                  </td>
                  <td className="px-4 py-2 capitalize">{x.method ?? '—'}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${x.kind === 'refund' ? 'text-red-700' : x.reversed ? 'text-clinic-ink/40 line-through' : 'text-emerald-700'}`}>
                    {x.kind === 'refund' ? '−' : ''} {money(x.amount)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {x.kind === 'payment' && !x.reversed && (
                      <button
                        onClick={async () => {
                          setErr('')
                          try {
                            const q = new URLSearchParams({ patient: p.patientId, amount: String(x.amount), date: x.paid_on })
                            if (x.method) q.set('method', x.method)
                            await openFresh(`/api/messages/receipt?${q.toString()}`)
                          } catch (e) {
                            setErr(e instanceof Error ? e.message : 'Message nahi ban saka')
                          }
                        }}
                        className="mr-3 text-xs font-semibold text-whatsapp hover:underline"
                      >
                        Rasid bhejein
                      </button>
                    )}
                    {active && x.kind === 'payment' && !x.reversed && (
                      <button onClick={() => { setMode(x.id); setReason(''); setErr('') }} className="text-xs font-semibold text-red-700 hover:underline">
                        Ulti karein
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <p className="font-display text-lg font-semibold text-clinic-ink">
              {mode === 'void' ? 'Invoice cancel karein' : 'Payment ulti karein'}
            </p>
            <p className="mt-1 text-xs text-clinic-ink/60">
              {mode === 'void'
                ? 'Invoice mitta nahi, "cancel" ho jata hai aur mili hui payments wapas (refund) likh di jati hain.'
                : 'Payment mitti nahi, uski ulti (refund) entry banti hai aur baqaya wapas barh jata hai.'}
            </p>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Wajah (zaroori)" className={`${inputClass} mt-4 w-full`} autoFocus />
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={confirmReason} disabled={busy || !reason.trim()} className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {busy ? '...' : 'Confirm'}
              </button>
              <button onClick={() => setMode(null)} className="rounded-full border border-clinic-teal/30 px-5 py-2 text-sm text-clinic-ink/70">
                Wapas
              </button>
            </div>
          </div>
        </div>
      )}

      {err && !mode && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTemplates } from '@/lib/useTemplates'
import { messageLink } from '@/lib/messages'
import { todayKarachi, fmtDate, numFmt } from '@/lib/karachi'
import { askReceipt } from '@/lib/receiptEvent'

export interface DueRow {
  id: string
  treatment_name: string | null
  rate: number | null
  discount_amount: number | null
  amount: number
  balance_due: number
  due_date: string | null
  invoice_id?: string | null
  transaction_date: string
  treating_doctor: string | null
  patients: {
    id: string
    full_name: string
    phone: string
    mr_number: string | null
    portal_code: string | null
    deleted_at: string | null
  } | null
}

export default function DuesList({
  rows,
  tone,
  onPaid,
  openFirst,
}: {
  rows: DueRow[]
  tone?: 'overdue' | 'today'
  onPaid?: () => void
  /** aik hi baqaya ho to "Payment Mili" dabaye baghair seedha raqam wala form khol de */
  openFirst?: boolean
}) {
  const router = useRouter()
  const tpl = useTemplates()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [collecting, setCollecting] = useState<string | null>(null)
  const [received, setReceived] = useState('')
  const [method, setMethodRaw] = useState('cash')
  const setMethod = (m: string) => {
    setMethodRaw(m)
    try {
      localStorage.setItem('alshifa-pay-method', m)
    } catch {}
  }
  useEffect(() => {
    try {
      const m = localStorage.getItem('alshifa-pay-method')
      if (m && ['cash', 'bank', 'easypaisa', 'jazzcash'].includes(m)) setMethodRaw(m)
    } catch {}
  }, [])
  useEffect(() => {
    if (openFirst && rows.length === 1) {
      setCollecting(rows[0].id)
      setPayKey(crypto.randomUUID())
      setReceived('')
    }
    // sirf pehli dafa khulne par
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFirst, rows.length])
  const [error, setError] = useState('')
  const [payKey, setPayKey] = useState('')
  const [disc, setDisc] = useState('')
  const [reason, setReason] = useState('')
  const [limit, setLimit] = useState(0)
  useEffect(() => {
    createClient()
      .rpc('my_discount_limit')
      .then(({ data, error: e }) => setLimit(e || data == null ? 0 : Number(data)))
  }, [])

  async function collect(row: DueRow) {
    const got = Number(received || 0)
    const d = row.invoice_id ? Number(disc || 0) : 0
    if (got <= 0 && d <= 0) return
    if (d > 0 && !reason.trim()) {
      setError('Discount ki wajah likhein')
      return
    }
    if (got + d > Number(row.balance_due)) {
      setError(`Raqam baqaya (Rs. ${numFmt(Number(row.balance_due))}) se zyada hai`)
      return
    }

    setBusyId(row.id)
    setError('')
    const supabase = createClient()

    // Naye invoice ki payment: invoice + ledger + hisaab sab aik saath (database function)
    if (row.invoice_id) {
      const { error: rpcErr } =
        d > 0
          ? await supabase.rpc('collect_with_discount', {
              p_invoice_id: row.invoice_id,
              p_discount: d,
              p_amount: got,
              p_method: method,
              p_reason: reason.trim(),
              p_key: payKey || null,
            })
          : await supabase.rpc('collect_payment', {
              p_invoice_id: row.invoice_id,
              p_amount: got,
              p_method: method,
              p_key: payKey || null,
            })
      setBusyId(null)
      if (rpcErr) {
        setError(rpcErr.message)
        return
      }
      setCollecting(null)
      setReceived('')
      setDisc('')
      setReason('')
      if (row.patients?.id && got > 0) askReceipt({ patientId: row.patients.id, amount: got, method })
      router.refresh()
      onPaid?.()
      return
    }

    const { error: dueErr } = await supabase.rpc('pay_legacy_due', {
      p_tx_id: row.id,
      p_amount: got,
      p_method: method,
      p_idempotency_key: payKey || null,
    })
    if (dueErr) {
      setBusyId(null)
      setError(dueErr.message)
      return
    }

    setBusyId(null)
    setCollecting(null)
    setReceived('')
    if (row.patients?.id) askReceipt({ patientId: row.patients.id, amount: got, method })
    router.refresh()
    onPaid?.()
  }

  async function reschedule(row: DueRow, days: number) {
    setBusyId(row.id)
    const base = row.due_date ? new Date(row.due_date) : new Date()
    base.setDate(base.getDate() + days)

    const supabase = createClient()
    await supabase
      .from('transactions')
      .update({ due_date: base.toISOString().slice(0, 10) })
      .eq('id', row.id)

    setBusyId(null)
    router.refresh()
  }

  if (rows.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 px-4 py-6 text-center text-sm text-clinic-ink/60">
        Koi baqaya nahi.
      </div>
    )
  }

  const border =
    tone === 'overdue'
      ? 'border-red-200'
      : tone === 'today'
        ? 'border-amber-200'
        : 'border-clinic-teal/10'

  return (
    <div className="mt-3 grid gap-3">
      {rows.map((row) => {
        const p = row.patients
        if (!p) return null

        const portalUrl =
          typeof window !== 'undefined' && p.portal_code
            ? `${window.location.origin}/portal/${p.portal_code}`
            : ''

        const link = messageLink(
          'baqaya',
          { full_name: p.full_name, phone: p.phone },
          { balance: numFmt(Number(row.balance_due)) },
          tpl
        ) + (p.portal_code ? encodeURIComponent(`\n\nApna record dekhein:\n${portalUrl}\nCode: ${p.portal_code}`) : '')

        return (
          <div key={row.id} className={`rounded-2xl border bg-white p-4 ${border}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/patients/${p.id}`}
                  className="font-medium text-clinic-ink hover:text-clinic-teal"
                >
                  {p.full_name}
                </Link>
                <p className="text-xs text-clinic-ink/60">
                  {p.mr_number} · {p.phone}
                </p>
                <p className="mt-1 text-sm text-clinic-ink/80">
                  {row.treatment_name ?? 'Treatment'} · {fmtDate(row.transaction_date)}
                  {row.treating_doctor ? ` · ${row.treating_doctor}` : ''}
                </p>
                <p className="mt-0.5 text-xs text-clinic-ink/60">
                  Rate Rs. {Number(row.rate ?? 0).toLocaleString()}
                  {Number(row.discount_amount) > 0 &&
                    ` · Discount Rs. ${Number(row.discount_amount).toLocaleString()}`}
                  {` · Mila Rs. ${(Number(row.rate ?? 0) > 0 ? Math.max(0, Number(row.rate) - Number(row.discount_amount ?? 0) - Number(row.balance_due ?? 0)) : Number(row.amount)).toLocaleString()}`}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-medium text-clinic-ink/70">Baqaya</p>
                <p
                  className={`font-display text-xl font-semibold ${
                    tone === 'overdue' ? 'text-red-700' : 'text-clinic-teal'
                  }`}
                >
                  Rs. {Number(row.balance_due).toLocaleString()}
                </p>
                <p className="text-xs text-clinic-ink/60">Due: {fmtDate(row.due_date)}</p>
              </div>
            </div>

            {collecting === row.id ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-clinic-teal/10 pt-3">
                <input
                  type="number"
                  autoFocus
                  placeholder="Kitne mile"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  className="w-32 rounded-lg border border-clinic-teal/30 px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setReceived(String(Math.max(0, Number(row.balance_due) - (Number(disc) || 0))))}
                  className="rounded-full border border-clinic-teal/40 px-3 py-1.5 text-xs font-semibold text-clinic-teal"
                >
                  Poora
                </button>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="rounded-lg border border-clinic-teal/30 px-2 py-1.5 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                </select>
                <button
                  onClick={() => collect(row)}
                  disabled={busyId === row.id}
                  className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setCollecting(null)
                    setReceived('')
                    setDisc('')
                    setReason('')
                  }}
                  className="text-xs text-clinic-ink/60 hover:underline"
                >
                  Cancel
                </button>
                {row.invoice_id && limit > 0 && (
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="Discount Rs."
                      value={disc}
                      onChange={(e) => {
                        setDisc(e.target.value)
                        setReceived(String(Math.max(0, Number(row.balance_due) - (Number(e.target.value) || 0))))
                      }}
                      className="w-32 rounded-lg border border-clinic-teal/30 px-3 py-1.5 text-sm"
                    />
                    {Number(disc) > 0 && (
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Discount ki wajah"
                        className="min-w-0 flex-1 rounded-lg border border-clinic-teal/30 px-3 py-1.5 text-sm"
                      />
                    )}
                    <span className="text-[11px] text-clinic-ink/50">aap ki had {limit}%</span>
                  </div>
                )}
                {error && <p className="w-full text-xs text-red-600">{error}</p>}
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-clinic-teal/10 pt-3">
                <button
                  onClick={() => {
                    setCollecting(row.id)
                    setError('')
                    setPayKey(crypto.randomUUID())
                    setReceived(String(row.balance_due))
                  }}
                  className="rounded-full bg-clinic-teal px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Payment Mili
                </button>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Reminder
                </a>
                <a
                  href={`tel:${p.phone.replace(/[^0-9+]/g, '')}`}
                  className="rounded-full border border-clinic-teal px-3 py-1.5 text-xs font-semibold text-clinic-teal"
                >
                  Call
                </a>
                <button
                  onClick={() => reschedule(row, 7)}
                  disabled={busyId === row.id}
                  className="rounded-full bg-clinic-mint px-3 py-1.5 text-xs font-semibold text-clinic-teal disabled:opacity-40"
                >
                  +7 din
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

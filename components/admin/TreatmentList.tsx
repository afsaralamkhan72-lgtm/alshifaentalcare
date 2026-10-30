'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money, fmtDate } from '@/lib/karachi'

export interface TreatmentRow {
  id: string
  invoice_number: string
  invoice_date: string
  total: number
  paid_amount: number
  balance: number
  status: string
  items: { name: string; tooth: string | null }[]
}

const METHODS = [
  ['cash', 'Cash'],
  ['bank', 'Bank'],
  ['easypaisa', 'EasyPaisa'],
  ['jazzcash', 'JazzCash'],
]

function Card({ t }: { t: TreatmentRow }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [key, setKey] = useState(() => crypto.randomUUID())

  const void_ = t.status !== 'active'
  const title = t.items.map((i) => (i.tooth ? `${i.name} (daant ${i.tooth})` : i.name)).join(', ') || t.invoice_number

  async function pay() {
    const n = Number(amount)
    if (!n || n <= 0) return setError('Raqam likhein.')
    if (n > t.balance) return setError(`Baqaya sirf ${money(t.balance)} hai.`)
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.rpc('record_payment', {
      p_invoice_id: t.id,
      p_amount: n,
      p_method: method,
      p_note: null,
      p_idempotency_key: key,
    })
    setSaving(false)
    if (err) return setError(err.message)
    setKey(crypto.randomUUID())
    setAmount('')
    setOpen(false)
    router.refresh()
  }

  return (
    <div className={`rounded-xl border p-4 ${void_ ? 'border-clinic-ink/10 opacity-50' : 'border-clinic-teal/15'} bg-white`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-clinic-ink">{title}</p>
          <p className="text-xs text-clinic-ink/50">
            {fmtDate(t.invoice_date)} ·{' '}
            <Link href={`/admin/invoices/${t.id}`} className="text-clinic-teal hover:underline">
              {t.invoice_number}
            </Link>
            {void_ && ' · Cancel'}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-clinic-ink/60">
            {money(t.total)} · mile <span className="text-emerald-700">{money(t.paid_amount)}</span>
          </p>
          <p className={`font-semibold ${t.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {t.balance > 0 ? `Baqaya ${money(t.balance)}` : 'Poora ada'}
          </p>
        </div>
      </div>

      {!void_ && t.balance > 0 && (
        <div className="mt-3">
          {!open ? (
            <button
              onClick={() => {
                setAmount(String(t.balance))
                setOpen(true)
              }}
              className="rounded-full border border-clinic-teal px-4 py-1.5 text-sm font-semibold text-clinic-teal"
            >
              Is ka payment lo
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                max={t.balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-28 rounded-lg border border-clinic-teal/30 px-3 py-1.5 text-sm"
              />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="rounded-lg border border-clinic-teal/30 px-2 py-1.5 text-sm"
              >
                {METHODS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <button
                onClick={pay}
                disabled={saving}
                className="rounded-full bg-clinic-teal px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? '...' : 'Save'}
              </button>
              <button onClick={() => setOpen(false)} className="text-sm text-clinic-ink/50">
                Cancel
              </button>
            </div>
          )}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

export default function TreatmentList({
  rows,
  summary,
}: {
  rows: TreatmentRow[]
  /** Purane hisaab samet poora total (ledger se); na ho to sirf in cards ka */
  summary?: { total: number; paid: number; balance: number }
}) {
  const active = rows.filter((r) => r.status === 'active')
  const total = summary?.total ?? active.reduce((s, r) => s + r.total, 0)
  const paid = summary?.paid ?? active.reduce((s, r) => s + r.paid_amount, 0)
  const balance = summary?.balance ?? active.reduce((s, r) => s + r.balance, 0)

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Treatments aur Hisaab</h2>
        <p className="text-sm text-clinic-ink/60">
          Total {money(total)} · Mile <span className="text-emerald-700">{money(paid)}</span> ·{' '}
          <span className="font-semibold text-amber-700">Baqaya {money(balance)}</span>
        </p>
      </div>
      <div className="mt-3 grid gap-3">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-5 text-center text-sm text-clinic-ink/60">
            Upar chart mein daant chunein, treatment aur qeemat likhein. Yahan us ka hisaab aa jayega.
          </p>
        ) : (
          rows.map((r) => <Card key={r.id} t={r} />)
        )}
      </div>
    </div>
  )
}

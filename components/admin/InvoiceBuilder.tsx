'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  patientId: string
  total: number
  paid: number
}

export default function InvoiceBuilder({ patientId, total, paid }: Props) {
  const router = useRouter()
  const [discountPct, setDiscountPct] = useState('')
  const [receiving, setReceiving] = useState('')
  const [method, setMethod] = useState('cash')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const pct = Math.min(100, Math.max(0, Number(discountPct || 0)))
  const discount = Math.round((total * pct) / 100)
  const netTotal = total - discount
  const balance = Math.max(0, netTotal - paid)
  const receivingNum = Number(receiving || 0)
  const afterPayment = Math.max(0, balance - receivingNum)

  async function recordPayment() {
    if (receivingNum <= 0) return
    setSaving(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('transactions').insert({
      patient_id: patientId,
      type: 'income',
      category: 'treatment-payment',
      amount: receivingNum,
      payment_method: method,
      description: pct > 0 ? `Payment received (${pct}% discount applied)` : 'Payment received',
      transaction_date: new Date().toISOString().slice(0, 10),
      recorded_by: user?.id ?? null,
    })

    setSaving(false)
    setDone(true)
    setReceiving('')
    router.refresh()
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm text-clinic-ink outline-none focus:border-clinic-teal'

  return (
    <div className="mb-6 rounded-2xl border border-clinic-teal/20 bg-white p-5 print:hidden">
      <p className="font-display font-semibold text-clinic-ink">Bill Banayein</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-clinic-ink">Discount (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="0"
            value={discountPct}
            onChange={(e) => setDiscountPct(e.target.value)}
            className={inputClass}
          />
          {discount > 0 && (
            <p className="mt-1 text-xs font-medium text-clinic-teal">
              Rs. {discount.toLocaleString()} kam
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-clinic-ink">Aaj kitne rupay mile</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={receiving}
            onChange={(e) => setReceiving(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-clinic-ink">Payment Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputClass}
          >
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="easypaisa">EasyPaisa</option>
            <option value="jazzcash">JazzCash</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-clinic-mint p-4 sm:grid-cols-4">
        <Figure label="Total" value={total} />
        <Figure label="Discount" value={discount} tone="teal" />
        <Figure label="Baqaya" value={balance} tone="amber" />
        <Figure label="Payment ke baad" value={afterPayment} tone="ink" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={recordPayment}
          disabled={saving || receivingNum <= 0}
          className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Payment Record Karein'}
        </button>
        {done && <span className="text-sm font-medium text-emerald-700">Payment save ho gayi</span>}
      </div>
    </div>
  )
}

function Figure({
  label,
  value,
  tone = 'ink',
}: {
  label: string
  value: number
  tone?: 'teal' | 'amber' | 'ink'
}) {
  const color =
    tone === 'teal' ? 'text-clinic-teal' : tone === 'amber' ? 'text-amber-700' : 'text-clinic-ink'
  return (
    <div>
      <p className="text-xs font-medium text-clinic-ink/70">{label}</p>
      <p className={`mt-0.5 font-display text-lg font-semibold ${color}`}>
        Rs. {value.toLocaleString()}
      </p>
    </div>
  )
}

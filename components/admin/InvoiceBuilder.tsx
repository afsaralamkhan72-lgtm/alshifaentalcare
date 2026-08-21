'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  patientId: string
  /** Pehle likhe hue doctor names, suggestion ke liye */
  knownDoctors: string[]
  /** Pehle se maujood treatments, suggestion ke liye */
  knownTreatments: string[]
  /** Login kiye hue staff ka naam */
  defaultDoctor?: string | null
}

export default function InvoiceBuilder({
  patientId,
  knownDoctors,
  knownTreatments,
  defaultDoctor,
}: Props) {
  const router = useRouter()

  const [treatment, setTreatment] = useState('')
  const [doctorName, setDoctorName] = useState(defaultDoctor ?? '')
  const [rate, setRate] = useState('')
  const [discountPct, setDiscountPct] = useState('')
  const [receiving, setReceiving] = useState('')
  const [method, setMethod] = useState('cash')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const rateNum = Number(rate || 0)
  const pct = Math.min(100, Math.max(0, Number(discountPct || 0)))
  const discount = Math.round((rateNum * pct) / 100)
  const payable = Math.max(0, rateNum - discount)
  const receivingNum = Number(receiving || 0)
  const remaining = Math.max(0, payable - receivingNum)

  async function save() {
    if (rateNum <= 0) {
      setError('Rate likhna zaroori hai.')
      return
    }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: err } = await supabase.from('transactions').insert({
      patient_id: patientId,
      type: 'income',
      category: 'treatment',
      treatment_name: treatment.trim() || null,
      rate: rateNum,
      discount_pct: pct,
      discount_amount: discount,
      amount: receivingNum,
      balance_due: remaining,
      due_date: remaining > 0 ? dueDate || null : null,
      settled_at: remaining === 0 ? new Date().toISOString() : null,
      payment_method: method,
      treating_doctor: doctorName.trim() || null,
      transaction_date: date,
      recorded_by: user?.id ?? null,
    })

    if (err) {
      setSaving(false)
      setError('Save nahi hua. Kya phase10 wali SQL chalayi thi?')
      return
    }

    // Naam agli baar suggestion mein aa jayen
    if (doctorName.trim()) {
      await supabase.from('treating_doctors').insert({ name: doctorName.trim() })
    }

    setSaving(false)
    setTreatment('')
    setRate('')
    setDiscountPct('')
    setReceiving('')
    setDueDate('')
    router.refresh()
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm text-clinic-ink outline-none focus:border-clinic-teal'

  return (
    <div className="mb-6 rounded-2xl border border-clinic-teal/20 bg-white p-5 print:hidden">
      <p className="font-display font-semibold text-clinic-ink">Naya Treatment / Payment</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-clinic-ink">Treatment</label>
          <input
            list="known-treatments"
            placeholder="Scaling, RCT, Braces..."
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            className={inputClass}
          />
          <datalist id="known-treatments">
            {knownTreatments.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="text-sm font-medium text-clinic-ink">Kis doctor ne kiya</label>
          <input
            list="known-doctors"
            placeholder="Doctor ka naam"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            className={inputClass}
          />
          <datalist id="known-doctors">
            {knownDoctors.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="text-sm font-medium text-clinic-ink">Tareekh</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-clinic-ink">Rate (Rs.)</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className={inputClass}
          />
        </div>

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

        {remaining > 0 && (
          <div>
            <label className="text-sm font-medium text-clinic-ink">
              Baqi paise kab tak
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[7, 15, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    const x = new Date(date)
                    x.setDate(x.getDate() + d)
                    setDueDate(x.toISOString().slice(0, 10))
                  }}
                  className="rounded-full bg-clinic-mint px-2.5 py-1 text-xs font-semibold text-clinic-teal"
                >
                  +{d} din
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-clinic-mint p-4 sm:grid-cols-4">
        <Figure label="Rate" value={rateNum} />
        <Figure label="Discount" value={discount} tone="teal" />
        <Figure label="Dena hai" value={payable} />
        <Figure label="Baqaya" value={remaining} tone="amber" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm text-clinic-ink"
        >
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="easypaisa">EasyPaisa</option>
          <option value="jazzcash">JazzCash</option>
        </select>

        <button
          onClick={save}
          disabled={saving || rateNum <= 0}
          className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Bill Mein Add Karein'}
        </button>

        {error && <span className="text-sm text-red-600">{error}</span>}
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

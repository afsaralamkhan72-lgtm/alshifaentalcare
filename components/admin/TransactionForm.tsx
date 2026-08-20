'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface FormState {
  type: 'income' | 'expense'
  category: string
  amount: string
  payment_method: 'cash' | 'bank' | 'easypaisa' | 'jazzcash'
  description: string
  transaction_date: string
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const INITIAL: FormState = {
  type: 'income',
  category: '',
  amount: '',
  payment_method: 'cash',
  description: '',
  transaction_date: todayStr(),
}

const INCOME_CATEGORIES = ['Consultation', 'Dental Treatment', 'Homeopathic Treatment', 'Medicine Sale', 'Other']
const EXPENSE_CATEGORIES = ['Rent', 'Salary', 'Supplies', 'Utilities', 'Maintenance', 'Other']

export default function TransactionForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('transactions').insert({
      type: form.type,
      category: form.category || null,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      description: form.description || null,
      transaction_date: form.transaction_date,
      recorded_by: user?.id ?? null,
    })

    setSaving(false)
    if (insertError) {
      setError('Save nahi hua, dobara koshish karein.')
      return
    }

    setForm({ ...INITIAL, transaction_date: todayStr() })
    setOpen(false)
    router.refresh()
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const inputClass = 'rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light"
      >
        + Add Transaction
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">Add Transaction</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40 hover:text-clinic-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
              <div className="flex gap-2">
                {(['income', 'expense'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update('type', t)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                      form.type === t
                        ? t === 'income'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600 text-white'
                        : 'bg-clinic-mint text-clinic-ink/60'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <select value={form.category} onChange={(e) => update('category', e.target.value)} className={inputClass}>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                required
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount (Rs.)"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
                className={inputClass}
              />

              <select
                value={form.payment_method}
                onChange={(e) => update('payment_method', e.target.value as FormState['payment_method'])}
                className={inputClass}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="jazzcash">JazzCash</option>
              </select>

              <input
                type="date"
                value={form.transaction_date}
                onChange={(e) => update('transaction_date', e.target.value)}
                className={inputClass}
              />

              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={2}
                className={inputClass}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

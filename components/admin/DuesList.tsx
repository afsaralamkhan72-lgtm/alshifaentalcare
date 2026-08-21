'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'

export interface DueRow {
  id: string
  treatment_name: string | null
  rate: number | null
  discount_amount: number | null
  amount: number
  balance_due: number
  due_date: string | null
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

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB') : '—'
}

export default function DuesList({
  rows,
  tone,
}: {
  rows: DueRow[]
  tone?: 'overdue' | 'today'
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [collecting, setCollecting] = useState<string | null>(null)
  const [received, setReceived] = useState('')
  const [method, setMethod] = useState('cash')

  async function collect(row: DueRow) {
    const got = Number(received || 0)
    if (got <= 0) return

    setBusyId(row.id)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const newBalance = Math.max(0, Number(row.balance_due) - got)

    // Purani entry ka baqaya kam karein
    await supabase
      .from('transactions')
      .update({
        balance_due: newBalance,
        settled_at: newBalance === 0 ? new Date().toISOString() : null,
      })
      .eq('id', row.id)

    // Aur aaj ki payment alag entry ke tor par record karein
    await supabase.from('transactions').insert({
      patient_id: row.patients?.id,
      type: 'income',
      category: 'treatment',
      treatment_name: row.treatment_name
        ? `${row.treatment_name} (baqaya)`
        : 'Baqaya payment',
      amount: got,
      balance_due: 0,
      payment_method: method,
      treating_doctor: row.treating_doctor,
      transaction_date: new Date().toISOString().slice(0, 10),
      settled_at: new Date().toISOString(),
      recorded_by: user?.id ?? null,
    })

    setBusyId(null)
    setCollecting(null)
    setReceived('')
    router.refresh()
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

        const link = buildWhatsAppLink({
          phoneOverride: p.phone,
          customMessage: [
            `Assalam o Alaikum ${p.full_name},`,
            '',
            row.treatment_name
              ? `Aap ke ${row.treatment_name} ka baqaya Rs. ${Number(row.balance_due).toLocaleString()} hai.`
              : `Aap ka baqaya Rs. ${Number(row.balance_due).toLocaleString()} hai.`,
            row.due_date ? `Due date: ${fmt(row.due_date)}` : '',
            ...(p.portal_code
              ? ['', 'Apna record dekhein:', portalUrl, `Code: ${p.portal_code}`]
              : []),
            '',
            `${CLINIC.name} · ${CLINIC.phone.display}`,
          ]
            .filter(Boolean)
            .join('\n'),
        })

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
                  {row.treatment_name ?? 'Treatment'} · {fmt(row.transaction_date)}
                  {row.treating_doctor ? ` · ${row.treating_doctor}` : ''}
                </p>
                <p className="mt-0.5 text-xs text-clinic-ink/60">
                  Rate Rs. {Number(row.rate ?? 0).toLocaleString()}
                  {Number(row.discount_amount) > 0 &&
                    ` · Discount Rs. ${Number(row.discount_amount).toLocaleString()}`}
                  {` · Mila Rs. ${Number(row.amount).toLocaleString()}`}
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
                <p className="text-xs text-clinic-ink/60">Due: {fmt(row.due_date)}</p>
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
                  }}
                  className="text-xs text-clinic-ink/60 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-clinic-teal/10 pt-3">
                <button
                  onClick={() => {
                    setCollecting(row.id)
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

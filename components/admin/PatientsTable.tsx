'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'

export interface PatientRow {
  id: string
  mr_number: string | null
  full_name: string
  phone: string
  department: string
  age: number | null
  portal_code: string | null
  primary_doctor: string | null
}

interface Summary {
  total: number
  paid: number
  balance: number
  dues: {
    id: string
    treatment_name: string | null
    balance_due: number
    due_date: string | null
  }[]
  plan: {
    id: string
    title: string
    total_cost: number
    advance_paid: number
    months: number
    paidMonths: number
    nextDue: { id: string; installment_no: number; amount: number; due_date: string } | null
  } | null
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB') : '—'
}

export default function PatientsTable({
  patients,
  balances = {},
}: {
  patients: PatientRow[]
  knownDoctors?: string[]
  balances?: Record<string, number>
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<Record<string, Summary>>({})
  const [loading, setLoading] = useState<string | null>(null)

  // Payment form
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [target, setTarget] = useState('')
  const [saving, setSaving] = useState(false)

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    setAmount('')
    setTarget('')

    if (summaries[id]) return

    setLoading(id)
    const supabase = createClient()

    const [txRes, planRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, amount, rate, discount_amount, balance_due, due_date, treatment_name, settled_at')
        .eq('patient_id', id)
        .eq('type', 'income'),
      supabase
        .from('treatment_plans')
        .select('id, title, total_cost, advance_paid, duration_months')
        .eq('patient_id', id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle(),
    ])

    const tx = txRes.data ?? []
    const plan = planRes.data

    let planPart = null as Summary['plan']
    let planTotal = 0
    let planPaid = 0

    if (plan) {
      const { data: inst } = await supabase
        .from('installments')
        .select('id, installment_no, amount, paid_amount, due_date')
        .eq('plan_id', plan.id)
        .order('installment_no')

      const rows = inst ?? []
      planTotal = Number(plan.total_cost)
      // sirf progress dikhane ke liye, paisa transactions se ginti hai
      planPaid =
        Number(plan.advance_paid) + rows.reduce((s, r) => s + Number(r.paid_amount), 0)

      const next = rows.find((r) => Number(r.paid_amount) === 0)
      planPart = {
        id: plan.id,
        title: plan.title,
        total_cost: planTotal,
        advance_paid: Number(plan.advance_paid),
        months: plan.duration_months,
        paidMonths: rows.filter((r) => Number(r.paid_amount) > 0).length,
        nextDue: next
          ? {
              id: next.id,
              installment_no: next.installment_no,
              amount: Number(next.amount),
              due_date: next.due_date,
            }
          : null,
      }
    }

    // CHARGE = kaam ki qeemat, PAYMENT = jo paise mile
    const walkCharges = tx
      .filter((t) => t.rate != null)
      .reduce((s, t) => s + (Number(t.rate) - Number(t.discount_amount ?? 0)), 0)
    const allPaid = tx.reduce((s, t) => s + Number(t.amount), 0)

    const dues = tx
      .filter((t) => Number(t.balance_due) > 0 && !t.settled_at)
      .map((t) => ({
        id: t.id,
        treatment_name: t.treatment_name,
        balance_due: Number(t.balance_due),
        due_date: t.due_date,
      }))

    const total = planTotal + walkCharges
    const paid = allPaid

    setSummaries((prev) => ({
      ...prev,
      [id]: {
        total,
        paid,
        balance: Math.max(0, total - paid),
        dues,
        plan: planPart,
      },
    }))
    setLoading(null)
  }

  async function addPayment(patient: PatientRow) {
    const got = Number(amount || 0)
    if (got <= 0 || !target) return

    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const today = new Date().toISOString().slice(0, 10)
    const s = summaries[patient.id]

    if (target.startsWith('inst:')) {
      // Plan ka mahina
      const instId = target.slice(5)
      await supabase
        .from('installments')
        .update({
          paid_amount: got,
          paid_date: today,
          payment_method: method,
          recorded_by: user?.id ?? null,
        })
        .eq('id', instId)

      await supabase.from('transactions').insert({
        patient_id: patient.id,
        type: 'income',
        category: 'treatment',
        treatment_name: `${s?.plan?.title ?? 'Treatment'} (month ${s?.plan?.nextDue?.installment_no})`,
        amount: got,
        balance_due: 0,
        payment_method: method,
        treating_doctor: patient.primary_doctor,
        transaction_date: today,
        settled_at: new Date().toISOString(),
        recorded_by: user?.id ?? null,
      })
    } else {
      // Purana baqaya
      const due = s?.dues.find((d) => d.id === target)
      if (due) {
        const newBal = Math.max(0, due.balance_due - got)
        await supabase
          .from('transactions')
          .update({
            balance_due: newBal,
            settled_at: newBal === 0 ? new Date().toISOString() : null,
          })
          .eq('id', due.id)

        await supabase.from('transactions').insert({
          patient_id: patient.id,
          type: 'income',
          category: 'treatment',
          treatment_name: `${due.treatment_name ?? 'Treatment'} (baqaya)`,
          amount: got,
          balance_due: 0,
          payment_method: method,
          treating_doctor: patient.primary_doctor,
          transaction_date: today,
          settled_at: new Date().toISOString(),
          recorded_by: user?.id ?? null,
        })
      }
    }

    setSaving(false)
    setAmount('')
    setTarget('')
    setSummaries((prev) => {
      const copy = { ...prev }
      delete copy[patient.id]
      return copy
    })
    await toggle(patient.id)
    await toggle(patient.id)
    router.refresh()
  }

  return (
    <div className="grid gap-3">
      {patients.map((p) => {
        const isOpen = openId === p.id
        const s = summaries[p.id]

        return (
          <div
            key={p.id}
            className={`rounded-2xl border bg-white transition-colors ${
              isOpen ? 'border-clinic-teal' : 'border-clinic-teal/15'
            }`}
          >
            {/* Patient ka sara data aik hi line mein */}
            <div className="grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-clinic-mint font-display text-sm font-semibold text-clinic-teal">
                {p.full_name.slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-display text-base font-semibold text-clinic-ink">
                    {p.full_name}
                  </p>
                  <span className="rounded-full bg-clinic-teal/10 px-2 py-0.5 text-xs font-semibold capitalize text-clinic-teal">
                    {p.department}
                  </span>
                  <span className="text-xs text-clinic-ink/50">{p.mr_number}</span>
                </div>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-clinic-ink/70">
                  <span>{p.phone}</span>
                  {p.age != null && <span>{p.age} saal</span>}
                  {p.primary_doctor && <span>Dr: {p.primary_doctor}</span>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {balances[p.id] > 0 && (
                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-right">
                    <p className="text-[11px] font-medium text-amber-700/80">Baqaya</p>
                    <p className="font-display font-semibold text-amber-700">
                      Rs. {balances[p.id].toLocaleString()}
                    </p>
                  </div>
                )}
              <button
                onClick={() => toggle(p.id)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  isOpen
                    ? 'bg-clinic-ink text-white'
                    : 'bg-clinic-teal text-white hover:bg-clinic-teal-light'
                }`}
              >
                {isOpen ? 'Band Karein' : 'Open'}
              </button>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-clinic-teal/10 bg-clinic-sand/60 p-4">
                {loading === p.id || !s ? (
                  <p className="text-sm text-clinic-ink/60">Record khul raha hai...</p>
                ) : (
                  <PatientPanel
                    patient={p}
                    summary={s}
                    amount={amount}
                    setAmount={setAmount}
                    method={method}
                    setMethod={setMethod}
                    target={target}
                    setTarget={setTarget}
                    saving={saving}
                    onPay={() => addPayment(p)}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}

      {patients.length === 0 && (
        <div className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/60">
          Koi patient nahi mila.
        </div>
      )}
    </div>
  )
}

function PatientPanel({
  patient,
  summary,
  amount,
  setAmount,
  method,
  setMethod,
  target,
  setTarget,
  saving,
  onPay,
}: {
  patient: PatientRow
  summary: Summary
  amount: string
  setAmount: (v: string) => void
  method: string
  setMethod: (v: string) => void
  target: string
  setTarget: (v: string) => void
  saving: boolean
  onPay: () => void
}) {
  const portalUrl =
    typeof window !== 'undefined' && patient.portal_code
      ? `${window.location.origin}/portal/${patient.portal_code}`
      : ''

  const statement = buildWhatsAppLink({
    phoneOverride: patient.phone,
    customMessage: [
      `Assalam o Alaikum ${patient.full_name},`,
      '',
      `${CLINIC.name} se aap ka hisaab:`,
      `Total bill  : Rs. ${summary.total.toLocaleString()}`,
      `Aap ne diya : Rs. ${summary.paid.toLocaleString()}`,
      `Baqaya      : Rs. ${summary.balance.toLocaleString()}`,
      ...(patient.portal_code
        ? ['', 'Apna record dekhein:', portalUrl, `Code: ${patient.portal_code}`]
        : []),
      '',
      `${CLINIC.name} · ${CLINIC.phone.display}`,
    ].join('\n'),
  })

  const hasSomethingToPay = Boolean(summary.plan?.nextDue) || summary.dues.length > 0

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Hisaab */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-clinic-amber">Hisaab</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white p-2">
            <p className="text-[11px] text-clinic-ink/60">Total</p>
            <p className="font-display font-semibold text-clinic-ink">
              {summary.total.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-2">
            <p className="text-[11px] text-emerald-700/80">Diya</p>
            <p className="font-display font-semibold text-emerald-700">
              {summary.paid.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 p-2">
            <p className="text-[11px] text-amber-700/80">Baqaya</p>
            <p className="font-display font-semibold text-amber-700">
              {summary.balance.toLocaleString()}
            </p>
          </div>
        </div>

        {summary.plan && (
          <div className="mt-3 rounded-xl bg-white p-3">
            <p className="text-sm font-medium text-clinic-ink">{summary.plan.title}</p>
            <p className="mt-0.5 text-xs text-clinic-ink/70">
              {summary.plan.paidMonths} / {summary.plan.months} months paid
            </p>
            {summary.plan.nextDue && (
              <p className="mt-1 text-xs font-medium text-clinic-teal">
                Agla month: #{summary.plan.nextDue.installment_no} · Rs.{' '}
                {summary.plan.nextDue.amount.toLocaleString()} · {fmt(summary.plan.nextDue.due_date)}
              </p>
            )}
          </div>
        )}

        {patient.primary_doctor && (
          <p className="mt-2 text-xs text-clinic-ink/60">Doctor: {patient.primary_doctor}</p>
        )}
      </div>

      {/* Purane dues */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-clinic-amber">
          Purana Baqaya
        </p>
        {summary.dues.length === 0 ? (
          <p className="mt-2 rounded-xl bg-white p-3 text-sm text-clinic-ink/60">
            Koi purana baqaya nahi.
          </p>
        ) : (
          <div className="mt-2 grid gap-2">
            {summary.dues.map((d) => {
              const today = new Date().toISOString().slice(0, 10)
              const overdue = d.due_date && d.due_date < today
              return (
                <div
                  key={d.id}
                  className={`rounded-xl bg-white p-3 ${overdue ? 'border border-red-200' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-clinic-ink">{d.treatment_name ?? 'Treatment'}</p>
                    <p
                      className={`font-display font-semibold ${
                        overdue ? 'text-red-700' : 'text-clinic-ink'
                      }`}
                    >
                      Rs. {d.balance_due.toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-clinic-ink/60">
                    Due: {fmt(d.due_date)}
                    {overdue && ' · overdue'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Nayi payment */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-clinic-amber">
          Nayi Payment
        </p>

        {hasSomethingToPay ? (
          <div className="mt-2 grid gap-2 rounded-xl bg-white p-3">
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm"
            >
              <option value="">Kis cheez ki payment?</option>
              {summary.plan?.nextDue && (
                <option value={`inst:${summary.plan.nextDue.id}`}>
                  {summary.plan.title} · month #{summary.plan.nextDue.installment_no}
                </option>
              )}
              {summary.dues.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.treatment_name ?? 'Treatment'} · baqaya Rs.{' '}
                  {d.balance_due.toLocaleString()}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Kitne mile"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm"
              />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="rounded-lg border border-clinic-teal/30 px-2 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="jazzcash">JazzCash</option>
              </select>
            </div>

            <button
              onClick={onPay}
              disabled={saving || !target || Number(amount || 0) <= 0}
              className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Payment Save Karein'}
            </button>
          </div>
        ) : (
          <p className="mt-2 rounded-xl bg-white p-3 text-sm text-clinic-ink/60">
            Kuch baqaya nahi. Naya treatment add karne ke liye bill kholein.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/admin/patients/${patient.id}`}
            className="rounded-full bg-clinic-teal px-3 py-1.5 text-xs font-semibold text-white"
          >
            Profile
          </Link>
          <Link
            href={`/admin/patients/${patient.id}/invoice`}
            className="rounded-full border border-clinic-teal px-3 py-1.5 text-xs font-semibold text-clinic-teal"
          >
            Bill / PDF
          </Link>
          <a
            href={statement}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white"
          >
            Statement
          </a>
          <a
            href={`tel:${patient.phone.replace(/[^0-9+]/g, '')}`}
            className="rounded-full border border-clinic-teal/30 px-3 py-1.5 text-xs font-semibold text-clinic-ink/80"
          >
            Call
          </a>
        </div>
      </div>
    </div>
  )
}

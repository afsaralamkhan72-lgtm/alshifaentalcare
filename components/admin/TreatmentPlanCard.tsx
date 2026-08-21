'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'

export interface Installment {
  id: string
  installment_no: number
  due_date: string
  amount: number
  paid_amount: number
  paid_date: string | null
  payment_method: string | null
}

export interface Plan {
  id: string
  doctor_id?: string | null
  title: string
  total_cost: number
  advance_paid: number
  duration_months: number
  monthly_amount: number
  start_date: string
  status: string
}

interface Props {
  plan: Plan
  installments: Installment[]
  patientId: string
  patientName: string
  patientPhone: string
  portalCode?: string | null
}

export default function TreatmentPlanCard({
  plan,
  installments,
  patientId,
  patientName,
  patientPhone,
  portalCode,
}: Props) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [entered, setEntered] = useState('')
  const [visitNote, setVisitNote] = useState('')
  const [justPaid, setJustPaid] = useState<{
    month: string
    paid: number
    remaining: number
  } | null>(null)
  const [method, setMethod] = useState('cash')

  const paidTotal =
    Number(plan.advance_paid) + installments.reduce((s, i) => s + Number(i.paid_amount), 0)
  const remaining = Math.max(0, Number(plan.total_cost) - paidTotal)
  const paidCount = installments.filter((i) => Number(i.paid_amount) > 0).length

  const today = new Date().toISOString().slice(0, 10)
  const overdue = installments.filter((i) => Number(i.paid_amount) === 0 && i.due_date < today)

  // Ab tak jitna aana chahiye tha, us ke muqable kitna aaya
  const dueSoFar =
    installments
      .filter((i) => i.due_date <= today)
      .reduce((sum, i) => sum + Number(i.amount), 0) + Number(plan.advance_paid)
  const arrearsNow = Math.max(0, dueSoFar - paidTotal)
  const nextDue = installments.find((i) => Number(i.paid_amount) === 0)

  async function markPaid(inst: Installment, customAmount?: number, note?: string) {
    const got = customAmount ?? Number(inst.amount)
    if (got <= 0) return
    setBusyId(inst.id)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Record on the installment...
    await supabase
      .from('installments')
      .update({
        paid_amount: got,
        paid_date: today,
        payment_method: method,
        recorded_by: user?.id ?? null,
      })
      .eq('id', inst.id)

    // ...and mirror it into transactions so it shows up in Billing reports
    await supabase.from('transactions').insert({
      type: 'income',
      category: 'treatment-installment',
      amount: got,
      payment_method: method,
      doctor_id: plan.doctor_id ?? null,
      description: `${plan.title}, installment #${inst.installment_no} (${patientName})`,
      transaction_date: today,
      recorded_by: user?.id ?? null,
    })

    // Us din ka visit bhi record ho jaye, alag se likhna na pade
    if (note && note.trim()) {
      const next = new Date(today)
      next.setMonth(next.getMonth() + 1)
      await supabase.from('visit_notes').insert({
        patient_id: patientId,
        plan_id: plan.id,
        visit_date: today,
        procedure: note.trim(),
        next_visit: next.toISOString().slice(0, 10),
        doctor_id: user?.id ?? null,
      })
    }

    setJustPaid({
      month: new Date(inst.due_date).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      }),
      paid: got,
      remaining: Math.max(0, Number(plan.total_cost) - (paidTotal + got)),
    })

    setBusyId(null)
    setEditingId(null)
    setEntered('')
    setVisitNote('')
    router.refresh()
  }

  async function deletePlan() {
    if (
      !confirm(
        `"${plan.title}" plan aur us ki sab installments delete karein? Ye wapas nahi aayega.`
      )
    )
      return
    setBusyId('plan')
    const supabase = createClient()
    await supabase.from('treatment_plans').delete().eq('id', plan.id)
    setBusyId(null)
    setEditingId(null)
    setEntered('')
    router.refresh()
  }

  async function undoPaid(inst: Installment) {
    setBusyId(inst.id)
    const supabase = createClient()
    await supabase
      .from('installments')
      .update({ paid_amount: 0, paid_date: null, payment_method: null })
      .eq('id', inst.id)
    setBusyId(null)
    router.refresh()
  }

  const portalUrl =
    typeof window !== 'undefined' && portalCode
      ? `${window.location.origin}/portal/${portalCode}`
      : ''

  const reminderLink = buildWhatsAppLink({
    phoneOverride: patientPhone,
    customMessage: [
      `Assalam o Alaikum ${patientName},`,
      '',
      nextDue
        ? `Aap ki ${plan.title} ki installment #${nextDue.installment_no} (Rs. ${Number(nextDue.amount).toLocaleString()}) ${new Date(nextDue.due_date).toLocaleDateString('en-GB')} ko due hai.`
        : `Aap ka ${plan.title} plan mukammal ho gaya hai. Shukriya.`,
      ...(portalCode
        ? [
            '',
            'Apna poora record khud dekhein:',
            portalUrl,
            `Code: ${portalCode}`,
          ]
        : []),
      '',
      '${CLINIC.name} · ${CLINIC.phone.display}',
    ].join('\n'),
  })

  return (
    <div className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-clinic-ink">{plan.title}</p>
          <p className="mt-1 text-xs text-clinic-ink/50">
            {plan.duration_months} months · started{' '}
            {new Date(plan.start_date).toLocaleDateString('en-GB')} · expected Rs.{' '}
            {Number(plan.monthly_amount).toLocaleString()} per month
          </p>
          <p className="mt-1 text-xs text-clinic-ink/60">
            Patient jo bhi de, wahi likhein. Amount har mahine alag ho sakti hai.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={reminderLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-whatsapp px-4 py-2 text-xs font-semibold text-white"
          >
            Send Reminder
          </a>
          <button
            onClick={deletePlan}
            disabled={busyId === 'plan'}
            className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40"
          >
            Delete Plan
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl bg-clinic-mint p-3">
          <p className="text-xs text-clinic-ink/50">Total</p>
          <p className="font-display font-semibold text-clinic-ink">
            Rs. {Number(plan.total_cost).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-xs text-emerald-700/70">Paid</p>
          <p className="font-display font-semibold text-emerald-700">
            Rs. {paidTotal.toLocaleString()}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${arrearsNow > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <p className={`text-xs ${arrearsNow > 0 ? 'text-red-700/80' : 'text-emerald-700/80'}`}>
            Arrears {overdue.length > 0 ? `(${overdue.length} month)` : ''}
          </p>
          <p
            className={`font-display font-semibold ${
              arrearsNow > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {arrearsNow > 0 ? `Rs. ${arrearsNow.toLocaleString()}` : 'Clear'}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-xs text-amber-700/70">Kul Baqaya</p>
          <p className="font-display font-semibold text-amber-700">
            Rs. {remaining.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-clinic-mint p-3">
          <p className="text-xs text-clinic-ink/50">Progress</p>
          <p className="font-display font-semibold text-clinic-ink">
            {paidCount} / {plan.duration_months}
          </p>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-700">
            {overdue.length} installment(s) overdue hain
          </p>
        </div>
      )}

      {justPaid && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-display font-semibold text-emerald-800">
            {justPaid.month} ki payment save ho gayi
          </p>
          <p className="mt-1 text-sm text-emerald-800/80">
            Mile Rs. {justPaid.paid.toLocaleString()} · Baqaya Rs.{' '}
            {justPaid.remaining.toLocaleString()}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={buildWhatsAppLink({
                phoneOverride: patientPhone,
                customMessage: [
                  `Assalam o Alaikum ${patientName},`,
                  '',
                  `${plan.title}`,
                  `${justPaid.month} ki payment mil gayi: Rs. ${justPaid.paid.toLocaleString()}`,
                  `Ab tak diya : Rs. ${(paidTotal).toLocaleString()}`,
                  `Baqaya      : Rs. ${justPaid.remaining.toLocaleString()}`,
                  '',
                  'Shukriya.',
                ].join('\n'),
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-whatsapp px-4 py-2 text-sm font-semibold text-white"
            >
              Patient ko WhatsApp Karein
            </a>
            <button
              onClick={() => setJustPaid(null)}
              className="rounded-full px-4 py-2 text-sm text-emerald-800/70 hover:underline"
            >
              Band karein
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <label className="text-xs text-clinic-ink/50">Payment method:</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="rounded-lg border border-clinic-teal/20 px-2 py-1 text-xs"
        >
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="easypaisa">EasyPaisa</option>
          <option value="jazzcash">JazzCash</option>
        </select>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-clinic-mint text-left text-clinic-ink/60">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Due Date</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2 text-right">Balance</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Paid On</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let running = Number(plan.total_cost) - Number(plan.advance_paid)
              return installments.map((inst) => {
              const isPaid = Number(inst.paid_amount) > 0
              if (isPaid) running = Math.max(0, running - Number(inst.paid_amount))
              const runningBalance = running
              const isOverdue = !isPaid && inst.due_date < today

              return (
                <tr key={inst.id} className="border-t border-clinic-teal/10">
                  <td className="px-3 py-2">{inst.installment_no}</td>
                  <td className="px-3 py-2">
                    {new Date(inst.due_date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-3 py-2">
                    {isPaid ? (
                      <span className="font-semibold text-clinic-ink">
                        Rs. {Number(inst.paid_amount).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-clinic-ink/60">
                        Rs. {Number(inst.amount).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-clinic-ink/70">
                    Rs. {runningBalance.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700'
                          : isOverdue
                            ? 'bg-red-50 text-red-700'
                            : 'bg-clinic-mint text-clinic-ink/50'
                      }`}
                    >
                      {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-clinic-ink/60">
                    {inst.paid_date
                      ? `${new Date(inst.paid_date).toLocaleDateString('en-GB')} (${inst.payment_method})`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isPaid ? (
                      <button
                        onClick={() => undoPaid(inst)}
                        disabled={busyId === inst.id}
                        className="text-xs text-clinic-ink/40 hover:underline disabled:opacity-40"
                      >
                        Undo
                      </button>
                    ) : editingId === inst.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          autoFocus
                          value={entered}
                          onChange={(e) => setEntered(e.target.value)}
                          placeholder="Kitne mile"
                          className="w-24 rounded border border-clinic-teal/30 px-2 py-1 text-xs"
                        />
                        <input
                          value={visitNote}
                          onChange={(e) => setVisitNote(e.target.value)}
                          placeholder="Aaj kya kaam hua (optional)"
                          className="w-44 rounded border border-clinic-teal/30 px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => markPaid(inst, Number(entered || 0), visitNote)}
                          disabled={busyId === inst.id}
                          className="rounded-full bg-clinic-teal px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEntered('')
                          }}
                          className="text-xs text-clinic-ink/50"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(inst.id)
                          setEntered(String(inst.amount))
                        }}
                        disabled={busyId === inst.id}
                        className="rounded-full bg-clinic-teal px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Payment Mili
                      </button>
                    )}
                  </td>
                </tr>
              )
              })
            })()}
          </tbody>
        </table>
      </div>
    </div>
  )
}

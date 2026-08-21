'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { HISTORY_STEPS, type Field } from '@/lib/history-steps'
import DentalChart from './DentalChart'

type SectionData = Record<string, unknown>

export interface HistoryRecord {
  id?: string
  demographics?: SectionData
  medical_history?: SectionData
  dental_history?: SectionData
  chief_complaint?: SectionData
  clinical_exam?: SectionData
  radiographs?: SectionData
  diagnosis_plan?: SectionData
  consent?: SectionData
  completed_step?: number
  is_finalized?: boolean
}

interface Props {
  patientId: string
  patientName: string
  department: string
  initial: HistoryRecord | null
  dentalRecords: {
    id: string
    tooth_number: string
    condition: string
    notes: string | null
    treatment_date: string
  }[]
  /** true when the patient_history table doesn't exist yet */
  needsMigration?: boolean
}

// The dental chart is the final step, rendered after HISTORY_STEPS
const CHART_STEP_INDEX = HISTORY_STEPS.length

export default function PatientHistoryWizard({
  patientId,
  patientName,
  department,
  initial,
  dentalRecords,
  needsMigration = false,
}: Props) {
  const router = useRouter()

  const [data, setData] = useState<Record<string, SectionData>>(() => {
    const d: Record<string, SectionData> = {}
    for (const step of HISTORY_STEPS) {
      d[step.column] = (initial?.[step.column as keyof HistoryRecord] as SectionData) ?? {}
    }
    return d
  })

  const [stepIndex, setStepIndex] = useState(() => {
    const done = initial?.completed_step ?? 0
    return Math.min(done, HISTORY_STEPS.length - 1)
  })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [finalized, setFinalized] = useState(Boolean(initial?.is_finalized))

  if (needsMigration) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-semibold text-amber-800">Database setup baaki hai</p>
        <p className="mt-2 text-sm text-amber-700">
          Supabase → SQL Editor mein <strong>phase3.sql</strong> chalayein. Us ke baad Patient
          History yahan khul jayegi.
        </p>
      </div>
    )
  }

  // The visible wizard steps, plus the dental chart entry shown in the tracker
  const totalSteps = HISTORY_STEPS.length + 1
  const onChartStep = stepIndex === CHART_STEP_INDEX
  const step = HISTORY_STEPS[Math.min(stepIndex, HISTORY_STEPS.length - 1)]
  const section = data[step.column] ?? {}

  function setValue(key: string, value: unknown) {
    setData((prev) => ({
      ...prev,
      [step.column]: { ...prev[step.column], [key]: value },
    }))
  }

  function toggleCheckbox(key: string, option: string) {
    const current = (section[key] as string[]) ?? []
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option]
    setValue(key, next)
  }

  function visible(field: Field) {
    if (!field.showIf) return true
    const actual = section[field.showIf.key]
    return typeof actual === 'string' && field.showIf.equals.includes(actual)
  }

  async function save(nextIndex?: number, finalize = false) {
    setSaving(true)
    setStatus('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const completed = Math.max(initial?.completed_step ?? 0, stepIndex + 1)

    const payload: Record<string, unknown> = {
      patient_id: patientId,
      completed_step: completed,
      recorded_by: user?.id ?? null,
    }
    for (const s of HISTORY_STEPS) payload[s.column] = data[s.column]

    if (finalize) {
      payload.is_finalized = true
      payload.finalized_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('patient_history')
      .upsert(payload, { onConflict: 'patient_id' })

    setSaving(false)

    if (error) {
      setStatus('Could not save. Did you run the SETUP-ALL.sql?')
      return
    }

    if (finalize) {
      setFinalized(true)
      setStatus('History finalised — this is now the patient record.')
      router.refresh()
      return
    }

    setStatus('Saved')
    if (typeof nextIndex === 'number') setStepIndex(nextIndex)
    router.refresh()
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <div className="rounded-2xl border border-clinic-teal/10 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-clinic-ink">Patient History</p>
          <p className="text-sm text-clinic-ink/60">{patientName}</p>
        </div>
        {finalized && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Finalized
          </span>
        )}
      </div>

      {/* Step tracker */}
      <div className="mt-5 flex flex-wrap gap-2">
        {HISTORY_STEPS.map((s, i) => {
          const done = (initial?.completed_step ?? 0) > i
          const active = i === stepIndex
          return (
            <button
              key={s.column}
              onClick={() => setStepIndex(i)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-clinic-teal text-white'
                  : done
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-clinic-mint text-clinic-ink/50'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  active ? 'bg-white/20' : 'bg-white/60'
                }`}
              >
                {i + 1}
              </span>
              {s.title}
            </button>
          )
        })}

        <button
          onClick={() => setStepIndex(CHART_STEP_INDEX)}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            onChartStep ? 'bg-clinic-teal text-white' : 'bg-clinic-mint text-clinic-ink/50'
          }`}
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
              onChartStep ? 'bg-white/20' : 'bg-white/60'
            }`}
          >
            {totalSteps}
          </span>
          Dental Chart
        </button>
      </div>

      {/* Current step */}
      <div className="mt-6 border-t border-clinic-teal/10 pt-6">
        <p className="font-display font-semibold text-clinic-ink">
          {onChartStep ? 'Dental Chart' : step.title}
        </p>

        {onChartStep ? (
          department === 'dental' ? (
            <div className="mt-4">
              <DentalChart patientId={patientId} initialRecords={dentalRecords} />
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-clinic-mint/60 p-6 text-center text-sm text-clinic-ink/60">
              Dental chart homeopathic patients ke liye applicable nahi. Finalize dabayein.
            </p>
          )
        ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {step.fields.filter(visible).map((field) => (
            <div key={field.key} className={field.full ? 'sm:col-span-2' : ''}>
              <label className="text-sm font-medium text-clinic-ink">{field.label}</label>

              {field.type === 'radio' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {field.options?.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setValue(field.key, opt)}
                      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                        section[field.key] === opt
                          ? 'bg-clinic-teal text-white'
                          : 'bg-clinic-mint text-clinic-ink/70 hover:bg-clinic-teal/20'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {field.type === 'checkboxes' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {field.options?.map((opt) => {
                    const selected = ((section[field.key] as string[]) ?? []).includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleCheckbox(field.key, opt)}
                        className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                          selected
                            ? 'bg-clinic-teal text-white'
                            : 'bg-clinic-mint text-clinic-ink/70 hover:bg-clinic-teal/20'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              )}

              {field.type === 'scale' && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Array.from({ length: 11 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setValue(field.key, n)}
                      className={`h-8 w-8 rounded-full text-xs font-semibold transition-colors ${
                        section[field.key] === n
                          ? 'bg-clinic-amber text-white'
                          : 'bg-clinic-mint text-clinic-ink/60'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {(field.type === 'text' || field.type === 'number' || field.type === 'date') && (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  placeholder={field.placeholder}
                  value={(section[field.key] as string) ?? ''}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  className={inputClass}
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  rows={3}
                  placeholder={field.placeholder}
                  value={(section[field.key] as string) ?? ''}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  className={inputClass}
                />
              )}
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-clinic-teal/10 pt-4">
        <button
          onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
          disabled={stepIndex === 0}
          className="rounded-full border border-clinic-teal/20 px-4 py-2 text-sm text-clinic-ink/70 disabled:opacity-40"
        >
          ← Previous
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {status && <span className="text-xs text-clinic-ink/50">{status}</span>}

          {!onChartStep && (
            <button
              onClick={() => save()}
              disabled={saving}
              className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}

          {stepIndex < CHART_STEP_INDEX ? (
            <button
              onClick={() => save(stepIndex + 1)}
              disabled={saving}
              className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save &amp; Next →
            </button>
          ) : (
            <button
              onClick={() => save(undefined, true)}
              disabled={saving}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Finalize History
            </button>
          )}
        </div>
      </div>

    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DentalRecord {
  id: string
  tooth_number: string
  condition: string
  notes: string | null
  treatment_date: string
}

interface DentalChartProps {
  patientId: string
  initialRecords: DentalRecord[]
}

const CONDITIONS = [
  { value: 'healthy', label: 'Healthy', dot: 'bg-white border border-clinic-ink/30' },
  { value: 'missing', label: 'Missing', dot: 'bg-clinic-ink/30' },
  { value: 'caries', label: 'Caries', dot: 'bg-red-500' },
  { value: 'filling', label: 'Filling', dot: 'bg-blue-500' },
  { value: 'rct', label: 'RCT', dot: 'bg-purple-500' },
  { value: 'crown', label: 'Crown', dot: 'bg-amber-500' },
  { value: 'bridge', label: 'Bridge', dot: 'bg-teal-500' },
  { value: 'implant', label: 'Implant', dot: 'bg-green-500' },
  { value: 'scaling', label: 'Scaling', dot: 'bg-cyan-500' },
  { value: 'extraction', label: 'Extraction', dot: 'bg-gray-500' },
  { value: 'other', label: 'Other', dot: 'bg-clinic-amber/60' },
] as const

const TOOTH_STYLES: Record<string, string> = {
  healthy: 'bg-white border-clinic-ink/15 text-clinic-ink/40',
  missing: 'bg-clinic-ink/10 border-clinic-ink/20 text-clinic-ink/30 line-through',
  caries: 'bg-red-50 border-red-400 text-red-700',
  filling: 'bg-blue-50 border-blue-400 text-blue-700',
  rct: 'bg-purple-50 border-purple-400 text-purple-700',
  crown: 'bg-amber-50 border-amber-500 text-amber-700',
  bridge: 'bg-teal-50 border-teal-500 text-teal-700',
  implant: 'bg-green-50 border-green-500 text-green-700',
  scaling: 'bg-cyan-50 border-cyan-400 text-cyan-700',
  extraction: 'bg-gray-100 border-gray-400 text-gray-500 line-through',
  other: 'bg-clinic-amber/10 border-clinic-amber/50 text-clinic-amber',
}

// FDI notation, arranged so each tooth visually lines up with its
// counterpart in the opposite arch (e.g. 48 sits under 18).
const UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11']
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28']
const LOWER_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41']
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38']

function getLatestForTooth(records: DentalRecord[], tooth: string) {
  const matches = records.filter((r) => r.tooth_number === tooth)
  if (matches.length === 0) return null
  return matches.sort(
    (a, b) => new Date(b.treatment_date).getTime() - new Date(a.treatment_date).getTime()
  )[0]
}

export default function DentalChart({ patientId, initialRecords }: DentalChartProps) {
  const [records, setRecords] = useState<DentalRecord[]>(initialRecords)
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null)
  const [condition, setCondition] = useState('healthy')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function openTooth(tooth: string) {
    setSelectedTooth(tooth)
    const latest = getLatestForTooth(records, tooth)
    setCondition(latest?.condition ?? 'healthy')
    setNotes('')
  }

  async function handleSave() {
    if (!selectedTooth) return
    setSaving(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('dental_chart')
      .insert({
        patient_id: patientId,
        tooth_number: selectedTooth,
        condition,
        notes: notes || null,
        recorded_by: user?.id ?? null,
      })
      .select()
      .single()

    setSaving(false)
    if (!error && data) {
      setRecords((prev) => [...prev, data as DentalRecord])
      setNotes('')
    }
  }

  function renderRow(teeth: string[]) {
    return (
      <div className="flex gap-1">
        {teeth.map((tooth) => {
          const latest = getLatestForTooth(records, tooth)
          const cond = latest?.condition ?? 'healthy'
          const style = TOOTH_STYLES[cond] ?? TOOTH_STYLES.healthy
          const active = selectedTooth === tooth

          return (
            <button
              key={tooth}
              onClick={() => openTooth(tooth)}
              className={`flex h-12 w-9 flex-col items-center justify-center rounded-lg border text-[10px] font-semibold transition-transform hover:scale-105 sm:h-14 sm:w-11 sm:text-xs ${style} ${
                active ? 'ring-2 ring-clinic-teal ring-offset-1' : ''
              }`}
            >
              {tooth}
            </button>
          )
        })}
      </div>
    )
  }

  const history = selectedTooth
    ? records
        .filter((r) => r.tooth_number === selectedTooth)
        .sort((a, b) => new Date(b.treatment_date).getTime() - new Date(a.treatment_date).getTime())
    : []

  return (
    <div className="rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-6">
      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-3">
        {CONDITIONS.map((c) => (
          <span key={c.value} className="flex items-center gap-1.5 text-xs text-clinic-ink/60">
            <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
            {c.label}
          </span>
        ))}
      </div>

      {/* Tooth chart */}
      <div className="overflow-x-auto">
        <div className="mx-auto flex w-max flex-col items-center gap-2">
          <div className="flex gap-3">
            {renderRow(UPPER_RIGHT)}
            <div className="w-px bg-clinic-teal/20" />
            {renderRow(UPPER_LEFT)}
          </div>
          <div className="h-px w-full bg-clinic-teal/10" />
          <div className="flex gap-3">
            {renderRow(LOWER_RIGHT)}
            <div className="w-px bg-clinic-teal/20" />
            {renderRow(LOWER_LEFT)}
          </div>
        </div>
      </div>

      {/* Selected tooth detail panel */}
      {selectedTooth && (
        <div className="mt-6 rounded-xl bg-clinic-mint/50 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display font-semibold text-clinic-ink">Tooth #{selectedTooth}</p>
            <button onClick={() => setSelectedTooth(null)} className="text-sm text-clinic-ink/40 hover:text-clinic-ink">
              ✕
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-clinic-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Record'}
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="mt-3 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
          />

          {history.length > 0 && (
            <div className="mt-4 border-t border-clinic-teal/10 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-clinic-ink/40">History</p>
              <div className="mt-2 flex flex-col gap-2">
                {history.map((h) => (
                  <div key={h.id} className="rounded-lg bg-white px-3 py-2 text-xs">
                    <span className="font-semibold capitalize text-clinic-teal">{h.condition}</span>
                    <span className="ml-2 text-clinic-ink/40">
                      {new Date(h.treatment_date).toLocaleDateString('en-GB')}
                    </span>
                    {h.notes && <p className="mt-1 text-clinic-ink/60">{h.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

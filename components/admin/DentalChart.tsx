'use client'

import { localNumber, toothLabel, isWisdom } from '@/lib/teeth'
import ToothShape from './ToothShape'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addDays, todayKarachi } from '@/lib/karachi'

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
  /** Sirf owner ke liye: treatment chunte hi qeemat likh kar bill ban jaye */
  canBill?: boolean
  defaultDoctor?: string | null
  catalog?: { id: string; name: string; price: number }[]
}

/** Jin conditions par paisa lagta hai (baaqi sirf chart ka nishan hain) */
const BILLABLE = ['filling', 'rct', 'crown', 'bridge', 'implant', 'scaling', 'extraction', 'denture', 'other']

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
  { value: 'fracture', label: 'Fracture', dot: 'bg-orange-500' },
  { value: 'mobility', label: 'Mobility', dot: 'bg-pink-500' },
  { value: 'pocket', label: 'Pocket Depth', dot: 'bg-indigo-400' },
  { value: 'bleeding', label: 'Bleeding', dot: 'bg-rose-600' },
  { value: 'sinus', label: 'Sinus', dot: 'bg-sky-600' },
  { value: 'periapical', label: 'Periapical Problem', dot: 'bg-violet-600' },
  { value: 'denture', label: 'Denture', dot: 'bg-stone-400' },
  { value: 'implant_planning', label: 'Implant Planning', dot: 'bg-lime-500' },
  { value: 'recession', label: 'Recession', dot: 'bg-fuchsia-500' },
  { value: 'furcation', label: 'Furcation', dot: 'bg-yellow-600' },
  { value: 'plaque', label: 'Plaque', dot: 'bg-amber-300' },
  { value: 'calculus', label: 'Calculus', dot: 'bg-yellow-800' },
  { value: 'other', label: 'Other', dot: 'bg-clinic-amber/60' },
] as const

/** Daant ke andar bharne ka rang, har condition ke liye */
const TOOTH_FILL: Record<string, string> = {
  healthy: '#FFFFFF',
  missing: '#E5E3DF',
  caries: '#FCA5A5',
  filling: '#93C5FD',
  rct: '#C4B5FD',
  crown: '#FCD34D',
  bridge: '#5EEAD4',
  implant: '#86EFAC',
  scaling: '#A5F3FC',
  extraction: '#D1D5DB',
  fracture: '#FDBA74',
  mobility: '#F9A8D4',
  pocket: '#A5B4FC',
  bleeding: '#FB7185',
  sinus: '#7DD3FC',
  periapical: '#C084FC',
  denture: '#D6D3D1',
  implant_planning: '#BEF264',
  recession: '#F0ABFC',
  furcation: '#FDE047',
  plaque: '#FCD34D',
  calculus: '#CA8A04',
  other: '#FBCFA3',
}

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

export default function DentalChart({
  patientId,
  initialRecords,
  canBill = false,
  defaultDoctor = null,
  catalog = [],
}: DentalChartProps) {
  const router = useRouter()
  const [price, setPrice] = useState('')
  const [paidNow, setPaidNow] = useState('')
  const [method, setMethod] = useState('cash')
  const [billError, setBillError] = useState('')
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
    setPrice('')
    setPaidNow('')
    setBillError('')
  }

  function labelOf(c: string) {
    return CONDITIONS.find((x) => x.value === c)?.label ?? c
  }

  function pickCondition(c: string) {
    setCondition(c)
    // List price mil jaye to khud bhar do, doctor badal sakta hai
    const hit = catalog.find((x) => x.name.toLowerCase().includes(labelOf(c).toLowerCase()))
    setPrice(hit && BILLABLE.includes(c) ? String(hit.price) : '')
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

    if (error || !data) {
      setSaving(false)
      return
    }
    setRecords((prev) => [...prev, data as DentalRecord])
    setNotes('')

    // Qeemat likhi ho to isi treatment ka apna bill khud ban jaye
    const priceNum = Number(price) || 0
    if (canBill && BILLABLE.includes(condition) && priceNum > 0) {
      const paidNum = Math.min(priceNum, Math.max(0, Number(paidNow) || 0))
      const hit = catalog.find((x) => x.name.toLowerCase().includes(labelOf(condition).toLowerCase()))
      const { error: invErr } = await supabase.rpc('create_invoice', {
        p_patient_id: patientId,
        p_items: [
          {
            treatment_id: hit?.id ?? null,
            name: labelOf(condition),
            tooth: toothLabel(selectedTooth),
            qty: 1,
            unit_price: priceNum,
          },
        ],
        p_discount_percent: 0,
        p_paid: paidNum,
        p_method: method,
        p_doctor: defaultDoctor,
        p_due_date: priceNum - paidNum > 0 ? addDays(todayKarachi(), 7) : null,
        p_notes: null,
        p_idempotency_key: crypto.randomUUID(),
      })
      if (invErr) {
        setSaving(false)
        setBillError(`Chart save ho gaya, magar bill nahi bana: ${invErr.message}`)
        return
      }
      setPrice('')
      setPaidNow('')
      router.refresh()
    }
    setSaving(false)
  }

  function renderRow(teeth: string[], upper = true) {
    return (
      <div className="flex gap-1">
        {teeth.map((tooth) => {
          const latest = getLatestForTooth(records, tooth)
          const cond = latest?.condition ?? 'healthy'
          const active = selectedTooth === tooth

          return (
            <button
              key={tooth}
              onClick={() => openTooth(tooth)}
              title={`${toothLabel(tooth)}${cond !== 'healthy' ? ` — ${cond}` : ''}`}
              className={`flex shrink-0 flex-col items-center rounded-lg px-0.5 py-1 transition-transform hover:scale-105 ${
                active ? 'bg-clinic-teal/15 ring-2 ring-clinic-teal' : ''
              }`}
            >
              {upper && (
                <span className="text-[11px] font-semibold text-clinic-ink/60">
                  {localNumber(tooth)}
                </span>
              )}
              <ToothShape
                number={localNumber(tooth)}
                upper={upper}
                selected={active}
                fill={cond === 'healthy' ? undefined : (TOOTH_FILL[cond] ?? undefined)}
                size={26}
              />
              {!upper && (
                <span className="text-[11px] font-semibold text-clinic-ink/60">
                  {localNumber(tooth)}
                </span>
              )}
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
            {renderRow(LOWER_RIGHT, false)}
            <div className="w-px bg-clinic-teal/20" />
            {renderRow(LOWER_LEFT, false)}
          </div>
        </div>
      </div>

      {/* Selected tooth detail panel */}
      {selectedTooth && (
        <div className="mt-6 rounded-xl bg-clinic-mint/50 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display font-semibold text-clinic-ink">Tooth #{toothLabel(selectedTooth)}</p>
            <button onClick={() => setSelectedTooth(null)} className="text-sm text-clinic-ink/40 hover:text-clinic-ink">
              ✕
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={condition}
              onChange={(e) => pickCondition(e.target.value)}
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

          {canBill && BILLABLE.includes(condition) && (
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-clinic-teal/20 bg-white p-3 sm:grid-cols-3">
              <div>
                <label className="text-xs text-clinic-ink/60">Qeemat (Rs.)</label>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Qeemat likhein"
                  className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-clinic-ink/60">Abhi mile (Rs.)</label>
                <input
                  type="number"
                  min={0}
                  value={paidNow}
                  onChange={(e) => setPaidNow(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
                />
              </div>
              {Number(paidNow) > 0 && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs text-clinic-ink/60">Tareeqa</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                  </select>
                </div>
              )}
            </div>
          )}
          {billError && <p className="mt-2 text-sm text-red-600">{billError}</p>}

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

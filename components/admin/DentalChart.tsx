'use client'

import { localNumber, toothLabel, toothName, PRIMARY, isPrimary } from '@/lib/teeth'
import ToothShape from './ToothShape'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DentalRecord {
  id: string
  tooth_number: string
  condition: string
  notes: string | null
  treatment_date: string
  created_at?: string | null
  surfaces?: string[] | null
  state?: string | null
}

const SURFACES = [
  { k: 'M', l: 'Mesial' },
  { k: 'O', l: 'Occlusal / Incisal' },
  { k: 'D', l: 'Distal' },
  { k: 'B', l: 'Buccal / Labial' },
  { k: 'L', l: 'Lingual / Palatal' },
]
const STATES = [
  { k: 'existing', l: 'Pehle se hai' },
  { k: 'planned', l: 'Plan (karna hai)' },
  { k: 'completed', l: 'Ho gaya (aaj kiya)' },
]
const stateLabel = (s?: string | null) => STATES.find((x) => x.k === s)?.l ?? 'Pehle se hai'

interface DentalChartProps {
  patientId: string
  initialRecords: DentalRecord[]
  /** Chart par nishan lagana (clinical.edit) */
  canEdit?: boolean
  /** Daant chun kar "Treatment shuru" (paisa/bill sirf treatment form se banta hai, chart se nahi) */
  onStartTreatment?: (tooth: string) => void
  /** Plan wali treatments ke daant (neeli dotted line) */
  plannedTeeth?: string[]
}

export const CONDITIONS = [
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
  { value: 'pulpotomy', label: 'Pulpotomy', dot: 'bg-purple-300' },
  { value: 'pulpectomy', label: 'Pulpectomy', dot: 'bg-purple-400' },
  { value: 'ssc', label: 'Stainless Steel Crown', dot: 'bg-slate-400' },
  { value: 'space_maintainer', label: 'Space Maintainer', dot: 'bg-emerald-400' },
  { value: 'exfoliation', label: 'Natural Exfoliation', dot: 'bg-amber-200' },
  { value: 'other', label: 'Other', dot: 'bg-clinic-amber/60' },
] as const

/** Daant ke andar bharne ka rang, har condition ke liye */
export const TOOTH_FILL: Record<string, string> = {
  healthy: '#FFFFFF',
  missing: '#E5E3DF',
  caries: '#FCA5A5',
  filling: '#93C5FD',
  rct: '#C4B5FD',
  crown: '#F59E0B',
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
  plaque: '#FFEDD5',
  calculus: '#CA8A04',
  pulpotomy: '#DDD6FE',
  pulpectomy: '#A78BFA',
  ssc: '#CBD5E1',
  space_maintainer: '#6EE7B7',
  exfoliation: '#FDE68A',
  other: '#FBCFA3',
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
  // Same din ki do entries: jo baad mein likhi gayi wo
  return [...matches].sort(
    (a, b) => b.treatment_date.localeCompare(a.treatment_date) || (b.created_at ?? '').localeCompare(a.created_at ?? '')
  )[0]
}

export default function DentalChart({
  patientId,
  initialRecords,
  canEdit = false,
  onStartTreatment,
  plannedTeeth = [],
}: DentalChartProps) {
  // Bachon ke daant: agar pehle se in ka record ho to khud khule
  const [showPrimary, setShowPrimary] = useState(() => initialRecords.some((r) => isPrimary(r.tooth_number)))
  const [records, setRecords] = useState<DentalRecord[]>(initialRecords)
  // Treatment save hone ke baad (router.refresh) naye nishan bhi dikhen
  useEffect(() => setRecords(initialRecords), [initialRecords])
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null)
  const [condition, setCondition] = useState('caries')
  const [surf, setSurf] = useState<string[]>([])
  const [mstate, setMstate] = useState('existing')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openTooth(tooth: string) {
    setSelectedTooth(tooth)
    const latest = getLatestForTooth(records, tooth)
    setCondition(latest?.condition ?? 'caries')
    setSurf([])
    setMstate('existing')
    setNotes('')
    setError('')
  }

  async function handleSave() {
    if (!selectedTooth || saving) return // dobara click par dobara save nahi
    setSaving(true)
    setError('')
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data, error: err } = await supabase
      .from('dental_chart')
      .insert({
        patient_id: patientId,
        tooth_number: selectedTooth,
        condition,
        notes: notes || null,
        recorded_by: user?.id ?? null,
        surfaces: surf,
        state: mstate,
      })
      .select('id, tooth_number, condition, notes, treatment_date, created_at, surfaces, state')
      .single()
    setSaving(false)
    if (err || !data) {
      setError('Save NAHI hua' + (err ? ': ' + err.message : '') + '. Dobara koshish karein.')
      return
    }
    setRecords((prev) => [...prev, data as DentalRecord])
    setNotes('')
  }

  function renderRow(teeth: string[], upper = true) {
    return (
      <div className="flex gap-1">
        {teeth.map((tooth) => {
          const latest = getLatestForTooth(records, tooth)
          const cond = latest?.condition ?? 'healthy'
          const active = selectedTooth === tooth
          const planned = plannedTeeth.includes(tooth) || latest?.state === 'planned'
          return (
            <button
              key={tooth}
              onClick={() => openTooth(tooth)}
              title={`${toothLabel(tooth)}${cond !== 'healthy' ? ` — ${cond}` : ''}${latest?.surfaces?.length ? ` (${latest.surfaces.join('')})` : ''}${planned ? ' — plan' : ''}`}
              className={`flex shrink-0 flex-col items-center rounded-lg px-0.5 py-1 transition-transform hover:scale-105 ${
                active ? 'bg-clinic-teal/15 ring-2 ring-clinic-teal' : planned ? 'outline-dashed outline-2 outline-clinic-teal/60' : ''
              }`}
            >
              {upper && <span className="text-[11px] font-semibold text-clinic-ink/60">{toothName(tooth)}</span>}
              <ToothShape
                number={localNumber(tooth)}
                upper={upper}
                selected={active}
                fill={cond === 'healthy' ? undefined : (TOOTH_FILL[cond] ?? undefined)}
                size={26}
              />
              {!upper && <span className="text-[11px] font-semibold text-clinic-ink/60">{toothName(tooth)}</span>}
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

  // Legend mein sirf wo rang jo is chart par lage hain (lambi list ka shor nahi)
  const used = new Set(records.map((r) => r.condition))
  const legend = CONDITIONS.filter((c) => c.value !== 'healthy' && used.has(c.value))

  return (
    <div className="min-w-0 rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Dental Chart</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-medium text-clinic-ink/70">
            <input type="checkbox" checked={showPrimary} onChange={(e) => setShowPrimary(e.target.checked)} />
            Bachon ke daant (A-E)
          </label>
          <p className="hidden text-xs text-clinic-ink/50 sm:block">Daant par click karein</p>
        </div>
      </div>
      {legend.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {legend.map((c) => (
            <span key={c.value} className="flex items-center gap-1.5 text-xs text-clinic-ink/60">
              <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
              {c.label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <div className="mx-auto flex w-max flex-col items-center gap-2">
          <div className="flex gap-3">
            {renderRow(UPPER_RIGHT)}
            <div className="w-px bg-clinic-teal/20" />
            {renderRow(UPPER_LEFT)}
          </div>
          {showPrimary && (
            <div className="flex gap-3 rounded-lg bg-amber-50/60 px-2">
              {renderRow(PRIMARY.upperRight)}
              <div className="w-px bg-clinic-teal/20" />
              {renderRow(PRIMARY.upperLeft)}
            </div>
          )}
          <div className="h-px w-full bg-clinic-teal/10" />
          {showPrimary && (
            <div className="flex gap-3 rounded-lg bg-amber-50/60 px-2">
              {renderRow(PRIMARY.lowerRight, false)}
              <div className="w-px bg-clinic-teal/20" />
              {renderRow(PRIMARY.lowerLeft, false)}
            </div>
          )}
          <div className="flex gap-3">
            {renderRow(LOWER_RIGHT, false)}
            <div className="w-px bg-clinic-teal/20" />
            {renderRow(LOWER_LEFT, false)}
          </div>
        </div>
      </div>

      {selectedTooth && (
        <div className="mt-4 rounded-xl bg-clinic-mint/50 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display font-semibold text-clinic-ink">Daant {toothLabel(selectedTooth)}</p>
            <button onClick={() => setSelectedTooth(null)} className="text-sm text-clinic-ink/40 hover:text-clinic-ink">
              ✕
            </button>
          </div>

          {canEdit && onStartTreatment && (
            <button
              onClick={() => {
                onStartTreatment(selectedTooth)
                setSelectedTooth(null)
              }}
              className="mt-3 w-full rounded-lg bg-clinic-teal px-4 py-2.5 text-sm font-semibold text-white"
            >
              + Is daant par treatment shuru karein
            </button>
          )}

          {canEdit && (
            <div className="mt-3 rounded-lg border border-clinic-teal/15 bg-white p-3">
              <p className="text-xs font-semibold text-clinic-ink/60">Sirf nishan lagayein (muaine ki baat, bill nahi)</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
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
                  className="rounded-lg border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal disabled:opacity-60"
                >
                  {saving ? 'Save...' : 'Nishan save'}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-clinic-ink/60">Hissa (surface):</span>
                {SURFACES.map((x) => (
                  <button
                    key={x.k}
                    type="button"
                    title={x.l}
                    onClick={() => setSurf((v) => (v.includes(x.k) ? v.filter((y) => y !== x.k) : [...v, x.k]))}
                    className={`h-8 w-8 rounded-md border text-xs font-bold ${surf.includes(x.k) ? 'border-clinic-teal bg-clinic-teal text-white' : 'border-clinic-teal/30 text-clinic-ink/70'}`}
                  >
                    {x.k}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {STATES.map((x) => (
                  <button
                    key={x.k}
                    type="button"
                    onClick={() => setMstate(x.k)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${mstate === x.k ? 'bg-clinic-teal text-white' : 'bg-clinic-mint text-clinic-teal'}`}
                  >
                    {x.l}
                  </button>
                ))}
              </div>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note (optional)"
                className="mt-2 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-clinic-ink/40">Is daant ki history</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {history.map((h) => (
                  <div key={h.id} className="rounded-lg bg-white px-3 py-2 text-xs">
                    <span className="font-semibold capitalize text-clinic-teal">{h.condition}</span>
                    {h.surfaces && h.surfaces.length > 0 && <span className="ml-1 font-semibold text-clinic-ink">({h.surfaces.join('')})</span>}
                    <span className={`ml-2 rounded px-1.5 text-[10px] ${h.state === 'planned' ? 'bg-amber-50 text-amber-700' : h.state === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-clinic-mint text-clinic-ink/60'}`}>
                      {stateLabel(h.state)}
                    </span>
                    <span className="ml-2 text-clinic-ink/40">{new Date(h.treatment_date).toLocaleDateString('en-GB')}</span>
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

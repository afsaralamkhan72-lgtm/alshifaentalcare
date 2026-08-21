'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ToothPicker from './ToothPicker'

export interface LabOption {
  id: string
  name: string
  whatsapp: string | null
}

export interface PatientOption {
  id: string
  full_name: string
  mr_number: string | null
}

const WORK_TYPES = [
  'Crown',
  'Bridge',
  'Denture (Full)',
  'Denture (Partial)',
  'Inlay / Onlay',
  'Veneer',
  'Post & Core',
  'Night Guard',
  'Retainer',
]

const MATERIALS = ['PFM', 'Zirconia', 'E-max', 'Full Metal', 'Acrylic', 'Flexible', 'Cobalt-Chrome']

export default function LabCaseForm({
  labs,
  patients,
}: {
  labs: LabOption[]
  patients: PatientOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [patientId, setPatientId] = useState('')
  const [labId, setLabId] = useState('')
  const [labName, setLabName] = useState('')
  const [labWhatsapp, setLabWhatsapp] = useState('')
  const [saveLab, setSaveLab] = useState(true)

  const [workType, setWorkType] = useState('')
  const [teeth, setTeeth] = useState<string[]>([])
  const [shade, setShade] = useState('')
  const [material, setMaterial] = useState('')
  const [ponticDesign, setPonticDesign] = useState('')
  const [instructions, setInstructions] = useState('')
  const [impressionDate, setImpressionDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [cost, setCost] = useState('')

  // Picking a saved lab fills the name + number automatically
  function pickLab(id: string) {
    setLabId(id)
    const lab = labs.find((l) => l.id === id)
    if (lab) {
      setLabName(lab.name)
      setLabWhatsapp(lab.whatsapp ?? '')
      setSaveLab(false)
    } else {
      setLabName('')
      setLabWhatsapp('')
      setSaveLab(true)
    }
  }

  function daysAhead(n: number) {
    const d = new Date(impressionDate)
    d.setDate(d.getDate() + n)
    setDueDate(d.toISOString().slice(0, 10))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (teeth.length === 0) {
      setError('Kam az kam aik tooth select karein.')
      return
    }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let finalLabId: string | null = labId || null

    // New lab typed in — save it so it's reusable next time
    if (!labId && saveLab && labName.trim()) {
      const { data: newLab } = await supabase
        .from('labs')
        .insert({ name: labName.trim(), whatsapp: labWhatsapp || null })
        .select('id')
        .single()
      finalLabId = newLab?.id ?? null
    }

    const { data: created, error: err } = await supabase
      .from('lab_cases')
      .insert({
        patient_id: patientId || null,
        lab_id: finalLabId,
        lab_name: labName.trim(),
        lab_whatsapp: labWhatsapp || null,
        work_type: workType || null,
        tooth_numbers: teeth,
        shade: shade || null,
        material: material || null,
        pontic_design: ponticDesign || null,
        instructions: instructions || null,
        impression_date: impressionDate,
        due_date: dueDate || null,
        cost: cost ? Number(cost) : 0,
        created_by: user?.id ?? null,
      })
      .select('id')
      .single()

    setSaving(false)

    if (err || !created) {
      setError('Save nahi hua. Kya phase5.sql chalayi thi?')
      return
    }

    setOpen(false)
    router.push(`/admin/lab/${created.id}`)
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white"
      >
        + New Lab Case
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">New Lab Case</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40">
                ✕
              </button>
            </div>

            <form onSubmit={save} className="mt-4 grid gap-4">
              {/* Lab */}
              <div className="rounded-xl bg-clinic-mint/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-clinic-teal">Lab</p>

                {labs.length > 0 && (
                  <div className="mt-2">
                    <label className="text-sm font-medium text-clinic-ink">Saved Lab</label>
                    <select
                      value={labId}
                      onChange={(e) => pickLab(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">— Naya lab likhein —</option>
                      {labs.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-clinic-ink">Lab Name</label>
                    <input
                      required
                      value={labName}
                      onChange={(e) => setLabName(e.target.value)}
                      placeholder="Al Noor Dental Lab"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-clinic-ink">Lab WhatsApp</label>
                    <input
                      value={labWhatsapp}
                      onChange={(e) => setLabWhatsapp(e.target.value)}
                      placeholder="03001234567"
                      className={inputClass}
                    />
                  </div>
                </div>

                {!labId && labName.trim() && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-clinic-ink/60">
                    <input
                      type="checkbox"
                      checked={saveLab}
                      onChange={(e) => setSaveLab(e.target.checked)}
                      className="h-4 w-4 accent-clinic-teal"
                    />
                    Is lab ko save kar lein (agli baar list mein aa jayega)
                  </label>
                )}
              </div>

              {/* Patient */}
              <div>
                <label className="text-sm font-medium text-clinic-ink">Patient</label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select patient...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.mr_number} — {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teeth */}
              <div>
                <label className="text-sm font-medium text-clinic-ink">
                  Tooth Numbers (FDI) — chart par click karein
                </label>
                <div className="mt-2">
                  <ToothPicker selected={teeth} onChange={setTeeth} />
                </div>
              </div>

              {/* Work details */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Work Type</label>
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select...</option>
                    {WORK_TYPES.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Material</label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select...</option>
                    {MATERIALS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Shade</label>
                  <input
                    value={shade}
                    onChange={(e) => setShade(e.target.value)}
                    placeholder="A2"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Pontic Design</label>
                  <input
                    value={ponticDesign}
                    onChange={(e) => setPonticDesign(e.target.value)}
                    placeholder="Ridge lap / Sanitary"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-clinic-ink">Instructions for Lab</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Occlusion, contact points, margin design..."
                  className={inputClass}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Impression Date</label>
                  <input
                    type="date"
                    value={impressionDate}
                    onChange={(e) => setImpressionDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputClass}
                  />
                  <div className="mt-1 flex gap-1">
                    {[3, 5, 7].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => daysAhead(d)}
                        className="rounded-full bg-clinic-mint px-2 py-0.5 text-[10px] font-semibold text-clinic-teal"
                      >
                        +{d}d
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-clinic-ink">Lab Cost (Rs.)</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Creating...' : 'Create & Open Work Order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

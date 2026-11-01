'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PatientExtraFields, { EXTRA_EMPTY, ageFrom, extraToDb, type Extra } from './PatientExtraFields'
import { friendlyError } from '@/lib/errors'
import { todayKarachi } from '@/lib/karachi'

interface FormState {
  full_name: string
  phone: string
  department: 'dental' | 'homeopathic'
  age: string
  date_of_birth: string
  gender: string
  primary_doctor: string
  address: string
}

const INITIAL: FormState = {
  full_name: '',
  phone: '',
  department: 'dental',
  age: '',
  date_of_birth: '',
  gender: '',
  primary_doctor: '',
  address: '',
}

export default function PatientsToolbar({
  knownDoctors = [],
}: {
  knownDoctors?: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') setOpen(true)
  }, [])
  const [form, setForm] = useState<FormState>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Pehle se register? (same phone ya same naam) -> pehle dikhao, phir bhi naya chahiye to "Naya hi banao"
  const [similar, setSimilar] = useState<{ id: string; full_name: string; phone: string; mr_number: string | null; age: number | null }[]>([])
  const [dupOk, setDupOk] = useState(false)
  const [extra, setExtra] = useState<Extra>(EXTRA_EMPTY)
  const [allergy, setAllergy] = useState('')
  const [thinner, setThinner] = useState(false)
  const [seeNow, setSeeNow] = useState(true)
  const [consent, setConsent] = useState(false)
  const [cnic, setCnic] = useState('')
  const [family, setFamily] = useState('')
  const ageNum = ageFrom(form.age, form.date_of_birth)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === 'full_name' || key === 'phone') {
      setSimilar([])
      setDupOk(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')

    const phoneDigits = form.phone.replace(/[^0-9]/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      setSaving(false)
      setError('Phone number poora likhein (jaise 0300-1234567). Warna WhatsApp message nahi ja sakega.')
      return
    }
    const supabase = createClient()
    if (!dupOk) {
      const { data: found } = await supabase.rpc('find_similar_patients', { p_name: form.full_name, p_phone: form.phone })
      if (Array.isArray(found) && found.length > 0) {
        setSimilar(found)
        setSaving(false)
        return
      }
    }
    const base = {
      full_name: form.full_name,
      phone: form.phone,
      department: form.department,
      age: ageNum,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      primary_doctor: form.primary_doctor || null,
      address: form.address || null,
      // Zaroori sawal: doctor ko dikhane ke liye profile par nishani ban jati hai
      notes: [allergy.trim() ? `Allergy: ${allergy.trim()}` : '', thinner ? 'Blood thinner leta/leti hai' : ''].filter(Boolean).join(' · ') || null,
    }
    // Family: kisi rishtedaar ka MR number ya phone likha ho to us se jor do
    let familyOf: string | null = null
    if (family.trim()) {
      const f = family.trim().replace(/[%,()*\\"']/g, ' ')
      const { data: rel } = await supabase.from('patients').select('id, family_of').is('deleted_at', null).or(`mr_number.eq.${f},phone.eq.${f}`).limit(1)
      if (!rel || rel.length === 0) {
        setSaving(false)
        setError('Family wala patient nahi mila. MR number ya phone sahi likhein, ya khali chorein.')
        return
      }
      familyOf = (rel[0] as { id: string; family_of: string | null }).family_of ?? (rel[0] as { id: string }).id
    }
    let { data: created, error: insertError } = await supabase.from('patients').insert({ ...base, ...extraToDb(extra), cnic: cnic.trim() || null, family_of: familyOf }).select('id').single()
    // Naye khane abhi database mein na hon (SQL baad mein chali) to purane tareeqe se save ho jaye
    if (insertError && (insertError.code === 'PGRST204' || /column/i.test(insertError.message))) {
      ;({ data: created, error: insertError } = await supabase.from('patients').insert(base).select('id').single())
    }

    setSaving(false)
    if (insertError || !created) {
      setError('Patient save nahi hua: ' + friendlyError(insertError?.message))
      return
    }

    if (form.primary_doctor.trim()) {
      await supabase.from('treating_doctors').insert({ name: form.primary_doctor.trim() })
    }

    if (consent) await supabase.rpc('give_consent', { p_patient: created.id })
    // Register ke saath hi "abhi doctor ko dikhana hai" -> aaj ki list mein "intezar mein"
    if (seeNow) {
      // Aaj isi phone ki appointment pehle se ho (jaise website booking) to nayi na banao, wahi "aa gaya" kar do
      const tail = phoneDigits.slice(-7)
      const { data: ex } = await supabase
        .from('appointments')
        .select('id')
        .eq('preferred_date', todayKarachi())
        .is('deleted_at', null)
        .in('status', ['pending', 'confirmed'])
        .ilike('phone', `%${tail}%`)
        .limit(1)
      if (ex && ex.length > 0) {
        await supabase.from('appointments').update({ patient_id: created.id, status: 'arrived', arrived_at: new Date().toISOString() }).eq('id', (ex[0] as { id: string }).id)
      } else {
        await supabase.from('appointments').insert({
          patient_name: form.full_name,
          phone: form.phone,
          department: form.department,
          patient_id: created.id,
          preferred_date: todayKarachi(),
          status: 'arrived',
          arrived_at: new Date().toISOString(),
          source: 'walk-in',
        })
      }
    }
    setAllergy('')
    setThinner(false)
    setConsent(false)
    setCnic('')
    setFamily('')
    setForm(INITIAL)
    setExtra(EXTRA_EMPTY)
    setSimilar([])
    setDupOk(false)
    setOpen(false)
    router.push(`/admin/patients/${created.id}`)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light"
      >
        + Naya Patient
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-clinic-ink">Naya Patient register karein</p>
              <button onClick={() => setOpen(false)} className="text-clinic-ink/40 hover:text-clinic-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
              <div>
                <label className="text-sm font-medium text-clinic-ink">Naam *</label>
                <input
                  required
                  autoFocus
                  placeholder="Patient ka poora naam"
                  value={form.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-clinic-ink">Phone *</label>
                <input
                  required
                  placeholder="03XX-XXXXXXX"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-clinic-ink">Department</label>
                <div className="mt-1 flex gap-2">
                  {(['dental', 'homeopathic'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => update('department', d)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${
                        form.department === d
                          ? 'bg-clinic-teal text-white'
                          : 'bg-clinic-mint text-clinic-ink/70'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={0}
                  max={120}
                  placeholder="Age (saal)"
                  value={form.age}
                  onChange={(e) => update('age', e.target.value)}
                  className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                />
                <select
                  value={form.gender}
                  onChange={(e) => update('gender', e.target.value)}
                  className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                >
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-clinic-ink/50">Ya paidaish ki tareekh (umar khud nikal aati hai)</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => update('date_of_birth', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                />
              </div>
              <details className="rounded-xl bg-clinic-mint/40 p-3" open={ageNum != null && ageNum < 18}>
                <summary className="cursor-pointer text-sm font-medium text-clinic-teal">
                  Aur tafseel (optional)
                </summary>
                <div className="mt-3 grid gap-3">
              <div>
                <label className="text-xs text-clinic-ink/50">Treating Doctor</label>
                <input
                  list="toolbar-doctors"
                  placeholder="Doctor apna naam likhein"
                  value={form.primary_doctor}
                  onChange={(e) => update('primary_doctor', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                />
                <datalist id="toolbar-doctors">
                  {knownDoctors.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
              <PatientExtraFields value={extra} onChange={setExtra} age={ageNum} inputClass="w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal" />
                </div>
              </details>

              <div className="rounded-xl bg-red-50/60 p-3">
                <p className="text-sm font-medium text-clinic-ink">Zaroori sawal (doctor ke liye)</p>
                <input
                  placeholder="Kisi dawa / cheez se allergy? (nahi to khali chorein)"
                  value={allergy}
                  onChange={(e) => setAllergy(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
                />
                <label className="mt-2 flex items-center gap-2 text-sm text-clinic-ink/80">
                  <input type="checkbox" checked={thinner} onChange={(e) => setThinner(e.target.checked)} className="h-4 w-4" />
                  Khoon patla karne ki dawa (Aspirin / Warfarin) leta/leti hai
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-clinic-ink/80">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="h-4 w-4" />
                Ilaaj ki ijazat (consent) le li gayi
              </label>

              <label className="flex items-center gap-2 text-sm text-clinic-ink/80">
                <input type="checkbox" checked={seeNow} onChange={(e) => setSeeNow(e.target.checked)} className="h-4 w-4" />
                Patient abhi doctor ko dikhana chahta hai (aaj ki &quot;intezar&quot; list mein daalein)
              </label>

              <div className="grid grid-cols-2 gap-3">
                <input placeholder="CNIC (optional)" value={cnic} onChange={(e) => setCnic(e.target.value)} className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal" />
                <input placeholder="Family: rishtedaar ka MR / phone" value={family} onChange={(e) => setFamily(e.target.value)} className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal" />
              </div>
              <textarea
                placeholder="Address (optional)"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                rows={2}
                className="rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
              />

              {similar.length > 0 && !dupOk && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
                  <p className="font-semibold text-amber-900">Ye patient shayad pehle se register hai:</p>
                  <div className="mt-2 grid gap-1.5">
                    {similar.map((p) => (
                      <a key={p.id} href={`/admin/patients/${p.id}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 hover:bg-clinic-mint">
                        <span>
                          <span className="font-semibold capitalize">{p.full_name}</span>
                          <span className="ml-2 text-xs text-clinic-ink/60">
                            {p.mr_number} · {p.phone}
                            {p.age ? ` · ${p.age} saal` : ''}
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-clinic-teal">Ye kholein →</span>
                      </a>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDupOk(true)}
                    className="mt-2 text-xs font-semibold text-amber-900 underline"
                  >
                    Nahi, ye naya patient hai (phir Save dabayein)
                  </button>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-teal-light disabled:opacity-60"
              >
                {saving ? 'Save ho raha hai...' : 'Patient save karein'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

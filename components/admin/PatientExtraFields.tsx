'use client'

/** Registration ke naye khane: dusra phone / WhatsApp, bache ke guardian, emergency contact, kaise pata chala. */
export interface Extra {
  phone2: string
  guardian_name: string
  guardian_relation: string
  emergency_name: string
  emergency_phone: string
  referral_source: string
}

export const EXTRA_EMPTY: Extra = { phone2: '', guardian_name: '', guardian_relation: '', emergency_name: '', emergency_phone: '', referral_source: '' }

export const REFERRALS = ['Facebook / Instagram', 'Google', 'Dost / Rishtedaar', 'Kisi doctor ne bheja', 'Pehle ka patient', 'Website', 'Raste se guzarte hue', 'Aur']
const GUARDIANS = ['Walid', 'Walida', 'Bhai / Behan', 'Dada / Dadi', 'Aur']

/** umar (saal) se: 12 se kam = guardian zaroori, 18 se kam = guardian ka khana dikhao */
export function ageFrom(age: string, dob: string): number | null {
  if (age !== '' && Number.isFinite(Number(age))) return Number(age)
  if (dob) {
    const d = new Date(dob)
    if (!Number.isNaN(d.getTime())) return Math.floor((Date.now() - d.getTime()) / 31557600000)
  }
  return null
}

export function extraToDb(e: Extra) {
  const n = (s: string) => (s.trim() ? s.trim() : null)
  return {
    phone2: n(e.phone2),
    guardian_name: n(e.guardian_name),
    guardian_relation: n(e.guardian_relation),
    emergency_name: n(e.emergency_name),
    emergency_phone: n(e.emergency_phone),
    referral_source: n(e.referral_source),
  }
}

export default function PatientExtraFields({
  value,
  onChange,
  age,
  inputClass,
}: {
  value: Extra
  onChange: (v: Extra) => void
  age: number | null
  inputClass: string
}) {
  const set = (k: keyof Extra, v: string) => onChange({ ...value, [k]: v })
  const child = age != null && age < 18
  const small = age != null && age < 12
  return (
    <div className="grid gap-3">
      {child && (
        <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Bacha hai: guardian (walid / walida) ka naam {small ? 'zaroori hai' : 'likh lein'}</p>
          <input required={small} placeholder="Guardian ka naam" value={value.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} className={inputClass} />
          <div className="flex flex-wrap gap-1.5">
            {GUARDIANS.map((g) => (
              <button key={g} type="button" onClick={() => set('guardian_relation', value.guardian_relation === g ? '' : g)} aria-pressed={value.guardian_relation === g} className={`rounded-full px-3 py-1 text-xs font-semibold ${value.guardian_relation === g ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/25 bg-white text-clinic-ink/70'}`}>
                {g}
              </button>
            ))}
          </div>
        </div>
      )}
      <input placeholder="Dusra phone / WhatsApp (optional)" value={value.phone2} onChange={(e) => set('phone2', e.target.value)} className={inputClass} />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Emergency: naam" value={value.emergency_name} onChange={(e) => set('emergency_name', e.target.value)} className={inputClass} />
        <input placeholder="Emergency: phone" value={value.emergency_phone} onChange={(e) => set('emergency_phone', e.target.value)} className={inputClass} />
      </div>
      <select value={value.referral_source} onChange={(e) => set('referral_source', e.target.value)} className={inputClass} aria-label="Kaise pata chala">
        <option value="">Clinic ka kaise pata chala? (optional)</option>
        {REFERRALS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  )
}

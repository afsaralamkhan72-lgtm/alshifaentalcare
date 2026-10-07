/**
 * Clinic ki standard list.
 *
 * Ye list hamesha maujood rehti hai. Agar Edit Website se koi
 * service add ki jaye to wo bhi is ke sath mil kar dikhti hai.
 */

export const TOOTH_FINDINGS = [
  'Caries',
  'Missing',
  'Filling',
  'RCT',
  'Crown',
  'Bridge',
  'Implant',
  'Extraction',
  'Scaling',
  'Fracture',
  'Mobility',
  'Pocket Depth',
  'Bleeding',
  'Sinus',
  'Periapical Problem',
  'Denture',
  'Implant Planning',
  'Tooth Notes',
]

export const PERIODONTAL_CHART = [
  'Pocket Depth',
  'Gingival Condition',
  'Bleeding on Probing',
  'Mobility',
  'Recession',
  'Furcation',
  'Plaque',
  'Calculus',
  'Periodontal Diagnosis',
]

export const DENTAL_TREATMENTS = [
  'Consultation',
  'Examination',
  'Scaling',
  'Polishing',
  'Filling',
  'Extraction',
  'RCT',
  'Crown',
  'Bridge',
  'Veneer',
  'Denture',
  'Implant',
  'Orthodontics',
  'Whitening',
  'Gum Treatment',
  'Pediatric Dentistry',
]

/** Billing ke liye: jo cheezein charge hoti hain */
export const BILLABLE_TREATMENTS = [
  ...DENTAL_TREATMENTS,
  'Implant Planning',
  'Periodontal Treatment',
  'Homeopathic Consultation',
]

/** Dental chart / findings ke liye: sab kuch */
export const ALL_DENTAL_TERMS = Array.from(
  new Set([...TOOTH_FINDINGS, ...PERIODONTAL_CHART, ...DENTAL_TREATMENTS])
)

/** DB ki services aur standard list ko mila kar, bina duplicate ke */
export function mergeTreatments(fromDb: string[] = []) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of [...fromDb, ...BILLABLE_TREATMENTS]) {
    const key = name.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name.trim())
  }
  return out
}

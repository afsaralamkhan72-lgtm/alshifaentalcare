/** Print templates ki list. Dental aur Homeopathic alag; nishan se pata chalta hai kaun kis ke liye. */
export type Dept = 'dental' | 'homeopathic'

export interface PrintTpl { id: string; label: string; dept: Dept | 'both' }

export const BILL_TEMPLATES: PrintTpl[] = [
  { id: 'soft', label: 'Software wala (Neela-Safed)', dept: 'both' },
  { id: 'green', label: 'Hara (Patient Bill / Invoice)', dept: 'both' },
  { id: 'classic', label: 'Purana (Classic)', dept: 'both' },
  { id: 'blue', label: 'Naya (Neela)', dept: 'both' },
]
export const RX_TEMPLATES: PrintTpl[] = [
  { id: 'soft', label: 'Software wala (Neela-Safed)', dept: 'both' },
  { id: 'classic', label: 'Purana (Classic)', dept: 'both' },
  { id: 'pad_red', label: 'Pad (Laal-Kala)', dept: 'dental' },
  { id: 'pad_bw', label: 'Pad (Kala-Safed, hidayat ke saath)', dept: 'dental' },
  { id: 'pad_green', label: 'Pad (Hara, Homeopathic)', dept: 'homeopathic' },
]

export function rxTemplatesFor(dept: string | null | undefined): PrintTpl[] {
  const d: Dept = dept === 'homeopathic' ? 'homeopathic' : 'dental'
  return RX_TEMPLATES.filter((t) => t.dept === 'both' || t.dept === d)
}

export interface PrintLogo { data: string | null; size: number; badge: boolean }
export interface PrintDefaults { bill: string; rx_dental: string; rx_homeo: string }
export const DEFAULT_PRINT: PrintDefaults = { bill: 'soft', rx_dental: 'soft', rx_homeo: 'soft' }

/** Hidayat ke sets (message_templates ki keys). Dental / Homeopathic alag. */
export const AFTERCARE: { key: string; label: string; dept: Dept }[] = [
  { key: 'after_extraction', label: 'Daant nikalne ke baad', dept: 'dental' },
  { key: 'after_homeo_medicine', label: 'Dawa lene ka tareeqa', dept: 'homeopathic' },
]
export function aftercareFor(dept: string | null | undefined) {
  const d: Dept = dept === 'homeopathic' ? 'homeopathic' : 'dental'
  return AFTERCARE.filter((a) => a.dept === d)
}

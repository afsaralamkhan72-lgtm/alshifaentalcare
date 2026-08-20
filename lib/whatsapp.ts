// Clinic's WhatsApp number in international format (no +, no spaces/dashes)
// 0342-2078639 -> 92 342 2078639
const CLINIC_WHATSAPP_NUMBER = '923422078639'

interface WhatsAppLinkOptions {
  treatmentName?: string
  customMessage?: string
}

/**
 * Builds a wa.me link with a pre-filled message.
 * - Pass `treatmentName` for service booking buttons
 *   (auto message: "...ke liye appointment book karwana chahta hoon")
 * - Pass `customMessage` to override completely (e.g. emergency popup)
 */
export function buildWhatsAppLink({ treatmentName, customMessage }: WhatsAppLinkOptions = {}) {
  const message =
    customMessage ??
    (treatmentName
      ? `Asalam-o-Alaikum Dr. Sahib, main ${treatmentName} ke liye appointment book karwana chahta hoon.`
      : `Asalam-o-Alaikum Dr. Sahib, mujhe appointment ke baare mein maloomat chahiye.`)

  return `https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

/** Converts a local PK number (0300-1234567 / 03001234567) to international format (923001234567) */
export function toInternationalPKNumber(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  if (digits.startsWith('92')) return digits
  if (digits.startsWith('0')) return `92${digits.slice(1)}`
  return `92${digits}`
}

interface PrescriptionItem {
  name_en: string
  name_ur?: string
  potency?: string
  dosage?: string
  frequency?: string
  duration?: string
}

/** Builds a wa.me link that sends the full prescription to the PATIENT's number */
export function buildPrescriptionWhatsAppLink({
  patientPhone,
  patientName,
  items,
  notesEn,
}: {
  patientPhone: string
  patientName: string
  items: PrescriptionItem[]
  notesEn?: string
}) {
  const lines = [
    `Asalam-o-Alaikum ${patientName},`,
    `Al Shifa Health Care se aap ka prescription:`,
    '',
    ...items.map((item, i) => {
      const parts = [item.name_en, item.name_ur, item.potency, item.dosage, item.frequency, item.duration]
        .filter(Boolean)
        .join(' — ')
      return `${i + 1}. ${parts}`
    }),
  ]

  if (notesEn) {
    lines.push('', `Notes: ${notesEn}`)
  }

  lines.push('', 'Dr. Muhammad Khalid Mahmood', 'Al Shifa Health Care')

  const number = toInternationalPKNumber(patientPhone)
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`
}

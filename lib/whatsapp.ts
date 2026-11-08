// Clinic's WhatsApp number in international format (no +, no spaces/dashes)
import { CLINIC } from '@/clinic.config'
import { toInternationalPKNumber } from '@/lib/phone'
// 0342-2078639 -> 92 342 2078639
const CLINIC_WHATSAPP_NUMBER = CLINIC.phone.whatsapp

interface WhatsAppLinkOptions {
  treatmentName?: string
  customMessage?: string
  /** Send TO this number instead of the clinic (e.g. reminding a patient) */
  phoneOverride?: string
}

/**
 * Builds a wa.me link with a pre-filled message.
 * - Pass `treatmentName` for service booking buttons
 *   (auto message: "...ke liye appointment book karwana chahta hoon")
 * - Pass `customMessage` to override completely (e.g. emergency popup)
 * - Pass `phoneOverride` to message a patient instead of the clinic
 */
export function buildWhatsAppLink({
  treatmentName,
  customMessage,
  phoneOverride,
}: WhatsAppLinkOptions = {}) {
  const message =
    customMessage ??
    (treatmentName
      ? `Asalam-o-Alaikum Dr. Sahib, main ${treatmentName} ke liye appointment book karwana chahta hoon.`
      : `Asalam-o-Alaikum Dr. Sahib, mujhe appointment ke baare mein maloomat chahiye.`)

  const number = phoneOverride
    ? toInternationalPKNumber(phoneOverride)
    : CLINIC_WHATSAPP_NUMBER

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export { toInternationalPKNumber }

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
        .join(', ')
      return `${i + 1}. ${parts}`
    }),
  ]

  if (notesEn) {
    lines.push('', `Notes: ${notesEn}`)
  }

  lines.push('', CLINIC.doctor.name, CLINIC.name)

  const number = toInternationalPKNumber(patientPhone)
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`
}

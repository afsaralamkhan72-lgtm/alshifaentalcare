import { CLINIC } from '@/clinic.config'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { fmtDate } from '@/lib/karachi'

/**
 * WhatsApp ke tayyar messages (click-to-chat: WhatsApp khulta hai, message bhara hua hota hai,
 * bhejna staff khud dabata hai. Software ye nahi kehta ke message pohanch gaya.)
 */
interface Appt {
  patient_name: string
  phone: string
  preferred_date: string | null
  preferred_time: string | null
  treatment_name?: string | null
  doctor?: string | null
}

const when = (a: Appt) => `${fmtDate(a.preferred_date)}${a.preferred_time ? `, ${a.preferred_time}` : ''}`
const sign = () => [CLINIC.name, CLINIC.address.full, CLINIC.phone.display].join('\n')
const doc = (a: Appt) => (a.doctor ? ` (${a.doctor})` : '')

export function apptConfirmLink(a: Appt) {
  return buildWhatsAppLink({
    phoneOverride: a.phone,
    customMessage: `Assalam o Alaikum ${a.patient_name},\naap ki appointment${a.treatment_name ? ` (${a.treatment_name})` : ''} ${when(a)} confirm hai${doc(a)}.\n\n${sign()}`,
  })
}

export function apptReminderLink(a: Appt) {
  return buildWhatsAppLink({
    phoneOverride: a.phone,
    customMessage: `Assalam o Alaikum ${a.patient_name},\nyaad dehani: aap ki appointment${a.treatment_name ? ` (${a.treatment_name})` : ''} ${when(a)} hai${doc(a)}. Na aa saken to baraye meherbani bata dein.\n\n${sign()}`,
  })
}

export function apptRescheduleLink(a: Appt) {
  return buildWhatsAppLink({
    phoneOverride: a.phone,
    customMessage: `Assalam o Alaikum ${a.patient_name},\naap ki appointment ki nayi tareekh ${when(a)} hai${doc(a)}.\n\n${sign()}`,
  })
}

export function paymentReminderLink(p: { full_name: string; phone: string; balance: number }) {
  return buildWhatsAppLink({
    phoneOverride: p.phone,
    customMessage: `Assalam o Alaikum ${p.full_name},\n${CLINIC.name} mein aap ka baqaya Rs. ${Number(p.balance).toLocaleString('en-US')} hai. Agli visit par ya EasyPaisa/JazzCash (${CLINIC.payments.easypaisa}) par ada kar dein.\n\nShukriya\n${sign()}`,
  })
}

export function generalLink(p: { full_name: string; phone: string }) {
  return buildWhatsAppLink({ phoneOverride: p.phone, customMessage: `Assalam o Alaikum ${p.full_name},\n\n\n${CLINIC.name}` })
}

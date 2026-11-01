import { CLINIC } from '@/clinic.config'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { fmtDate } from '@/lib/karachi'
import { renderTemplate, salaamLine, adabName, type Tpl } from '@/lib/messageTemplates'

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
  gender?: string | null
}


const vars = (a: Appt) => ({
  salaam: salaamLine(a.patient_name, a.gender),
  name: a.patient_name,
  treatment: a.treatment_name ? `(${a.treatment_name})` : '',
  date: fmtDate(a.preferred_date),
  time: a.preferred_time ?? '',
  doctor: a.doctor ? `(${a.doctor})` : '',
})
const link = (phone: string, key: string, v: Record<string, string | number | null | undefined>, tpl?: Tpl) =>
  buildWhatsAppLink({ phoneOverride: phone, customMessage: renderTemplate(key, v, tpl) })

export const apptConfirmLink = (a: Appt, tpl?: Tpl) => link(a.phone, 'appt_confirm', vars(a), tpl)
export const apptReminderLink = (a: Appt, tpl?: Tpl) => link(a.phone, 'appt_reminder', vars(a), tpl)
export const apptRescheduleLink = (a: Appt, tpl?: Tpl) => link(a.phone, 'appt_reschedule', vars(a), tpl)

export function paymentReminderLink(p: { full_name: string; phone: string; balance: number; gender?: string | null }, tpl?: Tpl) {
  return link(p.phone, 'baqaya', { salaam: salaamLine(p.full_name, p.gender), name: p.full_name, balance: Number(p.balance).toLocaleString('en-US') }, tpl)
}

export function messageLink(key: string, p: { full_name: string; phone: string; gender?: string | null }, extra: Record<string, string | number | null | undefined> = {}, tpl?: Tpl) {
  return link(p.phone, key, { salaam: salaamLine(p.full_name, p.gender), adab: adabName(p.full_name, p.gender), name: p.full_name, ...extra }, tpl)
}

export function generalLink(p: { full_name: string; phone: string }) {
  return buildWhatsAppLink({ phoneOverride: p.phone, customMessage: `Assalam o Alaikum ${p.full_name},\n\n\n${CLINIC.name}` })
}

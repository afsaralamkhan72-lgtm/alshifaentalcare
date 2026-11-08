import { CLINIC } from '@/clinic.config'
import { money, fmtDate } from '@/lib/karachi'

export interface BillTextData {
  patientName: string
  invoiceNumber: string
  items: { name: string; tooth?: string | null; qty: number; line_total: number }[]
  subtotal: number
  discountAmount: number
  total: number
  paid: number
  balance: number
  dueDate?: string | null
  voided?: boolean
}

/** Ek hi bill text: print/PDF sheet jaisa hi hisaab (treatment, discount, mila, baqaya). WhatsApp aur copy dono isi se. */
export function buildBillText(d: BillTextData): string {
  const lines: string[] = [`Assalam o Alaikum ${d.patientName},`, `${CLINIC.name}, invoice ${d.invoiceNumber}`, '']
  for (const it of d.items) {
    const label = `${it.name}${it.tooth ? ` (daant ${it.tooth})` : ''}${it.qty > 1 ? ` x${it.qty}` : ''}`
    lines.push(`• ${label}: ${money(it.line_total)}`)
  }
  if (d.items.length) lines.push('')
  lines.push(`Kul bill : ${money(d.subtotal)}`)
  if (d.discountAmount > 0) lines.push(`Discount : - ${money(d.discountAmount)}`)
  lines.push(`Total    : ${money(d.total)}`)
  lines.push(`Mile     : ${money(d.paid)}`)
  lines.push(`Baqaya   : ${money(d.balance)}`)
  if (d.balance > 0 && d.dueDate) lines.push(`Aakhri tareekh: ${fmtDate(d.dueDate)}`)
  if (d.voided) lines.push('', '(Ye invoice cancel ho chuka hai)')
  lines.push('', `${CLINIC.name} · ${CLINIC.phone.display}`)
  return lines.join('\n')
}

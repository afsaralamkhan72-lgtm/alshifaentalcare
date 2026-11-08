/**
 * Converts a PK number to wa.me international format (923001234567).
 * Handles: 0300-1234567, 03001234567, 3001234567, +92 300 1234567,
 * 92300..., 0092300..., 920300... (extra 0), and other countries given as + or 00.
 */
export function toInternationalPKNumber(phone: string): string {
  const raw = String(phone ?? '').trim()
  let digits = raw.replace(/[^0-9]/g, '')
  if (!digits) return ''
  let intl = raw.startsWith('+')
  if (digits.startsWith('00')) {
    digits = digits.slice(2)
    intl = true
  }
  if (digits.startsWith('92')) {
    const rest = digits.slice(2).replace(/^0+/, '')
    return `92${rest}`
  }
  if (intl) return digits
  if (digits.startsWith('0')) return `92${digits.replace(/^0+/, '')}`
  return `92${digits}`
}


/** Clinic Karachi mein hai: "aaj" ki date Pakistan ke hisaab se (UTC se nahi) */
export function todayKarachi(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date())
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Single money formatter: "Rs. 1,234.5" (max 2 decimals, no float noise). */
export const money = (n: number | string | null | undefined) =>
  `Rs. ${Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

/** Whole-rupee version (salary slips, payroll) */
export const moneyWhole = (n: number | string | null | undefined) =>
  `Rs. ${Math.round(Number(n ?? 0)).toLocaleString('en-US')}`

/** Number only, max 2 decimals (no "Rs.") */
export const numFmt = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

/** dd/mm/yyyy. Date-only strings are kept as-is; timestamps are shown in Karachi time. */
export const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—'
  if (d.length <= 10) return new Date(`${d}T00:00:00`).toLocaleDateString('en-GB')
  return new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' })
}

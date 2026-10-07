/** Clinic Karachi mein hai: "aaj" ki date Pakistan ke hisaab se (UTC se nahi) */
export function todayKarachi(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date())
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const money = (n: number | string | null | undefined) =>
  `Rs. ${Number(n ?? 0).toLocaleString('en-US')}`

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB') : '—'

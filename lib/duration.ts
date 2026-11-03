/** "7 din", "2 hafte", "1 mahina", "۱۰ دن" jaisi likhai se din nikalta hai. Samajh na aaye to null. */
const ARABIC = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹'

function normDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (c) => String(ARABIC.includes(c) ? ARABIC.indexOf(c) : PERSIAN.indexOf(c)))
}

export function parseDays(text: string | null | undefined): number | null {
  if (!text) return null
  const t = normDigits(String(text)).toLowerCase()
  const m = t.match(/(\d+(?:\.\d+)?)\s*([a-zا-ی]*)/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  const u = m[2]
  if (/^(week|weeks|wk|hafta|hafte|haftay|haftey|ہفتہ|ہفتے|ہفتوں)/.test(u)) return Math.round(n * 7)
  if (/^(month|months|mahina|mahine|mahiney|maah|مہینہ|مہینے|ماہ)/.test(u)) return Math.round(n * 30)
  if (/^(year|years|saal|sal|سال)/.test(u)) return Math.round(n * 365)
  return Math.round(n) // din / day / days / khali: din hi maan lein
}

export function maxDays(durations: (string | null | undefined)[]): number | null {
  let best: number | null = null
  for (const d of durations) {
    const v = parseDays(d)
    if (v != null && (best == null || v > best)) best = v
  }
  return best
}

/** Dawaon ki list import: CSV / Excel se parh kar dekhna, pehle se maujood dawa chhorna, naye hi jodna. Kuch bhi mita nahi. */

export interface ImportMed {
  name: string
  potency: string | null
  dosage_form: string | null
  pack: string | null
  default_dose: string | null
  default_frequency: string | null
  default_duration: string | null
  instructions: string | null
  generic_name: string | null
  price: number
}

export interface ImportPlan {
  fresh: ImportMed[]
  dup: { name: string; potency: string | null; why: string }[]
  bad: { row: number; why: string }[]
}

export function parseDelimited(text: string): string[][] {
  const t = text.replace(/^﻿/, '')
  const first = t.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const counts: [string, number][] = [',', ';', '\t'].map((d) => [d, first.split(d).length - 1])
  counts.sort((a, b) => b[1] - a[1])
  const delim = counts[0][1] > 0 ? counts[0][0] : ','
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) {
      if (c === '"' && t[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === delim) {
      row.push(cur)
      cur = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      row.push(cur)
      cur = ''
      rows.push(row)
      row = []
    } else cur += c
  }
  if (cur !== '' || row.length) {
    row.push(cur)
    rows.push(row)
  }
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x !== ''))
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const HEAD: Record<keyof ImportMed, string[]> = {
  name: ['name', 'medicine', 'medicine name', 'dawa', 'dawai', 'dawa ka naam', 'remedy', 'remedy name', 'drug', 'item', 'product'],
  potency: ['potency', 'power', 'strength'],
  dosage_form: ['form', 'dosage form', 'type', 'medicine type'],
  pack: ['pack', 'quantity', 'qty', 'size', 'packing'],
  default_dose: ['dose', 'default dose', 'aam dose'],
  default_frequency: ['frequency', 'freq', 'times', 'kitni baar'],
  default_duration: ['duration', 'days', 'kitne din'],
  instructions: ['instructions', 'instruction', 'directions', 'hidayat', 'notes', 'note'],
  generic_name: ['generic', 'generic name', 'common name'],
  price: ['price', 'rate', 'qeemat', 'cost', 'rs'],
}

export function mapColumns(header: string[]): Partial<Record<keyof ImportMed, number>> | null {
  const idx: Partial<Record<keyof ImportMed, number>> = {}
  header.forEach((h, i) => {
    const n = norm(h)
    for (const k of Object.keys(HEAD) as (keyof ImportMed)[]) if (idx[k] === undefined && HEAD[k].includes(n)) idx[k] = i
  })
  return idx.name === undefined ? null : idx
}

/** existing: pehle se list mein maujood dawaon ke (name, potency). Dawa ka kaam sirf jodna hai, purani ko kabhi nahi badalta. */
export function planImport(rows: string[][], existing: { name: string; potency: string | null }[]): ImportPlan {
  const plan: ImportPlan = { fresh: [], dup: [], bad: [] }
  if (!rows.length) return plan
  const cols = mapColumns(rows[0])
  const body = cols ? rows.slice(1) : rows
  const key = (n: string, p: string | null) => n.trim().toLowerCase() + '|' + (p ?? '').trim().toLowerCase()
  const seen = new Set(existing.map((e) => key(e.name, e.potency)))
  const get = (r: string[], k: keyof ImportMed): string | null => {
    const i = cols ? cols[k] : k === 'name' ? 0 : undefined
    const v = i === undefined ? '' : (r[i] ?? '').trim()
    return v === '' ? null : v
  }
  body.forEach((r, n) => {
    const rowNo = n + (cols ? 2 : 1)
    const name = get(r, 'name')
    if (!name) return plan.bad.push({ row: rowNo, why: 'naam khali' })
    if (name.length > 120) return plan.bad.push({ row: rowNo, why: 'naam bohat lamba' })
    const priceRaw = get(r, 'price')
    const price = priceRaw === null ? 0 : Number(priceRaw.replace(/[, ]/g, '').replace(/^rs\.?/i, ''))
    if (!Number.isFinite(price) || price < 0) return plan.bad.push({ row: rowNo, why: 'qeemat samajh nahi aayi' })
    const potency = get(r, 'potency')
    const k = key(name, potency)
    if (seen.has(k)) return plan.dup.push({ name, potency, why: 'pehle se list mein' })
    seen.add(k)
    plan.fresh.push({
      name, potency, dosage_form: get(r, 'dosage_form'), pack: get(r, 'pack'), default_dose: get(r, 'default_dose'),
      default_frequency: get(r, 'default_frequency'), default_duration: get(r, 'default_duration'), instructions: get(r, 'instructions'),
      generic_name: get(r, 'generic_name'), price,
    })
  })
  return plan
}

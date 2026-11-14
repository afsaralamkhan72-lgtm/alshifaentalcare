/**
 * Kaam dhoondte waqt doosre naam: "root canal treatment", "nerve" likhein to RCT mil jaye.
 * Sirf dhoondne ke liye; kisi kaam ka naam ya qeemat yahan se nahi badalti.
 */
const GROUPS: { test: RegExp; words: string[] }[] = [
  { test: /root canal|\brct\b|pulpectomy/i, words: ['rct', 'root canal', 'root canal treatment', 'nerve', 'nerve treatment', 'jar ka ilaj'] },
  { test: /filling|restoration|cavity/i, words: ['filling', 'bharai', 'bharna', 'daant bharna', 'cavity', 'restoration'] },
  { test: /extract|surgical|impact/i, words: ['extraction', 'nikalna', 'daant nikalna', 'nikalwana', 'tooth removal', 'removal', 'wisdom'] },
  { test: /scaling|polish|cleaning/i, words: ['scaling', 'polishing', 'safai', 'cleaning', 'polish'] },
  { test: /crown|\bcap\b/i, words: ['crown', 'cap', 'topi'] },
  { test: /\bpost\b|\bcore\b/i, words: ['post', 'core', 'post and core', 'post core', 'pin'] },
  { test: /bridge/i, words: ['bridge', 'pul'] },
  { test: /whiten|bleach/i, words: ['whitening', 'bleaching', 'safaid'] },
  { test: /implant/i, words: ['implant'] },
  { test: /brace|ortho/i, words: ['braces', 'brace', 'orthodontic', 'taar'] },
  { test: /denture/i, words: ['denture', 'nakli daant', 'batisi'] },
  { test: /x-?ray|opg|radiograph|\biopa\b/i, words: ['xray', 'x ray', 'opg', 'radiograph'] },
  { test: /consult|check-?up|exam/i, words: ['consultation', 'checkup', 'check up', 'muaina', 'exam'] },
]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Naam mein likhi baat (har lafz) ya us ke doosre naam mil jayen to true */
export function matchesWork(name: string, query: string): boolean {
  const q = norm(query)
  if (!q) return true
  const n = norm(name)
  if (n.includes(q)) return true
  const tokens = q.split(' ')
  if (tokens.every((t) => n.includes(t))) return true
  if (q.length < 2) return false
  return GROUPS.some((g) => g.test.test(name) && g.words.some((w) => w.includes(q) || q.includes(w)))
}

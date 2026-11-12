const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ ]+/g, ' ').replace(/\s+/g, ' ').trim()

function lev(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[b.length]
}

const wordLike = (a: string, b: string) => a === b || (a.length >= 3 && b.startsWith(a)) || (b.length >= 3 && a.startsWith(b)) || (Math.min(a.length, b.length) >= 4 && lev(a, b) <= 1)

/**
 * Likhe hue naam se milte julte list ke naam (spelling ka farq, adhoora lafz).
 * Bilkul wahi naam "milta julta" nahi ginta: wo to list ka apna naam hai.
 */
export function similarNames(typed: string, names: string[], max = 3): string[] {
  const t = norm(typed)
  if (t.length < 4) return []
  const tw = t.split(' ')
  const scored: { n: string; s: number }[] = []
  for (const n of names) {
    const c = norm(n)
    if (!c || c === t) continue
    const cw = c.split(' ')
    const whole = lev(t.replace(/ /g, ''), c.replace(/ /g, ''))
    const close = whole <= Math.max(1, Math.floor(Math.min(t.length, c.length) * 0.2))
    const allWords = tw.every((w) => cw.some((x) => wordLike(w, x)))
    const sameCount = Math.abs(tw.length - cw.length) <= 1
    if (close) scored.push({ n, s: whole })
    else if (allWords && sameCount) scored.push({ n, s: 5 + Math.abs(c.length - t.length) })
  }
  return scored.sort((a, b) => a.s - b.s).slice(0, max).map((x) => x.n)
}

/** Sab se zyada chalne wale naam, ginti ke hisab se (barabar hon to pehle wala pehle) */
export function topUsed(names: string[], max = 8): string[] {
  const n = new Map<string, { name: string; c: number; i: number }>()
  names.forEach((raw, i) => {
    const name = raw.trim()
    if (!name) return
    const k = name.toLowerCase()
    const e = n.get(k)
    if (e) e.c++
    else n.set(k, { name, c: 1, i })
  })
  return [...n.values()].sort((a, b) => b.c - a.c || a.i - b.i).slice(0, max).map((x) => x.name)
}

/** Rang ke upar likhne ke liye text ka rang: gehre rang par safed, halke par gehra. CSS variable wala (software ka rang) gehra maana jata hai. */
export function isLightColor(c: string): boolean {
  const m = /^#([0-9a-fA-F]{6})$/.exec(c.trim())
  if (!m) return false
  const n = parseInt(m[1], 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  const lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  return lum > 0.45
}
export const onColor = (bg: string) => (isLightColor(bg) ? { fg: '#111827', line: 'rgba(17,24,39,0.3)' } : { fg: '#ffffff', line: 'rgba(255,255,255,0.3)' })
/** Safed kaghaz par rang ka text: bohat halka rang ho to gehra kar do */
export const inkOnWhite = (c: string) => (isLightColor(c) ? '#111827' : c)

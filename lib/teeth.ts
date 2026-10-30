/**
 * Daanton ki numbering.
 *
 * Andar (database mein) FDI numbers hi rehte hain (11-18, 21-28, 31-38,
 * 41-48) kyunke wo bilkul saaf hote hain, koi confusion nahi.
 *
 * Lekin doctor ko wahi dikhta hai jo Pakistan mein chalta hai:
 * har quadrant mein 1 se 8, wast se shuru, aur 8 = aqal daarh.
 */

export const QUADRANTS = {
  upperRight: { label: 'Upper Right', short: 'UR', prefix: '1' },
  upperLeft: { label: 'Upper Left', short: 'UL', prefix: '2' },
  lowerLeft: { label: 'Lower Left', short: 'LL', prefix: '3' },
  lowerRight: { label: 'Lower Right', short: 'LR', prefix: '4' },
} as const

/** FDI '16' se local number '6' nikalta hai */
export function localNumber(fdi: string) {
  return fdi.slice(1)
}

/** FDI '16' se quadrant ka short naam 'UR' nikalta hai */
export function quadrantOf(fdi: string) {
  switch (fdi[0]) {
    case '1':
      return QUADRANTS.upperRight
    case '2':
      return QUADRANTS.upperLeft
    case '3':
      return QUADRANTS.lowerLeft
    case '4':
      return QUADRANTS.lowerRight
    default:
      return null
  }
}

/** Poora label jaise "UR 6" — jahan quadrant saaf na ho wahan istemaal karein */
export function toothLabel(fdi: string) {
  const q = quadrantOf(fdi)
  return q ? `${q.short} ${localNumber(fdi)}` : fdi
}

/** Aqal daarh (wisdom tooth) hai ya nahi */
export function isWisdom(fdi: string) {
  return localNumber(fdi) === '8'
}

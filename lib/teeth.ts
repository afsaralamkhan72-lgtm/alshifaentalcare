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

/** Bachon ka (doodh ka) daant? FDI 51-55, 61-65, 71-75, 81-85 */
export function isPrimary(fdi: string) {
  return /^[5-8][1-5]$/.test(fdi)
}

/** FDI '16' (ya bachon ka '55') se quadrant ka short naam 'UR' nikalta hai */
export function quadrantOf(fdi: string) {
  switch (fdi[0]) {
    case '1':
    case '5':
      return QUADRANTS.upperRight
    case '2':
    case '6':
      return QUADRANTS.upperLeft
    case '3':
    case '7':
      return QUADRANTS.lowerLeft
    case '4':
    case '8':
      return QUADRANTS.lowerRight
    default:
      return null
  }
}

/** Screen par daant ka naam: pakke daant 1-8, bachon ke daant A-E (jaise "UR E") */
export function toothName(fdi: string) {
  return isPrimary(fdi) ? 'ABCDE'[Number(fdi[1]) - 1] : localNumber(fdi)
}

/** Bachon ke daant: rows usi tarteeb mein jaise pakke daant (wast se bahar) */
export const PRIMARY = {
  upperRight: ['55', '54', '53', '52', '51'],
  upperLeft: ['61', '62', '63', '64', '65'],
  lowerRight: ['85', '84', '83', '82', '81'],
  lowerLeft: ['71', '72', '73', '74', '75'],
}

/** Poora label jaise "UR 6" — jahan quadrant saaf na ho wahan istemaal karein */
export function toothLabel(fdi: string) {
  const q = quadrantOf(fdi)
  return q ? `${q.short} ${toothName(fdi)}` : fdi
}

/** Aqal daarh (wisdom tooth) hai ya nahi */
export function isWisdom(fdi: string) {
  return localNumber(fdi) === '8'
}

const ADULT_NAMES = ['', 'Central Incisor', 'Lateral Incisor', 'Canine', 'First Premolar', 'Second Premolar', 'First Molar', 'Second Molar', 'Wisdom Tooth']
const MILK_NAMES = ['', 'Central Incisor', 'Lateral Incisor', 'Canine', 'First Molar', 'Second Molar']

/** Daant ka poora naam jaise "Upper Right Wisdom Tooth" (UR 8 ki jagah). Doodh ke daant: "Upper Right Milk First Molar (D)". */
export function toothTitle(fdi: string) {
  const q = quadrantOf(fdi)
  if (!q) return fdi
  const n = Number(fdi[1])
  if (isPrimary(fdi)) return `${q.label} Milk ${MILK_NAMES[n] ?? ''} (${toothName(fdi)})`.replace('  ', ' ')
  return `${q.label} ${ADULT_NAMES[n] ?? toothName(fdi)}`
}

/**
 * Treatment daant par lagti hai ya poore muh par?
 *  tooth = har daant ki (filling, RCT, extraction, crown ...)
 *  mouth = poora muh (scaling, polishing ...)
 *  jaw   = upar / neeche ka jabda (braces, dentures ...)
 *  once  = aik dafa ka charge (consultation, x-ray ...)
 * Database mein khali ho to naam dekh kar andaza; Settings mein chunne par wohi chalta hai.
 */
export type Applies = 'tooth' | 'mouth' | 'jaw' | 'once'

export function guessApplies(name: string): Applies {
  const n = name.toLowerCase()
  // pehle "aik dafa" wale (consultation, adjustment visit, x-ray), taake "Braces Adjustment Visit" jabde ki qeemat na ban jaye
  if (/(consult|check ?-?up|adjust|x-?ray|opg|radiograph|report|certificate)/.test(n)) return 'once'
  if (/(scaling|polish|fluoride|whiten|bleach|cleaning|prophy|sealant)/.test(n)) return 'mouth'
  if (/(brace|aligner|denture|retainer|ortho)/.test(n)) return 'jaw'
  return 'tooth'
}

export const effectiveApplies = (c: { name: string; applies_to?: string | null }): Applies =>
  c.applies_to === 'tooth' || c.applies_to === 'mouth' || c.applies_to === 'jaw' || c.applies_to === 'once' ? c.applies_to : guessApplies(c.name)

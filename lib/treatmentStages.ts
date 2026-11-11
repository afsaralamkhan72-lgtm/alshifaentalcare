export const STAGE_TEMPLATES: { re: RegExp; stages: string[] }[] = [
  { re: /braces|aligner|ortho/i, stages: ['Records / X-ray / impression', 'Braces lagaye', 'Mahana adjustment (jaari)', 'Braces utare', 'Retainer lagaya'] },
  { re: /implant/i, stages: ['Planning / CBCT', 'Implant surgery', 'Healing (3-6 mahine)', 'Abutment / impression', 'Crown fit'] },
  { re: /denture/i, stages: ['Impression', 'Bite / try-in', 'Denture fit', 'Review / adjustment'] },
  { re: /root canal|\brct\b|pulpectomy/i, stages: ['X-ray aur tashkhees', 'Sunn karna (anaesthesia)', 'Access opening', 'Working length', 'Canal ki safai aur shaping', 'Dawa rakhna + temporary filling', 'Canal bharai (obturation)', 'Pakki filling / core build-up'] },
  { re: /bridge/i, stages: ['Daant tarashna aur naap', 'Trial', 'Bridge fit'] },
  { re: /crown|\bcap\b|veneer/i, stages: ['Daant tarashna aur naap', 'Lab se tayyar', 'Fit'] },
]

export function stagesFor(name: string): string[] {
  return STAGE_TEMPLATES.find((x) => x.re.test(name))?.stages ?? []
}

export const MONTHLY_RE = /braces|aligner|ortho/i
export const LAB_WORK_RE = /crown|bridge|denture|veneer|onlay|inlay|post\s*&?\s*core|night\s*guard|retainer/i

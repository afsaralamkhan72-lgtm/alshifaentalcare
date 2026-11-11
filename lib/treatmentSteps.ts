export function defaultSteps(name: string): string[] {
  if (/root canal|\brct\b|pulpectomy/i.test(name)) return ['RCT shuru (canal ki safai)', 'RCT mukammal (canal bharai)', 'Crown ka naap', 'Crown fit']
  if (/bridge/i.test(name)) return ['Daant tarashna aur naap', 'Trial', 'Bridge fit']
  if (/crown|\bcap\b|veneer/i.test(name)) return ['Daant tarashna aur naap', 'Lab se tayyar', 'Fit']
  if (/denture/i.test(name)) return ['Naap', 'Trial', 'Fitting']
  if (/ortho|brace|aligner/i.test(name)) return ['Braces / aligner lagaye', 'Mahana visit', 'Braces utaray / retainer']
  return []
}

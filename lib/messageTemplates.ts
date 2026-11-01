import { CLINIC } from '@/clinic.config'

export type Tpl = Record<string, string>

export const TEMPLATE_DEFAULTS: { key: string; label: string; body: string }[] = [
  { key: 'appt_confirm', label: 'Appointment confirm', body: '{salaam}\nAap ki appointment {treatment} {date} {time} par confirm hai {doctor}.\n\n{clinic}' },
  { key: 'appt_reminder', label: 'Appointment yaad dehani', body: '{salaam}\nYaad dehani: aap ki appointment {treatment} {date} {time} par hai {doctor}. Na aa saken to baraye meherbani bata dein.\n\n{clinic}' },
  { key: 'appt_reschedule', label: 'Appointment nayi tareekh', body: '{salaam}\nAap ki appointment ki nayi tareekh {date} {time} hai {doctor}.\n\n{clinic}' },
  { key: 'visit_thanks', label: 'Visit ke baad shukriya', body: '{salaam}\nAaj aap ne {clinic} mein tashreef laye, shukriya. Allah aap ko jald sehat de.\n\n{clinic}' },
  { key: 'baqaya', label: 'Baqaya yaad dehani', body: '{salaam}\n{clinic} mein aap ka baqaya Rs. {balance} hai. Agli visit par ya EasyPaisa/JazzCash par ada kar dein.\n\nShukriya\n{clinic}' },
  { key: 'missed', label: 'Appointment par nahi aaye', body: '{salaam}\nAap aaj appointment par nahi aa sake. Naya waqt lene ke liye hum se raabta karein.\n\n{clinic}' },
  { key: 'followup', label: 'Follow-up', body: '{salaam}\nAap ka follow-up due hai. Tashreef le aayein ya waqt le lein.\n\n{clinic}' },
  { key: 'recall', label: 'Recall (Scaling / Check-up)', body: '{salaam}\nAap ka {treatment} ka waqt ho gaya hai. Naya waqt lene ke liye raabta karein.\n\n{clinic}' },
  { key: 'lab_ready', label: 'Lab ka kaam tayyar', body: '{salaam}\nAap ka {treatment} tayyar hai. Fit karwane ke liye tashreef le aayein.\n\n{clinic}' },
  { key: 'statement', label: 'Payment Statement (Urdu)', body: '{adab}\n\nالسلام علیکم\nدرود شریف\n\nمریض: {name}\nکل بقایا: Rs. {balance}\n\nعلاج کی تفصیل:\n{treatments}\n\nادائیگی (Easypaisa / JazzCash): {easypaisa}\n\nآن لائن دیکھیں: {link}\nAccess code: {code}\n\nشکریہ\n{clinic}' },
]

export const PLACEHOLDERS = ['{salaam}', '{adab}', '{name}', '{date}', '{time}', '{doctor}', '{treatment}', '{balance}', '{treatments}', '{easypaisa}', '{link}', '{code}', '{clinic}']

export function mapTemplates(rows: { key: string; body: string }[] | null | undefined): Tpl {
  const t: Tpl = {}
  for (const r of rows ?? []) if (r.body?.trim()) t[r.key] = r.body
  return t
}

/** Jins ke hisaab se salaam: mard -> "Muhtaram ... Sahib", aurat -> "Muhtarma ... Sahiba", warna sirf naam */
/** Sirf adab wala naam (salaam ke bagair): mard "محترم X صاحب", aurat "محترمہ X صاحبہ", warna sirf naam */
export function adabName(name: string, gender?: string | null): string {
  const g = (gender ?? '').toLowerCase()
  const n = name.trim()
  if (g.startsWith('f')) return `محترمہ ${n} صاحبہ`
  if (g.startsWith('m')) return `محترم ${n} صاحب`
  return n
}

export function salaamLine(name: string, gender?: string | null): string {
  const g = (gender ?? '').toLowerCase()
  const n = name.trim()
  if (g.startsWith('f')) return `Assalam o Alaikum, محترمہ ${n} صاحبہ`
  if (g.startsWith('m')) return `Assalam o Alaikum, محترم ${n} صاحب`
  return `Assalam o Alaikum ${n}`
}

export function renderTemplate(key: string, vars: Record<string, string | number | null | undefined>, tpl?: Tpl): string {
  const body = tpl?.[key] ?? TEMPLATE_DEFAULTS.find((d) => d.key === key)?.body ?? ''
  const all: Record<string, string> = { clinic: [CLINIC.name, CLINIC.address.full, CLINIC.phone.display].join('\n'), easypaisa: CLINIC.payments.easypaisa }
  for (const [k, v] of Object.entries(vars)) all[k] = v == null ? '' : String(v)
  return body
    .replace(/\{(\w+)\}/g, (_m, k: string) => all[k] ?? '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

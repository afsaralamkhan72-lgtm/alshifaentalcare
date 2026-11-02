import { CLINIC } from '@/clinic.config'

export type Tpl = Record<string, string>

/** Doosri jagah (Settings) se badli ja sakti hai. Header / footer har message mein {header} / {footer} se lagte hain. */
export const DAROOD_LINE = '🌹 اگر آپ نے آج درودِ پاک نہیں پڑھا تو چند لمحے نکال کر نبی کریم ﷺ کی بارگاہ میں درود و سلام کا نذرانہ پیش کیجیے۔'

export const TEMPLATE_DEFAULTS: { key: string; label: string; body: string }[] = [
  { key: 'msg_header', label: 'Har message ka shuru (salaam + darood + naam)', body: `السلام علیکم ورحمۃ اللہ وبرکاتہ\n\nﷺ صَلَّى اللّٰهُ عَلَيْهِ وَسَلَّمَ ﷺ\n\n${DAROOD_LINE}\n\n{adab}` },
  { key: 'msg_footer', label: 'Har message ka aakhir (doctor, clinic, pata, phone)', body: '{doctor_name}\n{clinic_name}\n{address}\n{phone}\n\nآپ کی صحت، ہماری ذمہ داری 🌿' },
  { key: 'appt_confirm', label: 'Appointment confirm', body: '{header}\n\nآپ کی اپائنٹمنٹ کنفرم ہو گئی ہے۔\n\n📅 تاریخ: {date}\n🕐 وقت: {time}\n🦷 علاج: {treatment}\n👨‍⚕️ ڈاکٹر: {doctor}\n\n{footer}' },
  { key: 'appt_reminder', label: 'Appointment yaad dehani', body: '{header}\n\nآپ کی اپائنٹمنٹ کی یاد دہانی ہے۔\n\n📅 تاریخ: {date}\n🕐 وقت: {time}\n🦷 علاج: {treatment}\n👨‍⚕️ ڈاکٹر: {doctor}\n\nاگر آپ نہ آ سکیں تو براہِ مہربانی ہمیں پہلے بتا دیں۔\n\n{footer}' },
  { key: 'appt_reschedule', label: 'Appointment nayi tareekh', body: '{header}\n\nآپ کی اپائنٹمنٹ کی نئی تاریخ مقرر کر دی گئی ہے۔\n\n📅 تاریخ: {date}\n🕐 وقت: {time}\n👨‍⚕️ ڈاکٹر: {doctor}\n\n{footer}' },
  { key: 'visit_thanks', label: 'Visit ke baad shukriya', body: '{header}\n\nآج آپ نے ہمارے کلینک میں تشریف لا کر ہمیں عزت بخشی، شکریہ۔ اللہ تعالیٰ آپ کو جلد مکمل صحت عطا فرمائے، آمین۔\n\n{footer}' },
  { key: 'baqaya', label: 'Baqaya yaad dehani', body: '{header}\n\nآپ کے حساب کی یاد دہانی:\n\n💰 موجودہ بقایا: Rs. {balance}\n\nبراہِ مہربانی اگلی visit پر یا Easypaisa / JazzCash پر ادا کر دیں: {easypaisa}\n\n{footer}' },
  { key: 'missed', label: 'Appointment par nahi aaye', body: '{header}\n\nآپ اپنی اپائنٹمنٹ پر تشریف نہیں لا سکے۔ نیا وقت لینے کے لیے براہِ مہربانی ہم سے رابطہ فرمائیں۔\n\n{footer}' },
  { key: 'followup', label: 'Follow-up', body: '{header}\n\nآپ کا فالو اپ (دوبارہ معائنہ) واجب ہے۔\n\n📅 تاریخ: {date}\n🦷 علاج: {treatment}\n\nبراہِ مہربانی تشریف لے آئیں یا ہم سے وقت لے لیں۔\n\n{footer}' },
  { key: 'recall', label: 'Recall (Scaling / Check-up)', body: '{header}\n\nآپ کے دانتوں کے معائنے / صفائی کا وقت ہو گیا ہے۔\n\n🦷 {treatment}\n\nنیا وقت لینے کے لیے براہِ مہربانی ہم سے رابطہ فرمائیں۔\n\n{footer}' },
  { key: 'lab_ready', label: 'Lab ka kaam tayyar', body: '{header}\n\nآپ کا کام تیار ہو گیا ہے۔\n\n🦷 {treatment}\n\nفٹ کروانے کے لیے براہِ مہربانی تشریف لے آئیں۔\n\n{footer}' },
  { key: 'statement', label: 'Payment Statement', body: '{header}\n\nPayment Statement ({mr})\nمریض: {name}\n\n📋 اکاؤنٹ کی تفصیلات\n\nپرانا بقایا: Rs. {old_balance}\nآج کے کام کے کل چارجز: Rs. {today_charges}\nآج موصول شدہ رقم: Rs. {today_received}\n\nموجودہ بقایا: Rs. {balance}\n\n{treatments_block}\n━━━━━━━━━━━━━━\n\nادائیگی کا خلاصہ\n\nکل چارجز: Rs. {total_charges}\nکل موصول شدہ رقم: Rs. {total_received}\nبقایا رقم: Rs. {balance}\n\n━━━━━━━━━━━━━━\n\nادائیگی (Easypaisa / JazzCash): {easypaisa}\n\n📱 اپنا ریکارڈ خود بھی دیکھیں\n\n{link}\n\nذاتی ایکسس کوڈ:\n{code}\n\n🔒 یہ لنک اور کوڈ صرف آپ کے ذاتی استعمال کے لیے ہیں۔ کسی دوسرے کے ساتھ شیئر نہ کریں۔\n\n{footer}' },
  { key: 'receipt', label: 'Payment ki rasid', body: '{header}\n\nآپ کی ادائیگی موصول ہو گئی ہے، شکریہ۔\n\n✅ موصول شدہ رقم: Rs. {amount}\n📅 تاریخ: {paid_date}\n💳 طریقہ: {method}\n\nپہلے کا بقایا: Rs. {old_balance}\nموجودہ بقایا: Rs. {balance}\n{settled_line}\n\n📱 اپنا ریکارڈ دیکھیں:\n{link}\n\nذاتی ایکسس کوڈ:\n{code}\n\n{footer}' },
]

export const PLACEHOLDERS = ['{header}', '{footer}', '{adab}', '{name}', '{mr}', '{date}', '{time}', '{doctor}', '{treatment}', '{balance}', '{old_balance}', '{today_charges}', '{today_received}', '{total_charges}', '{total_received}', '{treatments_block}', '{amount}', '{paid_date}', '{method}', '{easypaisa}', '{link}', '{code}', '{doctor_name}', '{clinic_name}', '{address}', '{phone}']

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

/** Jis line ki sari nishaniyan khali hon wo line hata di jati hai (jaise "علاج:" jab koi treatment na ho). */
function fillLines(text: string, all: Record<string, string>): string {
  return text
    .split('\n')
    .map((line) => {
      const phs = [...line.matchAll(/\{(\w+)\}/g)]
      if (!phs.length) return line
      const out = line.replace(/\{(\w+)\}/g, (_m, k: string) => all[k] ?? '')
      return phs.every((m) => !(all[m[1]] ?? '').trim()) ? null : out
    })
    .filter((l): l is string => l !== null)
    .join('\n')
}

export function renderTemplate(key: string, vars: Record<string, string | number | null | undefined>, tpl?: Tpl): string {
  const def = (k: string) => TEMPLATE_DEFAULTS.find((d) => d.key === k)?.body ?? ''
  // Purani SQL ne kuch templates mein asli line ki jagah "\n" likha chora tha: use asli line bana do
  const unesc = (t: string) => t.replace(/\\n/g, '\n')
  const body = unesc(tpl?.[key] ?? def(key))
  const all: Record<string, string> = {
    clinic: [CLINIC.name, CLINIC.address.full, CLINIC.phone.display].join('\n'),
    clinic_name: CLINIC.name,
    address: CLINIC.address.full,
    phone: CLINIC.phone.display,
    doctor_name: CLINIC.doctor.name,
    easypaisa: CLINIC.payments.easypaisa,
  }
  for (const [k, v] of Object.entries(vars)) all[k] = v == null ? '' : String(v)
  all.header = fillLines(unesc(tpl?.msg_header ?? def('msg_header')), all)
  all.footer = fillLines(unesc(tpl?.msg_footer ?? def('msg_footer')), all)
  return fillLines(body, all)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

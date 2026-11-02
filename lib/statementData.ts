import type { SupabaseClient } from '@supabase/supabase-js'
import { SITE_URL } from '@/clinic.config'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { fmtDate, todayKarachi } from '@/lib/karachi'
import { adabName, mapTemplates, renderTemplate, salaamLine } from '@/lib/messageTemplates'

/**
 * Statement / Rasid ka message BHEJTE WAQT database se naye sire se bana kar dete hain
 * (purane khule page ka purana hisaab nahi). Sab hisaab database ke views (patient_balances / patient_ledger) se.
 */
const n = (v: unknown) => Number(v ?? 0)
const rs = (v: number) => v.toLocaleString('en-US')

const METHOD_UR: Record<string, string> = { cash: 'نقد (Cash)', bank: 'بینک (Bank)', easypaisa: 'Easypaisa', jazzcash: 'JazzCash' }

interface Pt {
  id: string
  full_name: string
  phone: string
  gender: string | null
  mr_number: string | null
  portal_code: string | null
}

async function loadPatient(sb: SupabaseClient, patientId: string): Promise<Pt | null> {
  const { data } = await sb
    .from('patients')
    .select('id, full_name, phone, gender, mr_number, portal_code, deleted_at')
    .eq('id', patientId)
    .is('deleted_at', null)
    .maybeSingle()
  return (data as Pt | null) ?? null
}

async function loadTpl(sb: SupabaseClient) {
  const { data } = await sb.from('message_templates').select('key, body')
  return mapTemplates(data as { key: string; body: string }[] | null)
}

async function currentBalance(sb: SupabaseClient, patientId: string): Promise<number> {
  const { data } = await sb.from('patient_balances').select('balance').eq('patient_id', patientId).maybeSingle()
  return n((data as { balance?: number } | null)?.balance)
}

interface Line { name: string; tooth: string | null; qty: number; amount: number }

function formatLines(lines: Line[]): string {
  if (!lines.length) return ''
  const body = lines
    .map((l, i) => {
      const parts = [`${i + 1}. ${l.name}`]
      if (l.tooth) parts.push(`   دانت نمبر: ${l.tooth}`)
      if (l.qty > 1) parts.push(`   تعداد: ${l.qty}`)
      parts.push(`   رقم: Rs. ${rs(l.amount)}`)
      return parts.join('\n')
    })
    .join('\n\n')
  return `🦷 علاج کی تفصیلات (Treatment Details)\n\n${body}\n`
}

/** Aaj ka kaam (invoice ki cheezein); na ho to wo cheezein jin ka baqaya abhi baqi hai */
async function treatmentLines(sb: SupabaseClient, patientId: string, today: string): Promise<Line[]> {
  const itemsOf = async (invoiceIds: string[]): Promise<Line[]> => {
    if (!invoiceIds.length) return []
    const { data } = await sb.from('invoice_items').select('name, tooth, qty, line_total').in('invoice_id', invoiceIds)
    return ((data ?? []) as { name: string; tooth: string | null; qty: number; line_total: number }[]).map((r) => ({
      name: r.name,
      tooth: r.tooth,
      qty: n(r.qty),
      amount: n(r.line_total),
    }))
  }
  const { data: todays } = await sb.from('invoices').select('id').eq('patient_id', patientId).eq('invoice_date', today).eq('status', 'active')
  let lines = await itemsOf(((todays ?? []) as { id: string }[]).map((r) => r.id))
  if (lines.length) return lines
  const { data: open } = await sb
    .from('invoices')
    .select('id')
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .gt('balance', 0)
    .order('invoice_date', { ascending: false })
    .limit(10)
  lines = await itemsOf(((open ?? []) as { id: string }[]).map((r) => r.id))
  return lines
}

function build(key: string, p: Pt, vars: Record<string, string | number | null>, tpl: Record<string, string>) {
  const text = renderTemplate(
    key,
    {
      salaam: salaamLine(p.full_name, p.gender),
      adab: adabName(p.full_name, p.gender),
      name: p.full_name,
      mr: p.mr_number ?? '',
      link: p.portal_code ? `${SITE_URL}/portal/${p.portal_code}` : '',
      code: p.portal_code ?? '',
      ...vars,
    },
    tpl
  )
  return { text, url: buildWhatsAppLink({ phoneOverride: p.phone, customMessage: text }) }
}

export async function buildStatement(sb: SupabaseClient, patientId: string) {
  const p = await loadPatient(sb, patientId)
  if (!p) return null
  const today = todayKarachi()
  const [tpl, balance, led, lines] = await Promise.all([
    loadTpl(sb),
    currentBalance(sb, patientId),
    sb.from('patient_ledger').select('charge, payment').eq('patient_id', patientId).eq('entry_date', today),
    treatmentLines(sb, patientId, today),
  ])
  const rows = (led.data ?? []) as { charge: number; payment: number }[]
  const todayCharges = rows.reduce((s, r) => s + n(r.charge), 0)
  const todayReceived = rows.reduce((s, r) => s + n(r.payment), 0)
  const oldBalance = Math.max(0, balance - todayCharges + todayReceived)
  return build(
    'statement',
    p,
    {
      balance: rs(balance),
      old_balance: rs(oldBalance),
      today_charges: rs(todayCharges),
      today_received: rs(todayReceived),
      total_charges: rs(oldBalance + todayCharges),
      total_received: rs(todayReceived),
      treatments_block: formatLines(lines),
    },
    tpl
  )
}

/**
 * Rasid. `justPaid` = true: abhi abhi li gayi payment (pehle ka baqaya = mojooda + ye rakam).
 * Purani payment ki rasid mein "pehle ka baqaya" nahi likhte (wo us waqt ka hisaab ab dobara nahi nikalta).
 */
export async function buildReceipt(
  sb: SupabaseClient,
  patientId: string,
  opts: { amount: number; method?: string | null; date?: string | null; justPaid: boolean }
) {
  const p = await loadPatient(sb, patientId)
  if (!p) return null
  const [tpl, balance] = await Promise.all([loadTpl(sb), currentBalance(sb, patientId)])
  return build(
    'receipt',
    p,
    {
      amount: rs(opts.amount),
      paid_date: fmtDate(opts.date || todayKarachi()),
      method: opts.method ? METHOD_UR[opts.method] ?? opts.method : '',
      old_balance: opts.justPaid ? rs(balance + opts.amount) : '',
      balance: rs(balance),
      settled_line: balance <= 0 ? '✅ آپ کا مکمل حساب ادا ہو چکا ہے، شکریہ۔' : '',
    },
    tpl
  )
}

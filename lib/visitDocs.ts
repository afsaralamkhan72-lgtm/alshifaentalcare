import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BillPart } from '@/components/print/Duo'
import type { RxItem, RxSheetData } from '@/components/PrescriptionSheet'

type InvRow = { id: string; invoice_number: string; subtotal: number; discount_amount: number; total: number; paid_amount: number; balance: number; invoice_items: { name: string; tooth: string | null; qty: number; unit_price: number; line_total: number }[] }

/** Prescription ke sath usi visit ka bill (aik se zyada invoice hon to sab mila kar). Visit ka link na ho to usi din ke bill. */
export async function billForRx(
  supabase: SupabaseClient,
  rx: { patient_id: string; clinical_visit_id: string | null; prescribed_date: string }
): Promise<{ bill: BillPart | null; href: string | null }> {
  let q = supabase
    .from('invoices')
    .select('id, invoice_number, subtotal, discount_amount, total, paid_amount, balance, invoice_items(name, tooth, qty, unit_price, line_total)')
    .eq('patient_id', rx.patient_id)
    .neq('status', 'void')
    .order('created_at')
  q = rx.clinical_visit_id ? q.eq('clinical_visit_id', rx.clinical_visit_id) : q.eq('invoice_date', rx.prescribed_date)
  const { data, error } = await q
  const invs = (error ? [] : data ?? []) as unknown as InvRow[]
  if (!invs.length) return { bill: null, href: null }
  const sum = (f: (i: InvRow) => number) => invs.reduce((s, i) => s + Number(f(i)), 0)
  const bill: BillPart = {
    id: invs[0].id,
    numbers: invs.map((i) => i.invoice_number),
    items: invs.flatMap((i) => (i.invoice_items ?? []).map((it) => ({ name: it.name, tooth: it.tooth, qty: Number(it.qty), unit_price: Number(it.unit_price), line_total: Number(it.line_total) }))),
    subtotal: sum((i) => i.subtotal),
    discount: sum((i) => i.discount_amount),
    total: sum((i) => i.total),
    paid: sum((i) => i.paid_amount),
    balance: sum((i) => i.balance),
  }
  const href = invs.length === 1 ? '/admin/invoices/' + invs[0].id : rx.clinical_visit_id ? '/admin/visits/' + rx.clinical_visit_id + '/invoice' : '/admin/invoices/' + invs[0].id
  return { bill, href }
}

/** Bill ke sath usi visit ki (sab se nayi) prescription. Visit ka link na ho to usi din ki. */
export async function rxForInvoice(
  supabase: SupabaseClient,
  inv: { patient_id: string; clinical_visit_id: string | null; invoice_date: string },
  patient: RxSheetData['patient']
): Promise<{ rx: RxSheetData | null; rxId: string | null }> {
  let q = supabase
    .from('prescriptions')
    .select('id, items, notes_en, notes_ur, prescribed_date')
    .eq('patient_id', inv.patient_id)
    .order('created_at', { ascending: false })
    .limit(1)
  q = inv.clinical_visit_id ? q.eq('clinical_visit_id', inv.clinical_visit_id) : q.eq('prescribed_date', inv.invoice_date)
  const { data, error } = await q
  const r = (error ? [] : data ?? [])[0] as { id: string; items: RxItem[] | null; notes_en: string | null; notes_ur: string | null; prescribed_date: string } | undefined
  if (!r || !(r.items ?? []).length) return { rx: null, rxId: null }
  return { rx: { items: r.items ?? [], notes_en: r.notes_en, notes_ur: r.notes_ur, prescribed_date: r.prescribed_date, treatmentName: null, patient }, rxId: r.id }
}

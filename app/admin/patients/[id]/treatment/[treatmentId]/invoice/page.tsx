import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requirePerm } from '@/lib/auth'
import { CLINIC } from '@/clinic.config'
import { fmtDate, money, numFmt } from '@/lib/karachi'
import { toothTitle } from '@/lib/teeth'
import SheetPrintButton from '@/components/admin/SheetPrintButton'
import DocShare from '@/components/print/DocShare'
import { DocHead, DocFoot } from '@/components/print/DocFrame'

export const dynamic = 'force-dynamic'

type Inv = { id: string; invoice_number: string; invoice_date: string; subtotal: number; discount_amount: number; total: number; paid_amount: number; invoice_items: { name: string; tooth: string | null; qty: number; unit_price: number; line_total: number | null }[] }
const METHOD: Record<string, string> = { cash: 'Cash', bank: 'Bank', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash' }
const STATUS: Record<string, string> = { planned: 'Sirf plan', active: 'Chal raha hai', completed: 'Mukammal', cancelled: 'Cancel' }
const num = (v: unknown) => Number(v) || 0

/** Ek ilaaj ka poora tafseeli invoice: qadam, visits, bill, har payment, baqaya (clinic ke invoice wale template mein) */
export default async function TreatmentInvoicePage({ params }: { params: Promise<{ id: string; treatmentId: string }> }) {
  await requirePerm('billing.view')
  const { id, treatmentId } = await params
  const supabase = await createClient()
  const [pRes, tRes] = await Promise.all([
    supabase.from('patients').select('id, full_name, mr_number, phone, deleted_at').eq('id', id).maybeSingle(),
    supabase.from('patient_treatments').select('id, patient_id, name, teeth, status, started_on, completed_on').eq('id', treatmentId).maybeSingle(),
  ])
  const p = pRes.data
  const t = tRes.data
  if (!p || p.deleted_at || !t || t.patient_id !== id) notFound()

  const [invRes, vnRes, stRes] = await Promise.all([
    supabase.from('invoices').select('id, invoice_number, invoice_date, subtotal, discount_amount, total, paid_amount, invoice_items(name, tooth, qty, unit_price, line_total)').eq('patient_treatment_id', treatmentId).neq('status', 'void').order('invoice_date').order('created_at'),
    supabase.from('visit_notes').select('id, visit_no, visit_date, procedure, notes, clinical_visit_id').eq('treatment_id', treatmentId).is('voided_at', null).order('visit_no'),
    supabase.from('treatment_stages').select('id, label, done_on, sort_order').eq('treatment_id', treatmentId).order('sort_order'),
  ])
  const invs = (invRes.data ?? []) as unknown as Inv[]
  const invIds = invs.map((i) => i.id)
  const visits = (vnRes.data ?? []) as { id: string; visit_no: number | null; visit_date: string; procedure: string | null; notes: string | null; clinical_visit_id: string | null }[]
  const cvIds = [...new Set(visits.map((v) => v.clinical_visit_id).filter((x): x is string => Boolean(x)))]
  const stages = ('error' in stRes && stRes.error ? [] : stRes.data ?? []) as { id: string; label: string; done_on: string | null }[]
  const [payRes, cvRes] = await Promise.all([
    invIds.length ? supabase.from('payments').select('id, invoice_id, kind, amount, method, paid_on, created_at').in('invoice_id', invIds).order('paid_on').order('created_at') : Promise.resolve({ data: [] }),
    cvIds.length ? supabase.from('clinical_visits').select('id, doctor').in('id', cvIds) : Promise.resolve({ data: [] }),
  ])
  const pays = (payRes.data ?? []) as { id: string; kind: string; amount: number; method: string | null; paid_on: string }[]
  const docBy = new Map(((cvRes.data ?? []) as { id: string; doctor: string | null }[]).map((c) => [c.id, c.doctor]))
  const subtotal = invs.reduce((s, i) => s + num(i.subtotal), 0)
  const discount = invs.reduce((s, i) => s + num(i.discount_amount), 0)
  const total = invs.reduce((s, i) => s + num(i.total), 0)
  const paid = invs.reduce((s, i) => s + num(i.paid_amount), 0)
  const balance = Math.round((total - paid) * 100) / 100
  const teeth = ((t.teeth ?? []) as string[]).map((x) => toothTitle(x) + ' (' + x + ')').join(', ')
  const th = 'py-1.5 text-left text-xs font-normal text-clinic-ink/50'
  const h3 = 'mt-5 border-b border-clinic-ink/20 pb-1 text-sm font-semibold text-clinic-teal'
  const msg =
    'Assalam o Alaikum ' + p.full_name + ',\n\n' + CLINIC.name + ' ka invoice\nIlaaj: ' + t.name + (teeth ? ' (' + teeth + ')' : '') + '\nKul bill: Rs. ' + numFmt(total) + '\nMila: Rs. ' + numFmt(paid) + '\nBaqaya: Rs. ' + numFmt(Math.max(0, balance))

  return (
    <div className="mx-auto max-w-3xl" data-testid="treatment-invoice">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={'/admin/patients/' + id} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-clinic-teal">
          ← Mareez ka profile
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <DocShare fileName={'Invoice-' + (p.mr_number ?? 'mareez') + '-' + t.name.replace(/[^A-Za-z0-9]+/g, '-') + '.pdf'} patientId={id} phone={p.phone ?? null} message={msg} />
          <SheetPrintButton />
        </div>
      </div>
      <div id="print-sheet" className="overflow-hidden rounded-2xl border border-clinic-teal/10 bg-white text-clinic-ink">
        <DocHead title="Invoice (ilaaj ka)" refs={invs.map((i) => i.invoice_number).join(', ')} date={null} />
        <div className="p-5 sm:p-8">
        <p className="mt-4 text-sm">
          <span className="text-clinic-ink/50">Patient: </span>
          <span className="font-semibold capitalize">{p.full_name}</span> · {p.mr_number ?? ''} · {p.phone}
        </p>
        <div className="mt-3 rounded-lg bg-clinic-mint/30 p-3 text-sm" data-testid="ti-head">
          <p className="font-semibold">{t.name}</p>
          {teeth && <p className="text-xs text-clinic-ink/70">Daant: {teeth}</p>}
          <p className="text-xs text-clinic-ink/70">
            Halat: {STATUS[t.status as string] ?? t.status}
            {t.started_on ? ' · Shuru: ' + fmtDate(t.started_on as string) : ''}
            {t.completed_on ? ' · Mukammal: ' + fmtDate(t.completed_on as string) : ''}
            {' · '}
            {visits.length} visit{visits.length === 1 ? '' : 's'}
          </p>
        </div>

        {stages.length > 0 && (
          <>
            <p className={h3}>Ilaaj ke qadam</p>
            <table className="w-full text-sm" data-testid="ti-stages">
              <tbody>
                {stages.map((s) => (
                  <tr key={s.id} className="border-b border-clinic-ink/10">
                    <td className="py-1.5">{s.label}</td>
                    <td className="py-1.5 text-right">{s.done_on ? fmtDate(s.done_on) : <span className="text-clinic-ink/50">baqi</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <p className={h3}>Visits</p>
        <table className="w-full text-sm" data-testid="ti-visits">
          <thead>
            <tr className="border-b border-clinic-ink/20">
              <th className={th}>Visit</th>
              <th className={th}>Tareekh</th>
              <th className={th}>Kya hua</th>
              <th className={th}>Doctor</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id} className="border-b border-clinic-ink/10 align-top">
                <td className="py-1.5">{v.visit_no ?? ''}</td>
                <td className="py-1.5 whitespace-nowrap">{fmtDate(v.visit_date)}</td>
                <td className="py-1.5">{[v.procedure, v.notes].filter(Boolean).join(' — ') || '—'}</td>
                <td className="py-1.5">{(v.clinical_visit_id && docBy.get(v.clinical_visit_id)) || ''}</td>
              </tr>
            ))}
            {visits.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-clinic-ink/50">
                  Abhi koi visit nahi.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <p className={h3}>Bill</p>
        <table className="w-full text-sm" data-testid="ti-items">
          <thead>
            <tr className="border-b border-clinic-ink/20">
              <th className={th}>Tafseel</th>
              <th className={th + ' text-right'}>Tadaad</th>
              <th className={th + ' text-right'}>Qeemat</th>
              <th className={th + ' text-right'}>Raqam</th>
            </tr>
          </thead>
          <tbody>
            {invs.flatMap((i) =>
              (i.invoice_items ?? []).map((it, k) => (
                <tr key={i.id + k} className="border-b border-clinic-ink/10">
                  <td className="py-1.5">
                    {it.name}
                    {it.tooth ? <span className="text-clinic-ink/50"> ({it.tooth})</span> : null}
                    <span className="text-xs text-clinic-ink/40"> · {fmtDate(i.invoice_date)}</span>
                  </td>
                  <td className="py-1.5 text-right">{it.qty}</td>
                  <td className="py-1.5 text-right">{money(it.unit_price)}</td>
                  <td className="py-1.5 text-right">{money(it.line_total ?? num(it.qty) * num(it.unit_price))}</td>
                </tr>
              )),
            )}
            {invs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-clinic-ink/50">
                  Is ilaaj ka abhi koi bill nahi bana.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <p className={h3}>Payments</p>
        <table className="w-full text-sm" data-testid="ti-pays">
          <thead>
            <tr className="border-b border-clinic-ink/20">
              <th className={th}>Tareekh</th>
              <th className={th}>Tareeqa</th>
              <th className={th + ' text-right'}>Raqam</th>
            </tr>
          </thead>
          <tbody>
            {pays.map((x) => (
              <tr key={x.id} className="border-b border-clinic-ink/10" data-testid="ti-pay">
                <td className="py-1.5">{fmtDate(x.paid_on)}</td>
                <td className="py-1.5">
                  {METHOD[x.method ?? ''] ?? x.method ?? ''}
                  {x.kind === 'refund' ? ' (wapsi)' : ''}
                </td>
                <td className={'py-1.5 text-right ' + (x.kind === 'refund' ? 'text-red-600' : 'text-emerald-700')}>
                  {x.kind === 'refund' ? '- ' : ''}
                  {money(x.amount)}
                </td>
              </tr>
            ))}
            {pays.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-clinic-ink/50">
                  Abhi koi payment nahi.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-4 ml-auto grid max-w-xs gap-1 text-sm" data-testid="ti-totals">
          {discount > 0 && (
            <>
              <p className="flex justify-between">
                <span>Jor</span>
                <span>{money(subtotal)}</span>
              </p>
              <p className="flex justify-between">
                <span>Discount</span>
                <span>- {money(discount)}</span>
              </p>
            </>
          )}
          <p className="flex justify-between">
            <span>Kul bill</span>
            <span>{money(total)}</span>
          </p>
          <p className="flex justify-between">
            <span>Kul mila</span>
            <span className="text-emerald-700">{money(paid)}</span>
          </p>
          <p className="flex justify-between border-t border-clinic-ink/20 pt-1 font-semibold">
            <span>Baqaya</span>
            <span className={balance > 0 ? 'text-red-600' : ''}>{money(Math.max(0, balance))}</span>
          </p>
        </div>
        <DocFoot />
        </div>
      </div>
    </div>
  )
}

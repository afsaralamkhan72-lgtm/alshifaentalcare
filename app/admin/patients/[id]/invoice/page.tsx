import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissions, getStaffProfile, isOwnerRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CLINIC, timingsLine } from '@/clinic.config'
import { fmtDate, money, todayKarachi } from '@/lib/karachi'
import { toBalance, type LedgerRow } from '@/lib/ledger'
import SheetPrintButton from '@/components/admin/SheetPrintButton'
import StatementSheet, { type StatementData } from '@/components/print/StatementSheet'
import { getPrintCfg } from '@/lib/printSettings'

/**
 * Patient ka poora statement (sab treatments, sab bills, sab payments: purane + naye), print / PDF ke liye.
 * Pehle yahan purana "bill banao" page tha; ab bill treatment se banta hai, is liye yahan sirf statement hai.
 */
/**
 * Patient ka Payment Statement (neela-safed, software ke rang): 4 cards, baqaya ki tafseel, kis cheez ka kitna,
 * payments, poora hisaab kitab, QR. Sab data ab ke hisaab (ledger / bill / payments) se.
 */
export default async function PatientStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaffProfile()
  const perms = await getPermissions()
  if (!isOwnerRole(staff.role) && !perms.includes('billing.view')) redirect('/admin/dashboard?denied=1')
  const { id } = await params
  const supabase = await createClient()

  const { data: patient } = await supabase.from('patients').select('id, mr_number, full_name, phone, age, address').eq('id', id).maybeSingle()
  if (!patient) notFound()

  const [balRes, ledRes, invRes, cfg, clinicRes] = await Promise.all([
    supabase.from('patient_balances').select('*').eq('patient_id', id).maybeSingle(),
    supabase.from('patient_ledger').select('entry_date, sort_at, source, kind, label, charge, payment').eq('patient_id', id),
    supabase.from('invoices').select('id, invoice_number, invoice_date, subtotal, discount_amount, total, paid_amount, balance, due_date, status').eq('patient_id', id).order('invoice_date', { ascending: false }),
    getPrintCfg(),
    supabase.from('site_settings').select('value').eq('key', 'clinic_info').maybeSingle(),
  ])
  const inv = invRes.data ?? []
  const what = new Map<string, string>()
  const names = new Map<string, string>()
  const payList: { id: string; invoice_id: string; kind: string; amount: number; method: string | null; paid_on: string; reverses_payment_id: string | null }[] = []
  if (inv.length) {
    const ids = inv.map((i) => i.id as string)
    const [itemsRes, payRes] = await Promise.all([
      supabase.from('invoice_items').select('invoice_id, name, tooth').in('invoice_id', ids),
      supabase.from('payments').select('id, invoice_id, kind, amount, method, paid_on, reverses_payment_id').in('invoice_id', ids).order('paid_on', { ascending: false }),
    ])
    const byInv = new Map<string, string[]>()
    for (const it of itemsRes.data ?? []) {
      const l = byInv.get(it.invoice_id as string) ?? []
      l.push(`${it.name}${it.tooth ? ` (${it.tooth})` : ''}`)
      byInv.set(it.invoice_id as string, l)
    }
    for (const i of inv) {
      what.set(i.id as string, (byInv.get(i.id as string) ?? []).join(', '))
      names.set(i.invoice_number as string, (byInv.get(i.id as string) ?? []).join(', '))
    }
    for (const p of payRes.data ?? []) payList.push({ ...(p as typeof payList[number]), amount: Number(p.amount) })
  }
  const reversed = new Set(payList.filter((p) => p.reverses_payment_id).map((p) => p.reverses_payment_id as string))

  const today = todayKarachi()
  const rows = ((ledRes.data ?? []) as LedgerRow[])
    .map((r) => ({ ...r, charge: Number(r.charge), payment: Number(r.payment) }))
    .filter((r) => r.charge !== 0 || r.payment !== 0)
    .sort((a, b) => a.sort_at.localeCompare(b.sort_at))
  const describe = (label: string) => {
    const m = label.match(/(AS-[A-Z]+-\d+|[A-Z]+-?\d{3,})/)
    const nm = m ? names.get(m[1]) : null
    return nm ? `${label} · ${nm}` : label
  }
  let running = 0
  const book = rows.map((r) => {
    running += r.charge - r.payment
    return { date: r.entry_date, label: describe(r.label), charge: r.charge, payment: r.payment, balance: running }
  })
  const bal = balRes.data ? toBalance(balRes.data as Record<string, string | number | null>) : null
  const before = rows.filter((r) => r.entry_date < today).reduce((s, r) => s + r.charge - r.payment, 0)
  const work = rows.filter((r) => r.entry_date === today).reduce((s, r) => s + r.charge, 0)
  const paidToday = rows.filter((r) => r.entry_date === today).reduce((s, r) => s + r.payment, 0)
  const totals = { charges: bal?.total_charges ?? rows.reduce((s, r) => s + r.charge, 0), paid: bal?.total_paid ?? rows.reduce((s, r) => s + r.payment, 0), balance: bal?.balance ?? running }
  const info = (clinicRes.data?.value ?? {}) as { logo_url?: string; closed_day?: string }

  const data: StatementData = {
    patient: { id: patient.id, name: patient.full_name, mr: patient.mr_number, phone: patient.phone, age: patient.age ?? null },
    date: today,
    cards: { old: before, work, paid: paidToday, now: totals.balance },
    bills: inv.map((i) => ({
      id: i.id as string,
      date: i.invoice_date as string,
      no: i.invoice_number as string,
      what: what.get(i.id as string) ?? '',
      total: Number(i.total),
      discount: Number(i.discount_amount),
      paid: Number(i.paid_amount),
      balance: Number(i.balance),
      due: (i.due_date as string | null) ?? null,
      void: i.status === 'void',
    })),
    pays: payList.map((p) => ({ id: p.id, date: p.paid_on, what: what.get(p.invoice_id) ?? '', amount: p.amount, method: p.method, refund: p.kind === 'refund', reversed: reversed.has(p.id) || Boolean(p.reverses_payment_id) })),
    book,
    totals,
    oldBalance: bal?.old_balance && bal.old_balance > 0 ? bal.old_balance : 0,
    timings: timingsLine(info.closed_day),
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/patients/${id}`} className="text-sm text-clinic-ink/50 hover:text-clinic-teal">
          ← Patient
        </Link>
        <SheetPrintButton />
      </div>
      <StatementSheet d={data} logo={cfg.logo} logoUrl={info.logo_url ?? null} layout={cfg.layout} />
    </div>
  )
}

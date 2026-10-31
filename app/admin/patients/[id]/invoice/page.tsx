import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissions, getStaffProfile, isOwnerRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CLINIC } from '@/clinic.config'
import { fmtDate, money, todayKarachi } from '@/lib/karachi'
import { toBalance, type LedgerRow } from '@/lib/ledger'
import SheetPrintButton from '@/components/admin/SheetPrintButton'

/**
 * Patient ka poora statement (sab treatments, sab bills, sab payments: purane + naye), print / PDF ke liye.
 * Pehle yahan purana "bill banao" page tha; ab bill treatment se banta hai, is liye yahan sirf statement hai.
 */
export default async function PatientStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaffProfile()
  const perms = await getPermissions()
  if (!isOwnerRole(staff.role) && !perms.includes('billing.view')) redirect('/admin/dashboard')
  const { id } = await params
  const supabase = await createClient()

  const { data: patient } = await supabase.from('patients').select('id, mr_number, full_name, phone, age, address').eq('id', id).maybeSingle()
  if (!patient) notFound()

  const [balRes, ledRes, invRes] = await Promise.all([
    supabase.from('patient_balances').select('*').eq('patient_id', id).maybeSingle(),
    supabase.from('patient_ledger').select('entry_date, sort_at, source, kind, label, charge, payment').eq('patient_id', id),
    supabase.from('invoices').select('id, invoice_number').eq('patient_id', id),
  ])
  const inv = invRes.data ?? []
  const names = new Map<string, string>()
  if (inv.length) {
    const { data: items } = await supabase.from('invoice_items').select('invoice_id, name, tooth').in('invoice_id', inv.map((i) => i.id))
    const byInv = new Map<string, string[]>()
    for (const it of items ?? []) {
      const l = byInv.get(it.invoice_id as string) ?? []
      l.push(`${it.name}${it.tooth ? ` (${it.tooth})` : ''}`)
      byInv.set(it.invoice_id as string, l)
    }
    for (const i of inv) names.set(i.invoice_number as string, (byInv.get(i.id) ?? []).join(', '))
  }
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
  const bal = balRes.data ? toBalance(balRes.data as Record<string, string | number | null>) : null

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/patients/${id}`} className="text-sm text-clinic-ink/50 hover:text-clinic-teal">
          ← Patient
        </Link>
        <SheetPrintButton />
      </div>

      <div id="print-sheet" className="rounded-2xl border border-clinic-teal/10 bg-white p-8 text-clinic-ink">
        <header className="flex items-start justify-between border-b-2 border-clinic-teal pb-4">
          <div>
            <p className="font-display text-2xl font-semibold text-clinic-teal">{CLINIC.name}</p>
            <p className="text-xs text-clinic-ink/60">
              {CLINIC.address.full} · {CLINIC.phone.display}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-semibold">Statement</p>
            <p className="text-xs text-clinic-ink/60">{fmtDate(todayKarachi())}</p>
          </div>
        </header>

        <p className="mt-4 text-sm">
          <span className="font-semibold capitalize">{patient.full_name}</span> · {patient.mr_number} · {patient.phone}
        </p>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-clinic-ink/20 text-left text-xs text-clinic-ink/50">
              <th className="py-1.5">Tareekh</th>
              <th className="py-1.5">Tafseel</th>
              <th className="py-1.5 text-right">Charge</th>
              <th className="py-1.5 text-right">Mila</th>
              <th className="py-1.5 text-right">Baqaya</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-clinic-ink/50">
                  Koi hisaab nahi.
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              running += r.charge - r.payment
              return (
                <tr key={i} className="border-b border-clinic-ink/10 align-top">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{fmtDate(r.entry_date)}</td>
                  <td className="py-1.5 pr-2">{describe(r.label)}</td>
                  <td className="py-1.5 text-right">{r.charge ? money(r.charge) : ''}</td>
                  <td className="py-1.5 text-right text-emerald-700">{r.payment ? money(r.payment) : ''}</td>
                  <td className="py-1.5 text-right">{money(running)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {bal && (
          <div className="mt-4 ml-auto w-64 text-sm">
            <p className="flex justify-between">
              <span className="text-clinic-ink/60">Kul charges</span> <span>{money(bal.total_charges)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-clinic-ink/60">Mile</span> <span>{money(bal.total_paid)}</span>
            </p>
            <p className="mt-1 flex justify-between border-t border-clinic-ink/20 pt-1 font-semibold">
              <span>Baqaya</span> <span>{money(bal.balance)}</span>
            </p>
          </div>
        )}

        <footer className="mt-10 text-xs text-clinic-ink/60">
          <p>
            EasyPaisa: {CLINIC.payments.easypaisa} · JazzCash: {CLINIC.payments.jazzcash}
          </p>
          <p className="mt-1">{CLINIC.timings.full}</p>
        </footer>
      </div>
    </div>
  )
}

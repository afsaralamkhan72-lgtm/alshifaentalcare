import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissions, getStaffProfile, isOwnerRole } from '@/lib/auth'
import { fmtDate, money } from '@/lib/karachi'
import { mapTemplates } from '@/lib/messageTemplates'
import PaymentDialog from '@/components/admin/PaymentDialog'
import VisitDoneBanner from '@/components/admin/visit/VisitDoneBanner'
import { getTreatments, TreatmentCardsSlot } from '../../_sections'

export const dynamic = 'force-dynamic'

const METHOD: Record<string, string> = { cash: 'Cash', bank: 'Bank', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash' }

export default async function TreatmentPage({ params }: { params: Promise<{ id: string; treatmentId: string }> }) {
  const { id, treatmentId } = await params
  const supabase = await createClient()
  const [staff, perms, pRes] = await Promise.all([getStaffProfile(), getPermissions(), supabase.from('patients').select('id, full_name, phone, gender, mr_number, portal_code, deleted_at').eq('id', id).maybeSingle()])
  const patient = pRes.data
  if (!patient || patient.deleted_at) notFound()
  const can = (p: string) => perms.includes(p)
  if (!can('clinical.view')) notFound()
  const isOwner = isOwnerRole(staff.role)
  const canMoney = isOwner || can('billing.view')
  const treatments = await getTreatments(id)
  const t = treatments.find((x) => x.id === treatmentId)
  if (!t) notFound()

  const [vnRes, tplRes, pbRes] = await Promise.all([
    supabase.from('visit_notes').select('id, visit_no, visit_date, procedure, notes, clinical_visit_id').eq('treatment_id', treatmentId).is('voided_at', null).order('visit_no'),
    supabase.from('message_templates').select('key, body'),
    canMoney ? supabase.from('patient_balances').select('balance').eq('patient_id', id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const notes = (vnRes.data ?? []) as { id: string; visit_no: number | null; visit_date: string; procedure: string | null; notes: string | null; clinical_visit_id: string | null }[]
  const cvIds = [...new Set(notes.map((n) => n.clinical_visit_id).filter((x): x is string => Boolean(x)))]
  const [rxRes, cvRes, invRes] = await Promise.all([
    can('prescriptions.view') && cvIds.length ? supabase.from('prescriptions').select('id, clinical_visit_id, prescribed_date, items').in('clinical_visit_id', cvIds) : Promise.resolve({ data: [] }),
    cvIds.length ? supabase.from('clinical_visits').select('id, doctor, complaint, diagnoses').in('id', cvIds) : Promise.resolve({ data: [] }),
    canMoney ? supabase.from('invoices').select('id, invoice_number, invoice_date, total, paid_amount, status').eq('patient_treatment_id', treatmentId).neq('status', 'void').order('invoice_date') : Promise.resolve({ data: [] }),
  ])
  const rxBy = new Map(((rxRes.data ?? []) as { id: string; clinical_visit_id: string; items: { name_en?: string; name?: string }[] | null }[]).map((r) => [r.clinical_visit_id, r]))
  const cvBy = new Map(((cvRes.data ?? []) as { id: string; doctor: string | null; complaint: { items?: string[]; other?: string } | null; diagnoses: { text: string }[] | null }[]).map((c) => [c.id, c]))
  const invoices = (invRes.data ?? []) as { id: string; invoice_number: string; invoice_date: string; total: number; paid_amount: number }[]
  const pays = [...(t.payments ?? [])].sort((a, b) => a.paid_on.localeCompare(b.paid_on))
  const back = '/admin/patients/' + id
  const box = 'rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5'
  const h2 = 'font-display text-lg font-semibold text-clinic-ink'

  return (
    <div className="mx-auto grid max-w-3xl gap-4" data-testid="treatment-page">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={back} data-testid="tp-back" className="inline-flex min-h-[44px] items-center rounded-full border border-clinic-teal/30 px-4 py-2 text-sm font-semibold text-clinic-teal">
          ← Mareez ka profile
        </Link>
        <p className="text-sm text-clinic-ink/70">
          <span className="font-semibold capitalize text-clinic-ink">{patient.full_name}</span>
          {patient.mr_number ? ' · ' + patient.mr_number : ''}
        </p>
      </div>

      <VisitDoneBanner treatmentId={treatmentId} patient={{ full_name: patient.full_name, phone: patient.phone, gender: (patient.gender as string | null) ?? null }} tpl={mapTemplates(tplRes.data as { key: string; body: string }[] | null)} />

      <TreatmentCardsSlot only={treatmentId} patientId={id} patientName={patient.full_name} phone={patient.phone ?? null} canMoney={canMoney} canBill={can('billing.create')} canEdit={can('clinical.edit')} canLab={can('lab.view')} />

      <section className={box} data-testid="tp-visits">
        <h2 className={h2}>Visits</h2>
        {notes.length === 0 ? (
          <p className="mt-1 text-sm text-clinic-ink/60">Abhi koi visit nahi.</p>
        ) : (
          <ul className="mt-2 divide-y divide-clinic-teal/10 text-sm">
            {notes.map((n) => {
              const cv = n.clinical_visit_id ? cvBy.get(n.clinical_visit_id) : undefined
              const rx = n.clinical_visit_id ? rxBy.get(n.clinical_visit_id) : undefined
              const comp = cv ? [...(cv.complaint?.items ?? []).filter((x) => x !== 'Other'), cv.complaint?.other].filter(Boolean).join(', ') : ''
              const dx = cv ? (cv.diagnoses ?? []).map((d) => d.text).filter(Boolean).join(', ') : ''
              return (
                <li key={n.id} className="py-2" data-testid="tp-visit">
                  <p className="font-semibold text-clinic-ink">
                    Visit {n.visit_no ?? ''} · {fmtDate(n.visit_date)}
                    {cv?.doctor ? <span className="font-normal text-clinic-ink/60"> · {cv.doctor}</span> : null}
                  </p>
                  {(n.procedure || n.notes) && <p className="text-clinic-ink/80">{[n.procedure, n.notes].filter(Boolean).join(' — ')}</p>}
                  {(comp || dx) && (
                    <p className="text-xs text-clinic-ink/60">
                      {comp ? 'Takleef: ' + comp : ''}
                      {comp && dx ? ' · ' : ''}
                      {dx ? 'Tashkhees: ' + dx : ''}
                    </p>
                  )}
                  {rx && <p className="text-xs text-clinic-ink/70">Dawa: {(rx.items ?? []).map((i) => i.name_en || i.name).filter(Boolean).join(', ')}</p>}
                  <p className="mt-1 flex flex-wrap gap-3 text-xs font-semibold text-clinic-teal">
                    {n.clinical_visit_id && (
                      <Link href={'/admin/visits/' + n.clinical_visit_id + '/print'} target="_blank" className="underline">
                        Visit ka record
                      </Link>
                    )}
                    {rx && (
                      <Link href={'/admin/prescriptions/' + rx.id + '/print'} target="_blank" className="underline" data-testid="tp-rx">
                        Prescription
                      </Link>
                    )}
                    {canMoney && n.clinical_visit_id && (
                      <Link href={'/admin/visits/' + n.clinical_visit_id + '/invoice'} target="_blank" className="underline" data-testid="tp-visit-invoice">
                        Us din ka invoice
                      </Link>
                    )}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {canMoney && (
        <section className={box} data-testid="tp-money">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={h2}>Paise</h2>
            {(isOwner || can('billing.collect')) && t.balance > 0 && (
              <PaymentDialog patient={{ id: patient.id, full_name: patient.full_name, phone: patient.phone, mr_number: patient.mr_number, portal_code: patient.portal_code }} balance={Number(pbRes.data?.balance ?? 0)} size="sm" />
            )}
          </div>
          <p className="mt-1 text-sm">
            Kul bill {money(t.charged)} · Mila {money(t.paid)} · <span className={t.balance > 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-700'}>Baqaya {money(t.balance)}</span>
          </p>
          {pays.length === 0 ? (
            <p className="mt-2 text-sm text-clinic-ink/60">Abhi koi payment nahi.</p>
          ) : (
            <ul className="mt-2 divide-y divide-clinic-teal/10 text-sm">
              {pays.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5" data-testid="tp-pay">
                  <span>
                    {fmtDate(p.paid_on)} · {METHOD[p.method ?? ''] ?? p.method ?? ''}
                    {p.kind === 'refund' ? <span className="ml-1 text-red-600">(wapsi)</span> : null}
                  </span>
                  <span className={p.kind === 'refund' ? 'font-semibold text-red-600' : 'font-semibold text-clinic-ink'}>
                    {p.kind === 'refund' ? '- ' : ''}
                    {money(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {invoices.length > 0 && (
            <p className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-clinic-teal">
              {invoices.map((i) => (
                <Link key={i.id} href={'/admin/invoices/' + i.id} className="underline" data-testid="tp-invoice">
                  Invoice {i.invoice_number} ({fmtDate(i.invoice_date)})
                </Link>
              ))}
            </p>
          )}
        </section>
      )}
    </div>
  )
}

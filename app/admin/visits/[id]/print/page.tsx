import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requirePerm, getPermissions } from '@/lib/auth'
import { CLINIC } from '@/clinic.config'
import { fmtDate, money } from '@/lib/karachi'
import { toothTitle as toothLabel } from '@/lib/teeth'
import SheetPrintButton from '@/components/admin/SheetPrintButton'

const FIND: Record<string, string> = {
  extraoral: 'Extraoral',
  intraoral: 'Intraoral',
  soft_tissue: 'Soft tissue',
  periodontal: 'Periodontal',
  tooth: 'Tooth findings',
  radiographic: 'Radiographic',
  notes: 'Notes',
}

/** Aik visit ka poora record: PDF sirf print karte waqt banti hai (store nahi hoti) */
export default async function VisitPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm('clinical.view')
  const { id } = await params
  const supabase = await createClient()
  const [{ data: v }, perms] = await Promise.all([
    supabase
      .from('clinical_visits')
      .select('id, patient_id, visit_date, status, complaint, findings, diagnoses, notes, doctor, next_date, next_time, invoice_id, patients(full_name, mr_number, age, gender, phone)')
      .eq('id', id)
      .maybeSingle(),
    getPermissions(),
  ])
  if (!v) notFound()
  const canMoney = perms.includes('billing.view')

  const [chartRes, notesRes, rxRes, invRes] = await Promise.all([
    supabase.from('dental_chart').select('tooth_number, condition, surfaces, state, notes').eq('clinical_visit_id', id).order('tooth_number'),
    supabase.from('visit_notes').select('procedure, notes, visit_no, treatment_id').eq('clinical_visit_id', id).is('voided_at', null),
    perms.includes('prescriptions.view') ? supabase.from('prescriptions').select('id, items, notes_en').eq('clinical_visit_id', id) : Promise.resolve({ data: [] }),
    canMoney && v.invoice_id
      ? supabase.from('invoices').select('invoice_number, total, paid_amount, invoice_items(name, qty, unit_price)').eq('id', v.invoice_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const p = v.patients as unknown as { full_name: string; mr_number: string | null; age: number | null; gender: string | null; phone: string } | null
  const c = (v.complaint ?? {}) as { items?: string[]; other?: string; duration?: string; severity?: string; location?: string }
  const f = (v.findings ?? {}) as Record<string, string>
  const dx = (v.diagnoses ?? []) as { text: string; teeth?: string[] }[]
  const rxItems = ((rxRes.data ?? []) as { items: { name_en?: string; name?: string; potency?: string; dosage?: string; frequency?: string; duration?: string; mode?: string }[] }[]).flatMap((r) => r.items ?? [])
  const inv = invRes.data as unknown as { invoice_number: string; total: number; paid_amount: number; invoice_items: { name: string; qty: number; unit_price: number }[] } | null
  const complaint = [...(c.items ?? []).filter((x) => x !== 'Other'), c.other].filter(Boolean).join(', ')

  const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-clinic-ink/10 py-1.5 text-sm">
      <span className="text-clinic-ink/50">{k}</span>
      <span>{children}</span>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/patients/${v.patient_id}`} className="text-sm text-clinic-ink/50 hover:text-clinic-teal">
          ← Patient
        </Link>
        <SheetPrintButton />
      </div>

      <div id="print-sheet" className="rounded-2xl border border-clinic-teal/10 bg-white p-8 text-clinic-ink">
        <header className="flex items-start justify-between border-b-2 border-clinic-teal pb-4">
          <div>
            <p className="font-display text-2xl font-semibold text-clinic-teal">{CLINIC.name}</p>
            <p className="mt-1 text-xs text-clinic-ink/60">
              {CLINIC.address.full} · {CLINIC.phone.display}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Visit Record</p>
            <p className="text-xs text-clinic-ink/70">{fmtDate(v.visit_date)}</p>
            {v.doctor && <p className="text-xs text-clinic-ink/70">{v.doctor}</p>}
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <p>
            <span className="text-clinic-ink/50">Patient: </span>
            <span className="font-semibold capitalize">{p?.full_name}</span>
          </p>
          <p>
            <span className="text-clinic-ink/50">MR: </span>
            {p?.mr_number ?? '—'}
          </p>
          <p>
            <span className="text-clinic-ink/50">Age/Sex: </span>
            {p?.age ?? '—'} / <span className="capitalize">{p?.gender ?? '—'}</span>
          </p>
          <p>
            <span className="text-clinic-ink/50">Phone: </span>
            {p?.phone}
          </p>
        </section>

        <div className="mt-5">
          <Row k="Chief complaint">
            {complaint || '—'}
            {[c.duration, c.severity, c.location].filter(Boolean).length > 0 && <span className="text-clinic-ink/60"> ({[c.duration, c.severity, c.location].filter(Boolean).join(' · ')})</span>}
          </Row>
          {Object.entries(FIND).map(([k, l]) => (f[k] ? <Row key={k} k={l}>{f[k]}</Row> : null))}
          {(chartRes.data ?? []).length > 0 && (
            <Row k="Dental chart">
              {(chartRes.data ?? [])
                .map((r) => `${toothLabel(r.tooth_number)} ${r.condition}${(r.surfaces ?? []).length ? ` [${(r.surfaces as string[]).join('')}]` : ''}${r.state === 'planned' ? ' (plan)' : r.state === 'completed' ? ' (done)' : ''}`)
                .join(' · ')}
            </Row>
          )}
          <Row k="Diagnosis">{dx.length ? dx.map((d) => d.text + (d.teeth?.length ? ` (${d.teeth.join(', ')})` : '')).join(' · ') : '—'}</Row>
          {(notesRes.data ?? []).length > 0 && (
            <Row k="Treatment done">{(notesRes.data ?? []).map((n) => `${n.procedure ?? ''}${n.notes ? ` — ${n.notes}` : ''}`).join(' · ')}</Row>
          )}
          {rxItems.length > 0 && (
            <Row k="Prescription">
              {rxItems.map((it, i) => (
                <span key={i} className="block">
                  {i + 1}. {it.name_en || it.name} {it.potency ?? ''} — {[it.dosage, it.frequency, it.duration].filter(Boolean).join(', ')}
                  {it.mode === 'dispense' ? ' (clinic se)' : ''}
                </span>
              ))}
            </Row>
          )}
          {inv && (
            <Row k="Bill">
              {inv.invoice_number}: {(inv.invoice_items ?? []).map((i) => `${i.name} ×${i.qty}`).join(', ')} = {money(inv.total)} (mile {money(inv.paid_amount)})
            </Row>
          )}
          <Row k="Next appointment">{v.next_date ? `${fmtDate(v.next_date)}${v.next_time ? ' ' + v.next_time : ''}` : '—'}</Row>
          {v.notes && <Row k="Notes">{v.notes}</Row>}
        </div>
        {v.status !== 'finished' && <p className="mt-4 text-xs text-amber-700">Ye visit abhi draft hai.</p>}
      </div>
    </div>
  )
}

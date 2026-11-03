import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPermissions, getStaffProfile, isOwnerRole } from '@/lib/auth'
import { CLINIC } from '@/clinic.config'
import { fmtDate, money, todayKarachi } from '@/lib/karachi'
import { toothTitle as toothLabel } from '@/lib/teeth'
import SheetPrintButton from '@/components/admin/SheetPrintButton'

/** Treatment plan ka andaza (estimate): jo treatments "plan" hain unki qeemat, patient ke dastakhat ke sath, print / PDF ke liye */
export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaffProfile()
  const perms = await getPermissions()
  if (!isOwnerRole(staff.role) && !perms.includes('billing.view')) redirect('/admin/dashboard?denied=1')
  const { id } = await params
  const supabase = await createClient()
  const { data: patient } = await supabase.from('patients').select('id, mr_number, full_name, phone, age').eq('id', id).maybeSingle()
  if (!patient) notFound()
  const { data } = await supabase
    .from('patient_treatments')
    .select('id, name, teeth, price, list_price, doctor, created_at')
    .eq('patient_id', id)
    .eq('status', 'planned')
    .order('created_at')
  const rows = (data ?? []).map((t) => ({ ...t, amount: Number(t.price) || Number(t.list_price) || 0, teeth: (t.teeth ?? []) as string[] }))
  const total = rows.reduce((s, r) => s + r.amount, 0)

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
            <p className="font-display text-lg font-semibold">Treatment Estimate</p>
            <p className="text-xs text-clinic-ink/60">{fmtDate(todayKarachi())}</p>
          </div>
        </header>
        <p className="mt-4 text-sm">
          <span className="font-semibold capitalize">{patient.full_name}</span> · {patient.mr_number} · {patient.phone}
        </p>
        {rows.length === 0 ? (
          <p className="mt-6 text-sm text-clinic-ink/60">Koi plan wali treatment nahi hai.</p>
        ) : (
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="border-b border-clinic-teal/20 text-left text-xs text-clinic-ink/60">
                <th className="py-2">#</th>
                <th>Treatment</th>
                <th>Daant</th>
                <th className="text-right">Andazan qeemat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-clinic-teal/10">
                  <td className="py-2">{i + 1}</td>
                  <td className="font-medium">{r.name}</td>
                  <td>{r.teeth.length ? r.teeth.map(toothLabel).join(', ') : '—'}</td>
                  <td className="text-right">{money(r.amount)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="py-3 text-right font-semibold">Kul andaza</td>
                <td className="py-3 text-right font-display text-lg font-semibold">{money(total)}</td>
              </tr>
            </tbody>
          </table>
        )}
        <p className="mt-4 text-xs text-clinic-ink/60">Ye sirf andaza hai. Asal kharcha treatment ke dauran badal sakta hai; badalne se pehle aap ko bataya jayega.</p>
        <div className="mt-14 grid grid-cols-2 gap-10 text-xs text-clinic-ink/70">
          <div className="border-t border-clinic-ink/40 pt-1">Patient / Guardian ke dastakhat</div>
          <div className="border-t border-clinic-ink/40 pt-1">Doctor ke dastakhat</div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { numFmt } from '@/lib/karachi'

export interface BinPatient {
  id: string
  mr_number: string | null
  full_name: string
  phone: string
  department: string
  deleted_at: string
}

export interface BinAppointment {
  id: string
  patient_name: string
  phone: string
  preferred_date: string | null
  preferred_time: string | null
  status: string
  deleted_at: string
}

export interface BinLabCase {
  id: string
  case_number: string | null
  lab_name: string
  work_type: string | null
  tooth_numbers: string[] | null
  lab_paid: number | null
  deleted_at: string
  patient_name: string | null
}

export interface BinItem {
  id: string
  item_name: string
  category: string
  unit: string | null
  deleted_at: string
}

function daysAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (diff === 0) return 'Aaj'
  if (diff === 1) return 'Kal'
  return `${diff} din pehle`
}

export default function RecycleBinList({
  patients,
  appointments,
  labCases = [],
  items = [],
}: {
  patients: BinPatient[]
  appointments: BinAppointment[]
  labCases?: BinLabCase[]
  items?: BinItem[]
}) {
  const [err, setErr] = useState('')
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  // Demo / test patient ko hamesha ke liye hatana (sirf doctor/admin; database bhi dobara check karta hai)
  const [purge, setPurge] = useState<BinPatient | null>(null)
  const [purgeInfo, setPurgeInfo] = useState<{ visits: number; invoices: number; payments: number; paid: number } | null>(null)
  const [typed, setTyped] = useState('')
  const [backedUp, setBackedUp] = useState(false)
  const [purging, setPurging] = useState(false)

  async function openPurge(p: BinPatient) {
    setPurge(p); setPurgeInfo(null); setTyped(''); setBackedUp(false); setErr('')
    const sb = createClient()
    const [v, i, y] = await Promise.all([
      sb.from('clinical_visits').select('id', { count: 'exact', head: true }).eq('patient_id', p.id),
      sb.from('invoices').select('id', { count: 'exact', head: true }).eq('patient_id', p.id),
      sb.from('payments').select('amount').eq('patient_id', p.id),
    ])
    const rows = (y.data ?? []) as { amount: number }[]
    setPurgeInfo({ visits: v.count ?? 0, invoices: i.count ?? 0, payments: rows.length, paid: rows.reduce((a, r) => a + Number(r.amount), 0) })
  }
  async function doPurge() {
    if (!purge) return
    setPurging(true); setErr('')
    const sb = createClient()
    const { data, error } = await sb.rpc('purge_patient', { p_id: purge.id, p_confirm: typed })
    if (error) { setPurging(false); setErr(error.message); return }
    const paths = ((data as { photo_paths?: string[] } | null)?.photo_paths ?? []).filter(Boolean)
    if (paths.length) await sb.storage.from('patient-media').remove(paths)
    setPurging(false); setPurge(null)
    router.refresh()
  }

  async function restore(table: 'patients' | 'appointments' | 'lab_cases', id: string) {
    setBusyId(id)
    const supabase = createClient()
    const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id)
    setBusyId(null)
    if (error) { setErr(error.message); return }
    router.refresh()
  }

  async function purgeLab(l: BinLabCase) {
    const paid = Number(l.lab_paid ?? 0)
    const t1 = `${l.case_number ?? 'Ye case'} hamesha ke liye mit jayega, wapas nahi aayega.` + (paid > 0 ? ` Lab ko Rs. ${numFmt(paid)} di gayi thi; Kharche ka record waisa hi rahega.` : '') + '\n\nPakka hatayein?'
    if (!window.confirm(t1)) return
    setBusyId(l.id)
    setErr('')
    const supabase = createClient()
    const { error } = await supabase.from('lab_cases').delete().eq('id', l.id)
    setBusyId(null)
    if (error) setErr('Nahi hua: ' + error.message)
    router.refresh()
  }

  async function itemAct(fn: 'restore_inventory_item' | 'purge_inventory_item', it: BinItem) {
    if (fn === 'purge_inventory_item' && !window.confirm(`"${it.item_name}" hamesha ke liye hat jayega (is par koi record nahi tha). Pakka?`)) return
    setBusyId(it.id)
    setErr('')
    const { error } = await createClient().rpc(fn, { p_id: it.id })
    setBusyId(null)
    if (error) setErr('Nahi hua: ' + error.message)
    router.refresh()
  }

  const empty = items.length === 0 && patients.length === 0 && appointments.length === 0 && labCases.length === 0

  if (empty) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-10 text-center text-sm text-clinic-ink/50">
        Recycle Bin khali hai.
      </div>
    )
  }

  return (
    <div className="mt-6 grid gap-8">
      {err && <p className="text-sm text-red-600">{err}</p>}
      {items.length > 0 && (
        <section data-testid="bin-items">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Stock items ({items.length})</h2>
          <div className="mt-3 grid gap-3">
            {items.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clinic-teal/10 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-medium text-clinic-ink">{it.item_name}</p>
                  <p className="text-xs text-clinic-ink/50">{it.category} · {it.unit ?? '—'} · Delete kiya: {daysAgo(it.deleted_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => itemAct('restore_inventory_item', it)} disabled={busyId === it.id} className="rounded-full bg-clinic-teal px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Restore</button>
                  <button onClick={() => itemAct('purge_inventory_item', it)} disabled={busyId === it.id} className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-40">Hamesha ke liye hatao</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {labCases.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Lab cases ({labCases.length})</h2>
          <div className="mt-3 grid gap-3">
            {labCases.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clinic-teal/10 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-medium text-clinic-ink">{l.case_number} · {l.patient_name ?? 'Patient ka naam nahi'}</p>
                  <p className="text-xs text-clinic-ink/50">
                    {l.work_type ?? 'Lab work'} · Daant: {(l.tooth_numbers ?? []).join(', ') || '—'} · {l.lab_name}
                  </p>
                  <p className="mt-1 text-xs text-clinic-ink/40">Delete kiya: {daysAgo(l.deleted_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => restore('lab_cases', l.id)} disabled={busyId === l.id} className="rounded-full bg-clinic-teal px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                    Restore
                  </button>
                  <button onClick={() => purgeLab(l)} disabled={busyId === l.id} className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-40">
                    Hamesha ke liye hatao
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {patients.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-clinic-ink">
            Patients ({patients.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {patients.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clinic-teal/10 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-clinic-ink">{p.full_name}</p>
                  <p className="text-xs text-clinic-ink/50">
                    {p.mr_number} · {p.phone} · {p.department}
                  </p>
                  <p className="mt-1 text-xs text-clinic-ink/40">
                    Delete kiya: {daysAgo(p.deleted_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restore('patients', p.id)}
                    disabled={busyId === p.id}
                    className="rounded-full bg-clinic-teal px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => openPurge(p)}
                    disabled={busyId === p.id}
                    data-testid="purge-patient"
                    className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-40"
                  >
                    Hamesha ke liye hatao
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {purge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5">
            <p className="font-display text-lg font-semibold text-red-700">Hamesha ke liye hatayein?</p>
            <p className="mt-1 text-sm font-semibold text-clinic-ink">{purge.full_name} {purge.mr_number ? `(${purge.mr_number})` : ''}</p>
            <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
              <p className="font-semibold">Ye wapas nahi aayega. Is mareez ka ye sab hat jayega:</p>
              {purgeInfo ? (
                <ul className="mt-1 list-disc pl-5">
                  <li>{purgeInfo.visits} visit, chart, nuskhe, tasveerein, lab ke case</li>
                  <li>{purgeInfo.invoices} invoice, {purgeInfo.payments} payment (kul Rs. {numFmt(purgeInfo.paid)})</li>
                </ul>
              ) : <p className="mt-1">Gintee ho rahi hai...</p>}
              <p className="mt-2 text-xs">Is mareez ki payments aap ki income / hisaab se bhi hat jayengi, is liye Munafa ke total kam honge. Stock ki miqdar nahi badlegi. Audit Log mein sirf ye likha rahega ke kisne kya hataya.</p>
            </div>
            <a href="/api/backup" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-full border border-clinic-teal/30 px-4 py-2 text-xs font-semibold text-clinic-teal">
              Pehle backup download karein
            </a>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={backedUp} onChange={(e) => setBackedUp(e.target.checked)} className="mt-1" />
              <span>Maine backup le liya hai</span>
            </label>
            <label className="mt-3 block text-sm">
              Tasdeeq ke liye <b>DELETE</b> likhein
              <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" data-testid="purge-confirm" className="mt-1 w-full rounded-lg border border-red-200 px-3 py-2 text-sm" />
            </label>
            {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setPurge(null)} disabled={purging} className="rounded-full px-4 py-2 text-sm font-semibold text-clinic-ink/70">Wapas</button>
              <button
                onClick={doPurge}
                disabled={purging || !backedUp || typed.trim().toUpperCase() !== 'DELETE' || !purgeInfo}
                data-testid="purge-go"
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {purging ? 'Hat raha hai...' : 'Hamesha ke liye hatao'}
              </button>
            </div>
          </div>
        </div>
      )}

      {appointments.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-clinic-ink">
            Appointments ({appointments.length})
          </h2>
          <div className="mt-3 grid gap-3">
            {appointments.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clinic-teal/10 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-clinic-ink">{a.patient_name}</p>
                  <p className="text-xs text-clinic-ink/50">
                    {a.phone}
                    {a.preferred_date
                      ? ` · ${new Date(a.preferred_date).toLocaleDateString('en-GB')}`
                      : ''}
                    {a.preferred_time ? ` ${a.preferred_time}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-clinic-ink/40">
                    Delete kiya: {daysAgo(a.deleted_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restore('appointments', a.id)}
                    disabled={busyId === a.id}
                    className="rounded-full bg-clinic-teal px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import RecycleBinList, { type BinPatient, type BinAppointment } from '@/components/admin/RecycleBinList'

export default async function RecycleBinPage() {
  const supabase = await createClient()

  // Auto-purge: anything sitting in the bin longer than 30 days is removed
  // permanently. Runs whenever this page is opened.
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString()
  await Promise.all([
    supabase.from('patients').delete().lt('deleted_at', cutoff),
    supabase.from('appointments').delete().lt('deleted_at', cutoff),
  ])

  const [patientsRes, apptRes] = await Promise.all([
    supabase
      .from('patients')
      .select('id, mr_number, full_name, phone, department, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase
      .from('appointments')
      .select('id, patient_name, phone, preferred_date, preferred_time, status, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
  ])

  // Column missing -> phase4.sql not run yet
  if (patientsRes.error || apptRes.error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Recycle Bin</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase → SQL Editor mein <strong>phase4.sql</strong> chalayein. Us ke baad Recycle
            Bin kaam karega.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Recycle Bin</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Delete kiye gaye records yahan mehfooz rehte hain. Wapas laa sakte hain ya hamesha ke
        liye mita sakte hain.
      </p>
      <p className="mt-2 rounded-xl bg-clinic-mint px-4 py-2 text-xs text-clinic-ink/60">
        30 din ke baad ye records khud ba khud hamesha ke liye mit jate hain.
      </p>

      <RecycleBinList
        patients={(patientsRes.data ?? []) as BinPatient[]}
        appointments={(apptRes.data ?? []) as BinAppointment[]}
      />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import RecycleBinList, { type BinPatient, type BinAppointment } from '@/components/admin/RecycleBinList'

export default async function RecycleBinPage() {
  await requireAdmin()
  const supabase = await createClient()

  // Phase 0: auto-purge BAND. Recycle Bin se kuch khud nahi mitta.

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
        Delete kiye gaye records yahan mehfooz rehte hain. Aap inhe kisi bhi waqt wapas la sakte
        hain.
      </p>
      <p className="mt-2 rounded-xl bg-clinic-mint px-4 py-2 text-xs text-clinic-ink/60">
        Yahan se kuch khud ba khud nahi mitta.
      </p>

      <RecycleBinList
        patients={(patientsRes.data ?? []) as BinPatient[]}
        appointments={(apptRes.data ?? []) as BinAppointment[]}
      />
    </div>
  )
}

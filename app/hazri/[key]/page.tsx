import { createAdminClient } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/staffPortal'
import { CLINIC } from '@/clinic.config'
import DeviceClock from '@/components/DeviceClock'

export const dynamic = 'force-dynamic'
export const metadata = { title: `Hazri | ${CLINIC.name}`, robots: { index: false, follow: false } }

/** Clinic ke phone / tablet ka hazri page: naam chunein, PIN likhein, "Hazri lagayen". */
export default async function DevicePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const db = createAdminClient()
  let ok = false
  let require_location = false
  let staff: { id: string; full_name: string }[] = []
  if (db && key.length >= 20 && key.length <= 80) {
    const { data: r } = await db.from('attendance_rules').select('device_hash, require_location').eq('id', 1).maybeSingle()
    if (r?.device_hash && r.device_hash === hashToken(key)) {
      ok = true
      require_location = !!r.require_location
      const { data } = await db.from('staff_members').select('id, full_name').eq('is_active', true).eq('attendance_on', true).order('full_name')
      staff = data ?? []
    }
  }
  return (
    <div className="min-h-screen bg-clinic-sand">
      <header className="border-b border-clinic-teal/10 bg-white">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
          <span className="font-display font-semibold text-clinic-teal">{CLINIC.name}</span>
          <span className="text-xs text-clinic-ink/40">Hazri</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">
        {ok ? (
          <DeviceClock deviceKey={key} staff={staff} requireLocation={require_location} />
        ) : (
          <div className="rounded-2xl bg-white p-6 text-center">
            <h1 className="font-display text-xl font-semibold text-clinic-ink">Link kaam nahi kar raha</h1>
            <p className="mt-2 text-sm text-clinic-ink/60">Ye link band ho chuka hai ya ghalat hai. Doctor sahab se naya link lein.</p>
          </div>
        )}
      </main>
    </div>
  )
}

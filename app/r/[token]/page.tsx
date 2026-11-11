import { createAdminClient } from '@/lib/supabase/admin'
import { CLINIC } from '@/clinic.config'
import { loadShare } from '@/lib/shareGate'
import PortalView, { Shell } from '@/components/portal/PortalView'
import { checkLast4 } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: `Mera Record | ${CLINIC.name}`, robots: { index: false, follow: false } }

export default async function SharePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ e?: string }> }) {
  const { token } = await params
  const { e } = await searchParams
  const st = await loadShare(token)

  if (st.s === 'missing')
    return <Shell><Msg title="Link sahi nahi" text="Ye link kharab ya ghalat hai. Clinic se naya link/QR lein." /></Shell>
  if (st.s === 'expired')
    return <Shell><Msg title="Link ki muddat khatam" text="Is link ki muddat khatam ho chuki hai. Clinic se naya link lein." /></Shell>
  if (st.s === 'locked')
    return <Shell><Msg title="Kuch der ruk jayein" text="Bohat baar galat number dala gaya. Thori der baad dobara koshish karein ya clinic se raabta karein." /></Shell>
  if (st.s === 'gate') {
    return (
      <Shell>
        <div className="mx-auto max-w-sm rounded-2xl border border-clinic-teal/10 bg-white p-6 text-center">
          <h1 className="font-display text-lg font-semibold text-clinic-ink">Apna record dekhein</h1>
          <p className="mt-2 text-sm text-clinic-ink/70">Hifazat ke liye, clinic mein likhwaye hue phone number ke aakhri 4 hindse likhein.</p>
          <form action={checkLast4.bind(null, token)} className="mt-4 grid gap-3">
            <input name="last4" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoFocus placeholder="••••" aria-label="••••" className="rounded-lg border border-clinic-teal/25 px-3 py-3 text-center text-2xl tracking-[0.5em]" />
            {e && <p className="text-sm text-red-700">Number sahi nahi. Dobara koshish karein.</p>}
            <button className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white">Dekhein</button>
          </form>
        </div>
      </Shell>
    )
  }
  const supabase = createAdminClient()
  if (!supabase) return <Shell><Msg title="Abhi band hai" text="Baraye meherbani clinic se raabta karein." /></Shell>
  return <PortalView patient={st.patient} supabase={supabase} rxHref={(id) => `/r/${token}/rx/${id}`} />
}

function Msg({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-clinic-teal/10 bg-white p-6 text-center">
      <h1 className="font-display text-lg font-semibold text-clinic-ink">{title}</h1>
      <p className="mt-2 text-sm text-clinic-ink/70">{text}</p>
      <p className="mt-3 text-xs text-clinic-ink/50">{CLINIC.name} · {CLINIC.phone.display}</p>
    </div>
  )
}

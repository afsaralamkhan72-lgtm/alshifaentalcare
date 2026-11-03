import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { CLINIC } from '@/clinic.config'
import PortalView, { Shell } from '@/components/portal/PortalView'

export const metadata = {
  title: `My Record | ${CLINIC.name}`,
  robots: { index: false, follow: false },
}

export default async function PortalRecordPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = createAdminClient()

  if (!supabase) {
    return (
      <Shell>
        <p className="text-sm text-clinic-ink/60">
          Portal abhi setup nahi hua. Baraye meherbani clinic se raabta karein.
        </p>
      </Shell>
    )
  }

  // The code is the credential. Only non-clinical fields are selected.
  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, mr_number, phone, department')
    .eq('portal_code', code.toLowerCase())
    .is('deleted_at', null)
    .maybeSingle()

  if (!patient) notFound()

  return <PortalView patient={patient} supabase={supabase} rxHref={(id) => `/portal/${encodeURIComponent(code)}/rx/${id}`} />
}

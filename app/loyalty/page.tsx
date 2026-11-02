import { CLINIC } from '@/clinic.config'
import LoyaltyScan from '@/components/loyalty/LoyaltyScan'

export const metadata = { title: `Loyalty Card | ${CLINIC.name}`, robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default function LoyaltyPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-clinic-teal px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">
        <p className="font-display text-xl font-semibold text-clinic-ink">{CLINIC.name}</p>
        <p className="text-xs text-clinic-ink/50">Loyalty Card</p>
        <LoyaltyScan />
      </div>
    </div>
  )
}

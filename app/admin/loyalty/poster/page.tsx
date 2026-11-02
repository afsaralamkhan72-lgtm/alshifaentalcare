import QRCode from 'qrcode'
import { requireOwner } from '@/lib/auth'
import PrintButton from '@/components/admin/PrintButton'
import { CLINIC, SITE_URL } from '@/clinic.config'

export const dynamic = 'force-dynamic'

export default async function PosterPage() {
  await requireOwner()
  const url = `${SITE_URL.replace(/\/$/, '')}/loyalty`
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 360, errorCorrectionLevel: 'M' })
  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center print:shadow-none">
      <p className="font-display text-2xl font-semibold text-clinic-ink">{CLINIC.name}</p>
      <p className="mt-2 text-lg">Loyalty Card</p>
      <div className="mx-auto mt-4 w-72" aria-label="QR code" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-4 text-base">Scan karein, naam aur phone likhein, aur apna stamp hasil karein</p>
      <p className="mt-2 break-all text-xs text-clinic-ink/50">{url}</p>
      <PrintButton />
    </div>
  )
}

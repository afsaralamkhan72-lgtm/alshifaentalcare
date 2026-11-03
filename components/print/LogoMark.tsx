import type { PrintLogo } from '@/lib/printTemplates'
import ClinicLogo from '@/components/ClinicLogo'

/** Print wala logo: pehle upload kiya hua (size ke saath), warna purana clinic_info.logo_url / nishan */
export default function LogoMark({ logo, fallbackUrl, scale = 1, badge }: { logo: PrintLogo; fallbackUrl?: string | null; scale?: number; badge?: boolean }) {
  if (logo.data) {
    const h = Math.round(logo.size * scale)
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo.data} alt="logo" style={{ height: h, width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
    )
    return badge && logo.badge ? <span style={{ display: 'inline-flex', background: '#fff', borderRadius: 9999, padding: Math.round(h * 0.08) }}>{img}</span> : img
  }
  return <ClinicLogo logoUrl={fallbackUrl ?? null} size={Math.round(52 * scale)} />
}

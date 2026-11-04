import LogoMark from '@/components/print/LogoMark'
import { CLINIC } from '@/clinic.config'
import { accentOf, type PrintLayout } from '@/lib/printLayout'
import type { PrintLogo } from '@/lib/printTemplates'

/** Software wala neela header: logo, naam, doctor, rabta aur address. Settings se har cheez on/off aur size. */
export default function SoftHeader({ logo, logoUrl, layout }: { logo: PrintLogo; logoUrl: string | null; layout: PrintLayout }) {
  const acc = accentOf(layout)
  const tag = layout.texts.tagline.trim() || CLINIC.slogan
  const sh = layout.show
  return (
    <div style={{ background: acc, color: '#fff', padding: '18px 24px 14px', borderRadius: '14px 14px 0 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          {(logo.data || logoUrl) && (
            <span style={{ display: 'inline-flex', background: '#fff', borderRadius: 14, padding: 8 }}>
              <LogoMark logo={logo} fallbackUrl={logoUrl} />
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.15 }}>{CLINIC.name}</p>
            {sh.tagline && <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgb(var(--c-gold, 212 175 55))' }}>&ldquo;{tag}&rdquo;</p>}
            {sh.doctor && (
              <>
                <p style={{ marginTop: 6, fontSize: 15, fontWeight: 600 }}>{CLINIC.doctor.name}</p>
                <p style={{ fontSize: 12, opacity: 0.8 }}>{CLINIC.doctor.qualification}</p>
              </>
            )}
          </div>
        </div>
        {sh.phone && (
          <div style={{ fontSize: 12, lineHeight: 1.7, borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: 16 }}>
            <p><span style={{ opacity: 0.75 }}>Rabita / WhatsApp: </span><b>{CLINIC.phone.display}</b></p>
            {sh.payment && (
              <>
                <p><span style={{ opacity: 0.75 }}>Easypaisa: </span><b>{CLINIC.payments.easypaisa}</b></p>
                <p><span style={{ opacity: 0.75 }}>JazzCash: </span><b>{CLINIC.payments.jazzcash}</b></p>
              </>
            )}
          </div>
        )}
      </div>
      {sh.address && <p style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: 8, fontSize: 12, opacity: 0.85 }}>{CLINIC.address.full}</p>}
    </div>
  )
}

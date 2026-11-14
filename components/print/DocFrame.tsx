import { getPrintCfg } from '@/lib/printSettings'
import { fmtDate } from '@/lib/karachi'
import { CLINIC } from '@/clinic.config'
import { accentOf } from '@/lib/printLayout'
import SoftHeader from '@/components/print/SoftHeader'
import { DuoFoot, DuoHead } from '@/components/print/Duo'

/**
 * Invoice jaise sab kaghaz ka upar ka hissa: prescription wala hi header (logo, clinic ka naam,
 * doctoron ke naam, pata, phone, timing). Sab kuch Settings > Print layout se badalta hai.
 */
export async function DocHead({ title, refs, date }: { title: string; refs?: string | null; date?: string | null }) {
  const cfg = await getPrintCfg()
  const { layout, logo } = cfg
  const acc = accentOf(layout)
  const duo = cfg.defaults.bill === 'duo'
  return (
    <div data-testid="doc-head" data-doc-style={duo ? 'duo' : 'soft'}>
      {duo ? (
        <div style={{ fontSize: `${13.5 * layout.scale}px`, lineHeight: 1.45, padding: '4px 10px' }}>
          <DuoHead layout={layout} />
        </div>
      ) : (
        <SoftHeader logo={logo} logoUrl={null} layout={layout} />
      )}
      <div
        style={{ borderBottom: `2px solid ${acc}`, marginTop: duo ? '0.4em' : 0, padding: '8px 10px 6px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}
      >
        <p data-testid="doc-title" style={{ fontWeight: 700, fontSize: '1.05em', color: acc }}>{title}</p>
        <p style={{ fontSize: '0.85em' }}>
          {refs ? <>Ref: <b>{refs}</b></> : null}
          {refs && date ? ' · ' : ''}
          {date ? <>Date: <b>{fmtDate(date)}</b></> : null}
        </p>
      </div>
    </div>
  )
}

/** Neeche ka hissa: do doctor wale template mein dono doctors ke naam aur mohar; baqi mein mohar aur shukriya */
export async function DocFoot({ verify = null }: { verify?: { table: 'invoices' | 'prescriptions'; id: string } | null }) {
  const { layout, defaults } = await getPrintCfg()
  if (defaults.bill === 'duo') {
    return (
      <div data-testid="doc-foot" style={{ fontSize: `${13.5 * layout.scale}px`, padding: '0 10px' }}>
        <DuoFoot layout={layout} verify={verify} />
      </div>
    )
  }
  return (
    <div data-testid="doc-foot" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, fontSize: `${12 * layout.scale}px` }}>
      <p style={{ opacity: 0.7 }}>{layout.texts.footer.trim() || (layout.texts.thanks.trim() ? layout.texts.thanks : '') + (layout.show.timings ? ' · ' + CLINIC.timings.full : '')}</p>
      {layout.show.stamp && layout.stamp && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={layout.stamp} alt="Mohar" style={{ height: '4.5em', width: 'auto' }} />
      )}
    </div>
  )
}

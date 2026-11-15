import { getPrintCfg } from '@/lib/printSettings'
import { fmtDate } from '@/lib/karachi'
import { CLINIC } from '@/clinic.config'
import { accentOf } from '@/lib/printLayout'
import { inkOnWhite } from '@/lib/contrast'
import SoftHeader from '@/components/print/SoftHeader'
import { DuoFoot, DuoHead } from '@/components/print/Duo'
import DocStylePicker from '@/components/print/DocStylePicker'
import LetterheadFrame from '@/components/print/LetterheadFrame'

/**
 * Invoice jaise sab kaghaz ka upar ka hissa: prescription wala hi header (logo, clinic ka naam,
 * doctoron ke naam, pata, phone, timing). Sab kuch Settings > Print layout se badalta hai.
 */
export type DocStyle = 'lh' | 'duo' | 'soft'
/** Kaunsa style: ?tpl= se (is baar ke liye), warna letterhead laga ho to letterhead, warna Settings ka default */
function pickStyle(tpl: string | undefined, hasLh: boolean, def: string): DocStyle {
  if (tpl === 'soft' || tpl === 'duo') return tpl
  if (tpl === 'lh' && hasLh) return 'lh'
  if (hasLh) return 'lh'
  return def === 'duo' ? 'duo' : 'soft'
}

export async function DocHead({ title, refs, date, tpl }: { title: string; refs?: string | null; date?: string | null; tpl?: string }) {
  const cfg = await getPrintCfg()
  const { layout, logo } = cfg
  const acc = accentOf(layout)
  const style = pickStyle(tpl, Boolean(layout.letterhead.data), cfg.defaults.bill)
  const lh = style === 'lh'
  const duo = style === 'duo'
  const bare = { ...layout, letterhead: { ...layout.letterhead, data: null } }
  return (
    <div data-testid="doc-head" data-doc-style={lh ? 'letterhead' : duo ? 'duo' : 'soft'}>
      {lh ? null : duo ? (
        <div style={{ fontSize: `${13.5 * layout.scale}px`, lineHeight: 1.45, padding: '4px 10px' }}>
          <DuoHead layout={bare} logo={logo} logoUrl={null} />
        </div>
      ) : (
        <SoftHeader logo={logo} logoUrl={null} layout={bare} />
      )}
      <div
        style={{ borderBottom: `2px solid ${inkOnWhite(acc)}`, marginTop: duo ? '0.4em' : 0, padding: '8px 10px 6px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}
      >
        <p data-testid="doc-title" style={{ fontWeight: 700, fontSize: '1.05em', color: inkOnWhite(acc) }}>{title}</p>
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
export async function DocFoot({ verify = null, tpl }: { verify?: { table: 'invoices' | 'prescriptions'; id: string } | null; tpl?: string }) {
  const { layout, defaults } = await getPrintCfg()
  const style = pickStyle(tpl, Boolean(layout.letterhead.data), defaults.bill)
  if (style === 'lh') {
    return layout.show.stamp && layout.stamp ? (
      <div data-testid="doc-foot" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={layout.stamp} alt="Mohar" style={{ height: '4.5em', width: 'auto' }} />
      </div>
    ) : null
  }
  if (style === 'duo') {
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

/** Kaghaz ke upar: style chunne ka option (sirf is baar ke liye) */
export async function DocStyleBar({ tpl }: { tpl?: string }) {
  const { defaults, layout } = await getPrintCfg()
  const hasLh = Boolean(layout.letterhead.data)
  return <DocStylePicker current={pickStyle(tpl, hasLh, defaults.bill)} hasLetterhead={hasLh} />
}

/** Kaghaz ka dabba: letterhead upload ho to poora A4 us par (header chhup jata hai), warna saada dabba */
export async function DocSheet({ className, id = 'print-sheet', tpl, children }: { className?: string; id?: string; tpl?: string; children: React.ReactNode }) {
  const { layout, defaults } = await getPrintCfg()
  if (pickStyle(tpl, Boolean(layout.letterhead.data), defaults.bill) === 'lh') return <LetterheadFrame layout={layout} id={id}>{children}</LetterheadFrame>
  return (
    <div id={id} className={className}>
      {children}
    </div>
  )
}

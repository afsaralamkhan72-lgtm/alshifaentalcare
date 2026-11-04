/** Print layout ki settings (site_settings key: print_layout). Client aur server dono istemal kar sakte hain. */
export interface PrintLayout {
  /** poore page ke text ka size (1 = normal) */
  scale: number
  /** khaas rang (khali = software ka rang) */
  accent: string | null
  show: {
    mr: boolean
    age: boolean
    doctor: boolean
    phone: boolean
    address: boolean
    tagline: boolean
    qr: boolean
    payment: boolean
    signature: boolean
    stamp: boolean
    darood: boolean
    timings: boolean
  }
  texts: {
    tagline: string
    darood: string
    thanks: string
    footer: string
    website: string
  }
  letterhead: { data: string | null; top: number; bottom: number; left: number; right: number }
  /** clinic ki mohar (stamp) ki tasveer */
  stamp: string | null
}

export const DEFAULT_LAYOUT: PrintLayout = {
  scale: 1,
  accent: null,
  show: { mr: true, age: true, doctor: true, phone: true, address: true, tagline: true, qr: true, payment: true, signature: true, stamp: true, darood: false, timings: true },
  texts: {
    tagline: '',
    darood: 'کیا آج آپ نے درودِ پاک پڑھا؟ اگر نہیں، تو ابھی پڑھ لیجیے۔\nصلّی اللہ علیٰ محمّد ﷺ',
    thanks: 'Shukriya',
    footer: '',
    website: '',
  },
  letterhead: { data: null, top: 40, bottom: 25, left: 12, right: 12 },
  stamp: null,
}

const num = (v: unknown, d: number, lo: number, hi: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d
}
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d)

/** Database se aayi hui (adhoori ya purani) value ko poori aur mehfooz shakal dena */
export function normalizeLayout(raw: unknown): PrintLayout {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const s = (r.show && typeof r.show === 'object' ? r.show : {}) as Record<string, unknown>
  const t = (r.texts && typeof r.texts === 'object' ? r.texts : {}) as Record<string, unknown>
  const l = (r.letterhead && typeof r.letterhead === 'object' ? r.letterhead : {}) as Record<string, unknown>
  const show = { ...DEFAULT_LAYOUT.show }
  for (const k of Object.keys(show) as (keyof typeof show)[]) if (typeof s[k] === 'boolean') show[k] = s[k] as boolean
  const accent = typeof r.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.accent) ? r.accent : null
  return {
    scale: num(r.scale, 1, 0.7, 1.4),
    accent,
    show,
    texts: {
      tagline: str(t.tagline, DEFAULT_LAYOUT.texts.tagline).slice(0, 120),
      darood: str(t.darood, DEFAULT_LAYOUT.texts.darood).slice(0, 400),
      thanks: str(t.thanks, DEFAULT_LAYOUT.texts.thanks).slice(0, 80),
      footer: str(t.footer, DEFAULT_LAYOUT.texts.footer).slice(0, 200),
      website: str(t.website, DEFAULT_LAYOUT.texts.website).slice(0, 120),
    },
    letterhead: {
      data: typeof l.data === 'string' && l.data.startsWith('data:image/') ? l.data : null,
      top: num(l.top, DEFAULT_LAYOUT.letterhead.top, 0, 120),
      bottom: num(l.bottom, DEFAULT_LAYOUT.letterhead.bottom, 0, 120),
      left: num(l.left, DEFAULT_LAYOUT.letterhead.left, 0, 60),
      right: num(l.right, DEFAULT_LAYOUT.letterhead.right, 0, 60),
    },
    stamp: typeof r.stamp === 'string' && r.stamp.startsWith('data:image/') ? r.stamp : null,
  }
}

export const ACCENT_DEFAULT = 'rgb(var(--c-teal))'
export const accentOf = (l: PrintLayout) => l.accent ?? ACCENT_DEFAULT

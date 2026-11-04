import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_PRINT, type PrintDefaults, type PrintLogo } from '@/lib/printTemplates'
import { mapTemplates } from '@/lib/messageTemplates'
import { normalizeLayout, type PrintLayout } from '@/lib/printLayout'

export interface PrintCfg {
  logo: PrintLogo
  share: { days: number; require_last4: boolean }
  remind: { med_days_before: number }
  defaults: PrintDefaults
  tpl: Record<string, string>
  layout: PrintLayout
}

/** Print ke liye logo (compressed), default templates aur hidayat ka matn */
export const getPrintCfg = cache(async (): Promise<PrintCfg> => {
  const supabase = await createClient()
  const [sRes, mRes] = await Promise.all([
    supabase.from('site_settings').select('key, value').in('key', ['print_logo', 'print_defaults', 'print_layout', 'clinic_info', 'share_cfg', 'reminder_cfg']),
    supabase.from('message_templates').select('key, body'),
  ])
  const m = new Map(((sRes.error ? [] : sRes.data ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, r.value as Record<string, unknown>]))
  const pl = (m.get('print_logo') ?? {}) as { data?: string; size?: number; badge?: boolean }
  const ci = (m.get('clinic_info') ?? {}) as { logo_url?: string }
  const size = Number(pl.size)
  const sc = (m.get('share_cfg') ?? {}) as { days?: number; require_last4?: boolean }
  const rc = (m.get('reminder_cfg') ?? {}) as { med_days_before?: number }
  return {
    share: { days: Number(sc.days) >= 1 ? Math.min(30, Number(sc.days)) : 3, require_last4: sc.require_last4 !== false },
    remind: { med_days_before: Number.isFinite(Number(rc.med_days_before)) && rc.med_days_before !== undefined ? Math.max(0, Math.min(30, Number(rc.med_days_before))) : 2 },
    logo: { data: pl.data || ci.logo_url || null, size: size >= 20 && size <= 400 ? size : 80, badge: Boolean(pl.badge) },
    defaults: { ...DEFAULT_PRINT, ...((m.get('print_defaults') ?? {}) as Partial<PrintDefaults>) },
    layout: normalizeLayout(m.get('print_layout')),
    tpl: mapTemplates((mRes.error ? [] : mRes.data ?? []) as { key: string; body: string }[]),
  }
})

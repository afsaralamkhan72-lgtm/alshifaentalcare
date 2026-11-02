// Sirf server: public loyalty scan ka dimagh. Patient ko sirf pehla naam, stamps aur agla inaam dikhta hai.
import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex')
export const newToken = () => crypto.randomBytes(32).toString('hex')

const norm = (s: string) => s.toLowerCase().replace(/[^a-z؀-ۿ\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 2)
const IGNORE = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'md', 'muhammad', 'mohammad', 'muhammed', 'mohd'])

/** Naam milta hai agar likhe hue lafzon mein se koi (mamooli lafz chhor kar) patient ke naam mein ho. */
export function nameMatches(entered: string, actual: string) {
  const a = norm(entered).filter((w) => !IGNORE.has(w))
  const b = norm(actual).filter((w) => !IGNORE.has(w))
  if (!a.length || !b.length) return false
  return a.some((w) => w.length >= 3 && b.includes(w)) || (a.length === 1 && b.length === 1 && a[0] === b[0])
}

export const firstName = (full: string) => {
  const w = full.trim().split(/\s+/).filter((x) => !IGNORE.has(x.toLowerCase().replace(/\./g, '')))
  return w[0] ?? full.trim().split(/\s+/)[0] ?? ''
}

export type ScanOut = {
  status: 'need_info' | 'inactive' | 'awarded' | 'already' | 'no_visit' | 'signup' | 'mismatch' | 'ambiguous' | 'limited' | 'error'
  name?: string
  card?: { stamps: number; total: number; cycle_size: number | null; stamped_today: boolean; next_title: string | null; remaining: number | null; ready: number }
  links?: { google: string | null; facebook: string | null; instagram: string | null; tiktok: string | null }
}

export async function scan(sb: SupabaseClient, opts: { ip: string; name?: string; phone?: string; token?: string | null }) {
  const { data: prog } = await sb.from('loyalty_program').select('*').eq('id', 1).maybeSingle()
  const links = prog
    ? { google: prog.google_review_url ?? null, facebook: prog.facebook_url ?? null, instagram: prog.instagram_url ?? null, tiktok: prog.tiktok_url ?? null }
    : undefined
  if (!prog || !prog.is_active) return { out: { status: 'inactive' } as ScanOut }

  const ipOk = await sb.rpc('loyalty_rate_ok', { p_key: 'ip:' + opts.ip, p_max: 40, p_minutes: 10 })
  if (ipOk.error || ipOk.data !== true) return { out: { status: 'limited' } as ScanOut }

  let patientId: string | null = null
  let newTok: string | null = null
  let fullName = ''

  if (opts.token) {
    const { data } = await sb.rpc('loyalty_device_lookup', { p_hash: hashToken(opts.token) })
    if (typeof data === 'string') patientId = data
  }

  if (!patientId) {
    const name = (opts.name ?? '').trim()
    const phone = (opts.phone ?? '').trim()
    if (!name && !phone) return { out: { status: 'need_info', links } as ScanOut }
    const digits = phone.replace(/\D/g, '')
    if (name.length < 2 || digits.length < 10) return { out: { status: 'need_info', links } as ScanOut }
    const pOk = await sb.rpc('loyalty_rate_ok', { p_key: 'ph:' + digits.slice(-10), p_max: 8, p_minutes: 10 })
    if (pOk.error || pOk.data !== true) return { out: { status: 'limited' } as ScanOut }

    const { data: found } = await sb.rpc('loyalty_find_patients', { p_phone: phone })
    const list = (found ?? []) as { id: string; full_name: string }[]
    if (list.length === 0) {
      await sb.rpc('loyalty_signup', { p_name: name, p_phone: phone })
      return { out: { status: 'signup', name: firstName(name), links } as ScanOut }
    }
    const hits = list.filter((p) => nameMatches(name, p.full_name))
    if (hits.length === 0) return { out: { status: 'mismatch', links } as ScanOut }
    if (hits.length > 1) return { out: { status: 'ambiguous', links } as ScanOut }
    patientId = hits[0].id
    fullName = hits[0].full_name
    newTok = newToken()
    await sb.rpc('loyalty_device_save', { p_hash: hashToken(newTok), p_patient: patientId })
  }

  if (!fullName) {
    const { data: p } = await sb.from('patients').select('full_name, deleted_at').eq('id', patientId).maybeSingle()
    if (!p || p.deleted_at) return { out: { status: 'need_info', links } as ScanOut }
    fullName = p.full_name
  }

  const { data: aw, error } = await sb.rpc('_loyalty_award', { p_patient: patientId, p_source: 'qr', p_by: null, p_note: null, p_date: null })
  if (error) return { out: { status: 'error' } as ScanOut }
  const { data: card } = await sb.rpc('_loyalty_card', { p_patient: patientId })
  const c = card as { stamps: number; total: number; cycle_size: number | null; stamped_today: boolean; next_title: string | null; remaining: number | null; ready: unknown[] }
  const status = (aw as { status: string }).status as ScanOut['status']
  return {
    newToken: newTok,
    out: {
      status: status === 'no_patient' as string ? 'need_info' : status,
      name: firstName(fullName),
      card: { stamps: c.stamps, total: c.total, cycle_size: c.cycle_size, stamped_today: c.stamped_today, next_title: c.next_title, remaining: c.remaining, ready: c.ready.length },
      links,
    } as ScanOut,
  }
}

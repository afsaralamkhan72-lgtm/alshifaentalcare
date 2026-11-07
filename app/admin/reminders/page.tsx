import FollowTabs from '@/components/admin/FollowTabs'
import { createClient } from '@/lib/supabase/server'
import { requireAnyPerm } from '@/lib/auth'
import { addDays, fmtDate, todayKarachi } from '@/lib/karachi'
import { maxDays } from '@/lib/duration'
import { getPrintCfg } from '@/lib/printSettings'
import { adabName, renderTemplate } from '@/lib/messageTemplates'
import ReminderList, { type ReminderRow } from '@/components/admin/ReminderList'

export const dynamic = 'force-dynamic'

type Pt = { id: string; full_name: string; phone: string; gender: string | null; department: string | null; deleted_at: string | null }
const deptWord = (d: string | null) => (d === 'homeopathic' ? 'homeo' : 'dental')

function muddat(left: number): string {
  if (left < 0) return 'ختم ہو چکی ہے'
  if (left === 0) return 'آج ختم ہو رہی ہے'
  if (left === 1) return 'کل ختم ہو جائے گی'
  return `${left} دن میں ختم ہو جائے گی`
}

export default async function RemindersPage() {
  await requireAnyPerm('prescriptions.view', 'clinical.view')
  const supabase = await createClient()
  const cfg = await getPrintCfg()
  const today = todayKarachi()
  const yesterday = addDays(today, -1)
  const before = cfg.remind.med_days_before

  const [rxRes, laterRes, visRes, todayVisRes] = await Promise.all([
    supabase
      .from('prescriptions')
      .select('id, patient_id, prescribed_date, items, patients(id, full_name, phone, gender, department, deleted_at)')
      .gte('prescribed_date', addDays(today, -120))
      .order('prescribed_date', { ascending: false })
      .limit(500),
    supabase.from('clinical_visits').select('patient_id, visit_date').eq('status', 'finished').gte('visit_date', addDays(today, -120)),
    supabase
      .from('clinical_visits')
      .select('id, patient_id, visit_date, patients(id, full_name, phone, gender, department, deleted_at)')
      .eq('status', 'finished')
      .eq('visit_date', yesterday),
    supabase.from('clinical_visits').select('patient_id').eq('visit_date', today),
  ])

  const rxAll = (rxRes.data ?? []) as unknown as { id: string; patient_id: string; prescribed_date: string; items: { name_en?: string; name_ur?: string; duration?: string }[] | null; patients: Pt | null }[]
  const latestRx = new Map<string, string>()
  for (const r of rxAll) if (!latestRx.has(r.patient_id) || r.prescribed_date > latestRx.get(r.patient_id)!) latestRx.set(r.patient_id, r.prescribed_date)
  const laterVisit = new Map<string, string>()
  for (const v of (laterRes.data ?? []) as { patient_id: string; visit_date: string }[]) if (!laterVisit.has(v.patient_id) || v.visit_date > laterVisit.get(v.patient_id)!) laterVisit.set(v.patient_id, v.visit_date)

  const med: ReminderRow[] = []
  const seen = new Set<string>()
  for (const r of rxAll) {
    const p = r.patients
    if (!p || p.deleted_at || seen.has(r.patient_id)) continue
    // sirf patient ki sab se nayi prescription; uske baad aur visit/prescription aa chuki ho to yaad-dahani nahi
    if (latestRx.get(r.patient_id) !== r.prescribed_date) continue
    if ((laterVisit.get(r.patient_id) ?? '') > r.prescribed_date) continue
    const days = maxDays((r.items ?? []).map((i) => i.duration))
    if (!days) continue
    const end = addDays(r.prescribed_date, days)
    const left = Math.round((new Date(`${end}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000)
    if (left > before || left < -7) continue
    seen.add(r.patient_id)
    const names = (r.items ?? []).map((i) => i.name_en || i.name_ur).filter(Boolean).join('، ')
    med.push({
      key: `m${r.id}`,
      name: p.full_name,
      phone: p.phone,
      dept: p.department ?? 'dental',
      note: `Dawa ${fmtDate(end)} ko khatam (${left < 0 ? `${-left} din pehle khatam` : left === 0 ? 'aaj' : `${left} din baqi`})`,
      text: renderTemplate(`med_reminder_${deptWord(p.department)}`, { adab: adabName(p.full_name, p.gender), name: p.full_name, medicine: names, muddat: muddat(left) }, cfg.tpl),
    })
  }
  med.sort((a, b) => a.note.localeCompare(b.note))

  const visitedToday = new Set(((todayVisRes.data ?? []) as { patient_id: string }[]).map((v) => v.patient_id))
  const next: ReminderRow[] = []
  const seenN = new Set<string>()
  for (const v of (visRes.data ?? []) as unknown as { patient_id: string; patients: Pt | null }[]) {
    const p = v.patients
    if (!p || p.deleted_at || seenN.has(v.patient_id) || visitedToday.has(v.patient_id)) continue
    seenN.add(v.patient_id)
    next.push({
      key: `n${v.patient_id}`,
      name: p.full_name,
      phone: p.phone,
      dept: p.department ?? 'dental',
      note: `Kal (${fmtDate(yesterday)}) aaye the`,
      text: renderTemplate(`nextday_${deptWord(p.department)}`, { adab: adabName(p.full_name, p.gender), name: p.full_name }, cfg.tpl),
    })
  }

  return (
    <div>
      <FollowTabs active="reminders" />
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Yaad-dahani</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">WhatsApp dabane par message khulta hai, bhejna aap khud dabate hain. Message bhejne se pehle badal bhi sakte hain.</p>

      <h2 className="mt-6 font-display text-lg font-semibold text-clinic-ink">Dawa khatam hone wali ({med.length})</h2>
      <p className="mb-2 text-xs text-clinic-ink/50">Dawa khatam hone se {before} din pehle se list mein aate hain. Jo marez dobara aa chuke unhein nahi dikhaya jata. Din badalne: Settings → Print, Logo aur QR.</p>
      <ReminderList rows={med} empty="Abhi kisi ki dawa khatam hone wali nahi." />

      <h2 className="mt-8 font-display text-lg font-semibold text-clinic-ink">Agle din ka hal ({next.length})</h2>
      <p className="mb-2 text-xs text-clinic-ink/50">Jo marez kal aaye the, un ka haal poochein.</p>
      <ReminderList rows={next} empty="Kal koi marez nahi aaya, ya sab aaj phir aa gaye." />
    </div>
  )
}

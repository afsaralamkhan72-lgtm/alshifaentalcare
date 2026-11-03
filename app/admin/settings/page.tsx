import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAnyPerm, getStaffProfile, isOwnerRole } from '@/lib/auth'
import DiscountLimits, { type LimitRow, type LogRow } from '@/components/admin/DiscountLimits'
import MedicineManager, { type Medicine } from '@/components/admin/MedicineManager'
import ReminderSetting from '@/components/admin/ReminderSetting'
import { getReminderDays } from '@/lib/reminders'
import ClinicOptionsManager, { type OptRow } from '@/components/admin/ClinicOptionsManager'
import PushToggle from '@/components/admin/PushToggle'
import PrintSettings from '@/components/admin/PrintSettings'
import { getPrintCfg } from '@/lib/printSettings'
import BackupPanel from '@/components/admin/BackupPanel'
import MessageTemplatesManager from '@/components/admin/MessageTemplatesManager'
import { OPTION_KINDS } from '@/lib/clinicOptions'

const SECTIONS = [
  { k: 'dental', l: 'Dental dawaiyan' },
  { k: 'homeopathic', l: 'Homeopathic dawaiyan' },
  { k: 'prices', l: 'Treatment prices' },
  { k: 'discounts', l: 'Riyayat ki had', owner: true },
  { k: 'lists', l: 'Takleef / Diagnosis list' },
  { k: 'messages', l: 'Messages (WhatsApp)' },
  { k: 'print', l: 'Print, Logo aur QR' },
  { k: 'notify', l: 'Phone notification', owner: true },
  { k: 'backup', l: 'Backup (data ki copy)' },
  { k: 'other', l: 'Reminder' },
]

/** Settings: dawaiyon ki dono listein (alag), treatment ki qeematein, reminder. Upar se neeche, koi tab nahi. */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireAnyPerm('settings.manage')
  const sp = await searchParams
  const staff = await getStaffProfile()
  const isOwner = Boolean(staff && isOwnerRole(staff.role))
  const sections = SECTIONS.filter((x) => !('owner' in x && x.owner) || isOwner)
  const s = sections.some((x) => x.k === sp.s) ? (sp.s as string) : 'dental'
  const supabase = await createClient()
  const printCfg = s === 'print' ? await getPrintCfg() : null
  const dlRes = s === 'discounts' ? await supabase.from('discount_limits').select('role, max_percent') : null
  const dgRes =
    s === 'discounts'
      ? await supabase.from('discount_log').select('id, created_at, kind, base_amount, discount_amount, percent, given_by_name, given_by_role, patient_id').order('created_at', { ascending: false }).limit(100)
      : null
  const logPatientIds = Array.from(new Set(((dgRes?.data ?? []) as { patient_id: string | null }[]).map((r) => r.patient_id).filter(Boolean))) as string[]
  const pnRes = logPatientIds.length ? await supabase.from('patients').select('id, full_name').in('id', logPatientIds) : { data: [] }
  const pn = new Map(((pnRes.data ?? []) as { id: string; full_name: string }[]).map((x) => [x.id, x.full_name]))
  const [{ data: meds, error }, days, optRes, msgRes, bkRes] = await Promise.all([
    s === 'dental' || s === 'homeopathic'
      ? supabase
          .from('medicines')
          .select('id, category, name, generic_name, brand_name, med_type, strength, dosage_form, potency, pack, default_dose, default_frequency, default_duration, instructions, price, available, stock_qty, is_active')
          .eq('category', s)
          .order('is_active', { ascending: false })
          .order('name')
      : Promise.resolve({ data: [], error: null }),
    getReminderDays(),
    s === 'lists' ? supabase.from('clinic_options').select('id, kind, label').order('kind').order('sort_order').order('label') : Promise.resolve({ data: [], error: null }),
    s === 'messages' ? supabase.from('message_templates').select('key, body') : Promise.resolve({ data: [], error: null }),
    s === 'backup' ? supabase.from('site_settings').select('value').eq('key', 'last_backup_at').maybeSingle() : Promise.resolve({ data: null }),
  ])

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Settings</h1>
      <div className="mt-4 grid gap-6 lg:grid-cols-[13rem_1fr]">
        <nav className="flex flex-row flex-wrap gap-2 lg:flex-col">
          {sections.map((x) => (
            <Link
              key={x.k}
              href={`/admin/settings?s=${x.k}`}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${s === x.k ? 'bg-clinic-teal text-white' : 'border border-clinic-teal/15 bg-white text-clinic-ink/70'}`}
            >
              {x.l}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">
          {(s === 'dental' || s === 'homeopathic') && (
            <>
              <h2 className="font-display text-lg font-semibold text-clinic-ink">{s === 'dental' ? 'Dental dawaiyan' : 'Homeopathic dawaiyan'}</h2>
              <p className="mb-3 text-sm text-clinic-ink/60">
                Prescription likhte waqt yahi list aati hai. &quot;Clinic mein milti hai&quot; wali dawa clinic se dene par us ki qeemat khud bill mein judti hai.
                Qeemat badalne se purane bill nahi badalte.
              </p>
              {error ? (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Dawaiyon ki list abhi nahi khul saki: {error.message}</p>
              ) : (
                <MedicineManager category={s as 'dental' | 'homeopathic'} rows={(meds ?? []).map((m) => ({ ...m, price: Number(m.price) })) as Medicine[]} />
              )}
            </>
          )}
          {s === 'prices' && (
            <div className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
              <h2 className="font-display text-lg font-semibold text-clinic-ink">Treatment prices</h2>
              <p className="mt-1 text-sm text-clinic-ink/60">Har treatment ki apni qeemat. Treatment chunte hi yahi qeemat aati hai; patient ke liye badal bhi sakte hain.</p>
              <Link href="/admin/prices" className="mt-3 inline-block rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white">
                Treatment prices kholein →
              </Link>
            </div>
          )}
          {s === 'discounts' && (
            <DiscountLimits
              missing={Boolean(dlRes?.error || dgRes?.error)}
              limits={((dlRes?.data ?? []) as { role: string; max_percent: number }[]).map((l) => ({ role: l.role, max_percent: Number(l.max_percent) })) as LimitRow[]}
              log={((dgRes?.data ?? []) as (Omit<LogRow, 'patient_name'> & { patient_id: string | null })[]).map((l) => ({
                ...l,
                base_amount: Number(l.base_amount),
                discount_amount: Number(l.discount_amount),
                percent: Number(l.percent),
                patient_name: l.patient_id ? pn.get(l.patient_id) ?? null : null,
              }))}
            />
          )}
          {s === 'print' && printCfg && <PrintSettings logo={printCfg.logo} defaults={printCfg.defaults} share={printCfg.share} remind={printCfg.remind} />}
          {s === 'notify' && <PushToggle />}
          {s === 'lists' && <ClinicOptionsManager kinds={OPTION_KINDS} rows={(optRes.data ?? []) as OptRow[]} missing={Boolean(optRes.error)} />}
          {s === 'messages' && <MessageTemplatesManager rows={(msgRes.data ?? []) as { key: string; body: string }[]} missing={Boolean(msgRes.error)} />}
          {s === 'backup' && <BackupPanel last={(bkRes.data as { value?: unknown } | null)?.value ? String((bkRes.data as { value: unknown }).value) : null} />}
          {s === 'other' && <ReminderSetting days={days} />}
        </div>
      </div>
    </div>
  )
}

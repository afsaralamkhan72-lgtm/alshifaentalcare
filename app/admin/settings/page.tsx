import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAnyPerm } from '@/lib/auth'
import MedicineManager, { type Medicine } from '@/components/admin/MedicineManager'
import ReminderSetting from '@/components/admin/ReminderSetting'
import { getReminderDays } from '@/lib/reminders'
import ClinicOptionsManager, { type OptRow } from '@/components/admin/ClinicOptionsManager'
import BackupPanel from '@/components/admin/BackupPanel'
import { OPTION_KINDS } from '@/lib/clinicOptions'

const SECTIONS = [
  { k: 'dental', l: 'Dental dawaiyan' },
  { k: 'homeopathic', l: 'Homeopathic dawaiyan' },
  { k: 'prices', l: 'Treatment prices' },
  { k: 'lists', l: 'Takleef / Diagnosis list' },
  { k: 'backup', l: 'Backup (data ki copy)' },
  { k: 'other', l: 'Reminder' },
]

/** Settings: dawaiyon ki dono listein (alag), treatment ki qeematein, reminder. Upar se neeche, koi tab nahi. */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireAnyPerm('settings.manage')
  const sp = await searchParams
  const s = SECTIONS.some((x) => x.k === sp.s) ? (sp.s as string) : 'dental'
  const supabase = await createClient()
  const [{ data: meds, error }, days, optRes, bkRes] = await Promise.all([
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
    s === 'backup' ? supabase.from('site_settings').select('value').eq('key', 'last_backup_at').maybeSingle() : Promise.resolve({ data: null }),
  ])

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Settings</h1>
      <div className="mt-4 grid gap-6 lg:grid-cols-[13rem_1fr]">
        <nav className="flex flex-row flex-wrap gap-2 lg:flex-col">
          {SECTIONS.map((x) => (
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
          {s === 'lists' && <ClinicOptionsManager kinds={OPTION_KINDS} rows={(optRes.data ?? []) as OptRow[]} missing={Boolean(optRes.error)} />}
          {s === 'backup' && <BackupPanel last={(bkRes.data as { value?: unknown } | null)?.value ? String((bkRes.data as { value: unknown }).value) : null} />}
          {s === 'other' && <ReminderSetting days={days} />}
        </div>
      </div>
    </div>
  )
}

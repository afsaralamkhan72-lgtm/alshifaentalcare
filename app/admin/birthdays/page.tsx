import { createClient } from '@/lib/supabase/server'
import BirthdayCard, { type BirthdayPatient } from '@/components/admin/BirthdayCard'

const DEFAULT_OFFER = {
  enabled: true,
  message:
    'Aap ko salgirah bohat bohat mubarak ho! Al Shifa Health Care ki taraf se aap ke liye is maheene free dental check-up ka tohfa hai.',
  offer_label: 'Free Dental Check-up',
}

/** Day-of-year style key so we can compare birthdays ignoring the year */
function mmdd(dateStr: string) {
  return dateStr.slice(5, 10) // "MM-DD"
}

function ageOn(dob: string) {
  const b = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const beforeBirthday =
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
  if (beforeBirthday) age--
  return age
}

export default async function BirthdaysPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, phone, department, date_of_birth')
    .is('deleted_at', null)
    .not('date_of_birth', 'is', null)

  const { data: settingRow } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'birthday_offer')
    .maybeSingle()

  const offer = { ...DEFAULT_OFFER, ...((settingRow?.value ?? {}) as typeof DEFAULT_OFFER) }

  // date_of_birth column missing -> phase2.sql not re-run yet
  if (error) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-clinic-ink">Birthdays</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Database setup baaki hai</p>
          <p className="mt-2 text-sm text-amber-700">
            Supabase → SQL Editor mein <strong>phase2.sql</strong> dobara chalayein (us mein ab
            birthday column bhi hai). Purani tables ko koi nuqsan nahi hoga.
          </p>
        </div>
      </div>
    )
  }

  const patients = (data ?? []) as BirthdayPatient[]

  const now = new Date()
  const todayKey = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const monthKey = String(now.getMonth() + 1).padStart(2, '0')

  // Next 7 days (wraps across month end)
  const weekKeys: string[] = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    weekKeys.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  const enriched = patients
    .filter((p) => p.date_of_birth)
    .map((p) => ({ ...p, key: mmdd(p.date_of_birth!), age: ageOn(p.date_of_birth!) }))

  const today = enriched.filter((p) => p.key === todayKey)
  const thisWeek = enriched.filter((p) => weekKeys.includes(p.key))
  const thisMonth = enriched
    .filter((p) => p.key.startsWith(monthKey) && p.key !== todayKey && !weekKeys.includes(p.key))
    .sort((a, b) => a.key.localeCompare(b.key))

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Birthdays</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Patients ko salgirah ki mubarakbad aur offer WhatsApp par bhejein.
      </p>

      <div className="mt-4 rounded-2xl border border-clinic-teal/10 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-clinic-teal">
          Current Offer
        </p>
        <p className="mt-1 font-medium text-clinic-ink">{offer.offer_label}</p>
        <p className="mt-1 text-sm text-clinic-ink/60">{offer.message}</p>
        <p className="mt-2 text-xs text-clinic-ink/40">
          Ye wording Edit Website → Settings se badli ja sakti hai (key: birthday_offer).
        </p>
      </div>

      <Section
        title={`Aaj (${today.length})`}
        accent
        empty="Aaj kisi ki salgirah nahi hai."
        items={today}
        offer={offer}
      />
      <Section
        title={`Agle 7 din (${thisWeek.length})`}
        empty="Agle hafte koi salgirah nahi."
        items={thisWeek}
        offer={offer}
      />
      <Section
        title={`Is maheene baaki (${thisMonth.length})`}
        empty="Is maheene aur koi salgirah nahi."
        items={thisMonth}
        offer={offer}
      />

      {enriched.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-8 text-center text-sm text-clinic-ink/60">
          Abhi kisi patient ki birthday save nahi hui. Patient add ya edit karte waqt
          &quot;Date of Birth&quot; daalein, ye optional hai.
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  items,
  empty,
  offer,
  accent = false,
}: {
  title: string
  items: (BirthdayPatient & { age: number })[]
  empty: string
  offer: { message: string; offer_label: string }
  accent?: boolean
}) {
  return (
    <>
      <h2
        className={`mt-8 font-display text-lg font-semibold ${
          accent ? 'text-clinic-amber' : 'text-clinic-ink'
        }`}
      >
        {title}
      </h2>
      <div className="mt-3 grid gap-3">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 px-4 py-6 text-center text-sm text-clinic-ink/50">
            {empty}
          </p>
        ) : (
          items.map((p) => (
            <BirthdayCard key={p.id} patient={p} age={p.age} offer={offer} highlight={accent} />
          ))
        )}
      </div>
    </>
  )
}

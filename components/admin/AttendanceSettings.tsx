'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyError } from '@/lib/errors'
import { getPosition } from '@/lib/geo'
import { DAYS_UR, dateLabel, hm, type LeaveType, type Rules } from '@/lib/attendanceUi'
import { issueDeviceLink, revokeDeviceLink } from '@/app/admin/attendance/actions'

export interface StaffSet {
  id: string
  full_name: string
  title: string | null
  joined_on: string | null
  shift_start: string | null
  shift_end: string | null
  weekly_off: number[] | null
  attendance_on: boolean
  profile_id: string | null
  is_active: boolean
}
export interface ProfileOpt { id: string; full_name: string; role: string }
export interface ClosedDay { day: string; closed: boolean; reason: string | null }

const box = 'rounded-2xl border border-clinic-teal/10 bg-white p-4 sm:p-5'
const inp = 'rounded-lg border border-clinic-teal/25 px-2 py-1.5 text-sm'
const btn = 'rounded-full bg-clinic-teal px-5 py-1.5 text-xs font-semibold text-white disabled:opacity-40'

function DayPicks({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DAYS_UR.map((n, i) => (
        <label key={i} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${value.includes(i) ? 'border-clinic-teal bg-clinic-teal text-white' : 'border-clinic-teal/25 text-clinic-ink/70'}`}>
          <input type="checkbox" className="sr-only" checked={value.includes(i)} onChange={(e) => onChange(e.target.checked ? [...value, i].sort() : value.filter((x) => x !== i))} />
          {n}
        </label>
      ))}
    </div>
  )
}

export default function AttendanceSettings({
  rules,
  leaveTypes,
  staff,
  profiles,
  closedDays,
  today,
}: {
  rules: Rules
  leaveTypes: LeaveType[]
  staff: StaffSet[]
  profiles: ProfileOpt[]
  closedDays: ClosedDay[]
  today: string
}) {
  const router = useRouter()
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')
  const [rl, setRl] = useState({
    work_start: hm(rules.work_start),
    shift_end: hm(rules.shift_end),
    grace: String(rules.grace_minutes),
    late_from: rules.late_from,
    weekly_off: rules.weekly_off,
    cut_late: rules.cut_late,
    early_cut: rules.early_cut,
    absent_cut: rules.absent_cut,
    overtime_on: rules.overtime_on,
    overtime_mult: String(rules.overtime_mult),
    overtime_min: String(rules.overtime_min),
    pay_day: rules.pay_day ? String(rules.pay_day) : '',
    remind_days: String(rules.remind_days),
    require_location: rules.require_location,
    radius_m: String(rules.radius_m),
  })
  const [cd, setCd] = useState({ from: today, to: today, why: '' })
  const [nl, setNl] = useState({ name: '', paid: true, quota: '' })
  const [link, setLink] = useState('')

  async function rpc(key: string, fn: string, args: Record<string, unknown>, ok: string) {
    setBusy(key)
    setErr('')
    setMsg('')
    const { error } = await createClient().rpc(fn, args)
    setBusy('')
    if (error) {
      setErr(friendlyError(error.message))
      return false
    }
    setMsg(ok)
    router.refresh()
    return true
  }

  const saveRules = () =>
    rpc(
      'rules',
      'attendance_set_rules2',
      {
        p: {
          work_start: rl.work_start,
          shift_end: rl.shift_end,
          grace_minutes: Number(rl.grace) || 0,
          late_from: rl.late_from,
          weekly_off: rl.weekly_off,
          cut_late: rl.cut_late,
          early_cut: rl.early_cut,
          absent_cut: rl.absent_cut,
          overtime_on: rl.overtime_on,
          overtime_mult: Number(rl.overtime_mult) || 0,
          overtime_min: Number(rl.overtime_min) || 0,
          pay_day: rl.pay_day ? Number(rl.pay_day) : '',
          remind_days: Number(rl.remind_days) || 0,
          require_location: rl.require_location,
          radius_m: Number(rl.radius_m) || 150,
        },
      },
      'Qaide mehfooz ho gaye'
    )

  async function setLocation() {
    setErr('')
    setMsg('Location dhoondh raha hun... (browser ijazat maange to "Allow" dabayen)')
    const p = await getPosition()
    if (!p) {
      setMsg('')
      return setErr('Location nahi mili. Browser mein location ki ijazat dein aur clinic ke andar khade ho kar dobara dabayen.')
    }
    if (p.acc > 100 && !confirm(`Location ka andaza ${Math.round(p.acc)} meter idhar-udhar ka hai. Phir bhi yahi rakhein?`)) {
      return setMsg('')
    }
    await rpc('loc', 'attendance_set_clinic_location', { p_lat: p.lat, p_lng: p.lng }, 'Clinic ki location mehfooz ho gayi')
  }

  async function makeLink() {
    setBusy('link')
    const r = await issueDeviceLink()
    setBusy('')
    if (!r.ok) return setErr(r.message)
    setLink(`${window.location.origin}/hazri/${r.token}`)
    router.refresh()
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}

      <section className={box}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Waqt, mohlat aur haftawar chhutti</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <label className="grid gap-0.5">Kaam shuru hone ka waqt
            <input type="time" value={rl.work_start} onChange={(e) => setRl({ ...rl, work_start: e.target.value })} className={inp} />
          </label>
          <label className="grid gap-0.5">Kaam khatam hone ka waqt
            <input type="time" value={rl.shift_end} onChange={(e) => setRl({ ...rl, shift_end: e.target.value })} className={inp} />
          </label>
          <label className="grid gap-0.5">Mohlat (grace) minute
            <input type="number" min={0} max={240} value={rl.grace} onChange={(e) => setRl({ ...rl, grace: e.target.value })} className={inp} />
            <span className="text-[11px] text-clinic-ink/50">Mohlat ke andar aane par katauti nahi aur likha aata hai &quot;waqt par&quot;.</span>
          </label>
          <label className="grid min-w-0 gap-0.5">Mohlat ke baad late kahan se ginein?
            <select value={rl.late_from} onChange={(e) => setRl({ ...rl, late_from: e.target.value as Rules['late_from'] })} className={`${inp} w-full min-w-0`}>
              <option value="shift_start">Shift ke shuru se (9:00 se, jaise 9:20 = 20 minute)</option>
              <option value="after_grace">Mohlat khatam hone se (9:15 se, 9:20 = 5 minute)</option>
            </select>
          </label>
        </div>
        <div className="mt-3 text-sm">
          <p>Haftawar chhutti (in dinon clinic band, koi katauti nahi)</p>
          <div className="mt-1">
            <DayPicks value={rl.weekly_off} onChange={(v) => setRl({ ...rl, weekly_off: v })} />
          </div>
        </div>
      </section>

      <section className={box}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Katauti aur overtime</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={rl.cut_late} onChange={(e) => setRl({ ...rl, cut_late: e.target.checked })} /> Late aane ke minute ki katauti</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={rl.early_cut} onChange={(e) => setRl({ ...rl, early_cut: e.target.checked })} /> Waqt se pehle jaane ke minute ki katauti</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={rl.absent_cut} onChange={(e) => setRl({ ...rl, absent_cut: e.target.checked })} /> Ghair-hazri (aur aadhe din) par shift ke minute ki katauti</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={rl.overtime_on} onChange={(e) => setRl({ ...rl, overtime_on: e.target.checked })} /> Overtime ginein (shift ke baad ruke hue minute, aur band din ka poora kaam)</label>
          {rl.overtime_on && (
            <div className="grid gap-3 pl-6 sm:grid-cols-2">
              <label className="grid gap-0.5">Overtime ka rate (aam minute ka kitna guna)
                <input type="number" min={0} max={10} step="0.25" value={rl.overtime_mult} onChange={(e) => setRl({ ...rl, overtime_mult: e.target.value })} className={inp} />
              </label>
              <label className="grid gap-0.5">Itne minute se kam ruke to ginti nahi
                <input type="number" min={0} max={240} value={rl.overtime_min} onChange={(e) => setRl({ ...rl, overtime_min: e.target.value })} className={inp} />
              </label>
            </div>
          )}
          <p className="text-[11px] text-clinic-ink/50">Unpaid chhutti ki katauti hamesha lagti hai. Jis din hazri likhi nahi, us ki katauti nahi banti.</p>
        </div>
      </section>

      <section className={box}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Tankhwah ki tareekh</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <label className="grid gap-0.5">Har mahine ki tareekh (1 se 28)
            <input type="number" min={1} max={28} value={rl.pay_day} onChange={(e) => setRl({ ...rl, pay_day: e.target.value })} placeholder="jaise 5" className={inp} />
          </label>
          <label className="grid gap-0.5">Kitne din pehle yaad dilayen
            <input type="number" min={0} max={14} value={rl.remind_days} onChange={(e) => setRl({ ...rl, remind_days: e.target.value })} className={inp} />
          </label>
        </div>
        <p className="mt-1 text-[11px] text-clinic-ink/50">Yaad-dehani Home aur Salary page par patti ki shakal mein aati hai. Software paise khud nahi bhejta; aap dete hain aur entry confirm karte hain.</p>
      </section>

      <section className={box}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Hazri sirf clinic ke andar</h2>
        <p className="mt-1 text-sm text-clinic-ink/60">
          {rules.clinic_lat != null && rules.clinic_lng != null
            ? `Clinic ki location mehfooz hai (${rules.clinic_lat}, ${rules.clinic_lng}).`
            : 'Clinic ki location abhi set nahi.'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy === 'loc'} onClick={setLocation} className="rounded-full border border-clinic-teal px-4 py-1.5 text-xs font-semibold text-clinic-teal disabled:opacity-40">
            Yahan ko clinic banao
          </button>
          <span className="text-[11px] text-clinic-ink/50">Clinic ke andar khade ho kar dabayen.</span>
        </div>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <label className="grid gap-0.5">Kitne meter ke andar hazri lage
            <input type="number" min={20} max={5000} value={rl.radius_m} onChange={(e) => setRl({ ...rl, radius_m: e.target.value })} className={inp} />
            <span className="text-[11px] text-clinic-ink/50">Imarat ke andar GPS 20-50 meter idhar-udhar ho sakta hai, is liye bohat chhota na rakhein.</span>
          </label>
          <label className="flex items-center gap-2 pt-1">
            <input type="checkbox" className="h-4 w-4" checked={rl.require_location} disabled={rules.clinic_lat == null} onChange={(e) => setRl({ ...rl, require_location: e.target.checked })} />
            Location ki shart lagayen (pehle clinic ki location set karein)
          </label>
        </div>
        <button type="button" disabled={busy === 'rules'} onClick={saveRules} className={`mt-4 ${btn}`}>
          Ye saare qaide mehfooz karein
        </button>
      </section>

      <section className={box}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Clinic band din</h2>
        <p className="mt-1 text-xs text-clinic-ink/55">Band din par koi katauti nahi lagti aur woh din mahine ke minute mein ginay nahi jate. Aik ya kai din (jaise eid ki chhuttiyan, ya aane wale din) pehle se bhi band ho sakte hain.</p>
        <div className="mt-3 flex flex-wrap items-end gap-2 text-sm">
          <label className="grid gap-0.5 text-xs">Se<input type="date" value={cd.from} onChange={(e) => setCd({ ...cd, from: e.target.value, to: cd.to < e.target.value ? e.target.value : cd.to })} className={inp} /></label>
          <label className="grid gap-0.5 text-xs">Tak<input type="date" min={cd.from} value={cd.to} onChange={(e) => setCd({ ...cd, to: e.target.value })} className={inp} /></label>
          <label className="grid min-w-0 flex-1 gap-0.5 text-xs">Wajah<input value={cd.why} onChange={(e) => setCd({ ...cd, why: e.target.value })} placeholder="jaise Eid ki chhutti" className={`${inp} w-full min-w-0`} /></label>
          <button type="button" disabled={busy === 'cd'} onClick={() => rpc('cd', 'clinic_set_days', { p_from: cd.from, p_to: cd.to, p_closed: true, p_reason: cd.why || null }, 'Din band likh diye')} className={btn}>
            Band karein
          </button>
        </div>
        <ul className="mt-3 grid gap-1 text-sm">
          {closedDays.filter((c) => c.closed).length === 0 && <li className="text-xs text-clinic-ink/50">Abhi koi khaas band din nahi.</li>}
          {closedDays.filter((c) => c.closed).map((c) => (
            <li key={c.day} className="flex items-center gap-2 border-t border-clinic-teal/10 pt-1">
              <span>{dateLabel(c.day)}</span>
              {c.reason && <span className="text-xs text-clinic-ink/55">{c.reason}</span>}
              <button type="button" disabled={busy === 'o' + c.day} onClick={() => rpc('o' + c.day, 'clinic_set_days', { p_from: c.day, p_to: c.day, p_closed: false, p_reason: 'Khuli' }, 'Din khuli kar diya')} className="ml-auto text-xs text-clinic-teal underline">
                khuli karein
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={box}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Chhutti ki qismein</h2>
        <p className="mt-1 text-xs text-clinic-ink/55">&quot;Tankhwah ke saath&quot; chhutti mein katauti nahi. &quot;Bagair tankhwah&quot; mein shift ke minute kat-te hain. Saalana quota se zyada chhutti khud bagair tankhwah ginti hai.</p>
        <ul className="mt-3 grid gap-2">
          {leaveTypes.map((t) => (
            <LeaveRow key={t.id} t={t} onSave={(v) => rpc('lt' + t.id, 'leave_type_save', { p_id: t.id, p_name: v.name, p_paid: v.paid, p_quota: v.quota === '' ? null : Number(v.quota), p_active: v.active }, 'Mehfooz ho gaya')} />
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-end gap-2 text-sm">
          <label className="grid min-w-0 flex-1 gap-0.5 text-xs">Nayi qism<input value={nl.name} onChange={(e) => setNl({ ...nl, name: e.target.value })} placeholder="jaise Bimari ki chhutti" className={`${inp} w-full min-w-0`} /></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={nl.paid} onChange={(e) => setNl({ ...nl, paid: e.target.checked })} /> tankhwah ke saath</label>
          <label className="grid gap-0.5 text-xs">Saalana quota<input type="number" min={0} value={nl.quota} onChange={(e) => setNl({ ...nl, quota: e.target.value })} placeholder="khali = hadd nahi" className={`${inp} w-32`} /></label>
          <button type="button" disabled={busy === 'ltn' || !nl.name.trim()} onClick={async () => { if (await rpc('ltn', 'leave_type_save', { p_id: null, p_name: nl.name, p_paid: nl.paid, p_quota: nl.quota === '' ? null : Number(nl.quota), p_active: true }, 'Nayi qism jur gayi')) setNl({ name: '', paid: true, quota: '' }) }} className={btn}>
            Jorein
          </button>
        </div>
      </section>

      <section className={box}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Har staff ki settings</h2>
        <p className="mt-1 text-xs text-clinic-ink/55">Khali chorrein to upar wali shift aur haftawar chhutti lagti hai. Doctor sahab (owner) ki hazri nahi lagti: unke saamne &quot;hazri lagti hai&quot; ka nishan hata dein ya unhe staff mein na rakhein.</p>
        <ul className="mt-3 grid gap-3">
          {staff.filter((s) => s.is_active).map((s) => (
            <StaffRowSet key={s.id} s={s} profiles={profiles} onSave={(p) => rpc('s' + s.id, 'staff_att_settings', { p_staff: s.id, p }, `${s.full_name} ki settings mehfooz`)} />
          ))}
        </ul>
      </section>

      <section className={box}>
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Clinic ka phone (jin ke paas smartphone nahi)</h2>
        <p className="mt-1 text-xs text-clinic-ink/55">Clinic ka aik phone ya tablet darwaze par rakhein. Staff apna naam chun kar apna PIN likhta hai (wahi PIN jo Salary page par staff ke link ke saath banta hai). Location ki shart yahan bhi chalti hai.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy === 'link'} onClick={makeLink} className={btn}>
            {rules.device_hash ? 'Naya link banayein (purana band)' : 'Link banayein'}
          </button>
          {rules.device_hash && (
            <button type="button" onClick={async () => { if (confirm('Clinic ke phone ka link band karein?')) { await revokeDeviceLink(); setLink(''); router.refresh() } }} className="text-xs text-red-600 underline">
              link band karein
            </button>
          )}
        </div>
        {link && (
          <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm">
            <p className="font-semibold text-emerald-900">Ye link abhi note kar lein (dobara nahi dikhega):</p>
            <p className="mt-1 break-all font-mono text-xs">{link}</p>
            <p className="mt-1 text-[11px] text-emerald-900">Isay clinic ke phone ke browser mein kholen aur &quot;Home screen par jorein&quot; kar dein. Kisi ko na bhejein.</p>
          </div>
        )}
        {!link && rules.device_hash && <p className="mt-2 text-xs text-emerald-700">Link bana hua hai.</p>}
      </section>
    </div>
  )
}

function LeaveRow({ t, onSave }: { t: LeaveType; onSave: (v: { name: string; paid: boolean; quota: string; active: boolean }) => void }) {
  const [v, setV] = useState({ name: t.name, paid: t.paid, quota: t.yearly_quota == null ? '' : String(t.yearly_quota), active: t.active })
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-clinic-teal/15 p-2 text-sm">
      <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={`${inp} min-w-0 flex-1`} />
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={v.paid} onChange={(e) => setV({ ...v, paid: e.target.checked })} /> tankhwah ke saath</label>
      <input type="number" min={0} value={v.quota} onChange={(e) => setV({ ...v, quota: e.target.value })} placeholder="quota" className={`${inp} w-24`} aria-label="Saalana quota" />
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> chalu</label>
      <button type="button" onClick={() => onSave(v)} className="rounded-full border border-clinic-teal px-3 py-1 text-xs font-semibold text-clinic-teal">Mehfooz</button>
    </li>
  )
}

function StaffRowSet({ s, profiles, onSave }: { s: StaffSet; profiles: ProfileOpt[]; onSave: (p: Record<string, unknown>) => void }) {
  const [v, setV] = useState({
    on: s.attendance_on,
    joined: s.joined_on ?? '',
    ss: hm(s.shift_start),
    se: hm(s.shift_end),
    ownOff: s.weekly_off != null,
    off: s.weekly_off ?? [],
    profile: s.profile_id ?? '',
  })
  return (
    <li className="rounded-xl border border-clinic-teal/15 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-clinic-ink">{s.full_name}</span>
        {s.title && <span className="text-xs text-clinic-ink/55">{s.title}</span>}
        <label className="ml-auto flex items-center gap-1 text-xs"><input type="checkbox" checked={v.on} onChange={(e) => setV({ ...v, on: e.target.checked })} /> hazri lagti hai</label>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        <label className="grid gap-0.5 text-xs">Kaam shuru (is ka alag)<input type="time" value={v.ss} onChange={(e) => setV({ ...v, ss: e.target.value })} className={inp} /></label>
        <label className="grid gap-0.5 text-xs">Kaam khatam (is ka alag)<input type="time" value={v.se} onChange={(e) => setV({ ...v, se: e.target.value })} className={inp} /></label>
        <label className="grid gap-0.5 text-xs">Joining ki tareekh<input type="date" value={v.joined} onChange={(e) => setV({ ...v, joined: e.target.value })} className={inp} /></label>
        <label className="grid gap-0.5 text-xs">Software login (admin ke liye)
          <select value={v.profile} onChange={(e) => setV({ ...v, profile: e.target.value })} className={inp}>
            <option value="">— koi nahi —</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
          </select>
        </label>
      </div>
      <label className="mt-2 flex items-center gap-1 text-xs"><input type="checkbox" checked={v.ownOff} onChange={(e) => setV({ ...v, ownOff: e.target.checked })} /> Is ki haftawar chhutti alag hai</label>
      {v.ownOff && <div className="mt-1"><DayPicks value={v.off} onChange={(x) => setV({ ...v, off: x })} /></div>}
      <button
        type="button"
        onClick={() => onSave({ attendance_on: v.on, joined_on: v.joined, shift_start: v.ss, shift_end: v.se, weekly_off: v.ownOff ? v.off : null, profile_id: v.profile })}
        className="mt-3 rounded-full border border-clinic-teal px-4 py-1 text-xs font-semibold text-clinic-teal"
      >
        Mehfooz
      </button>
    </li>
  )
}

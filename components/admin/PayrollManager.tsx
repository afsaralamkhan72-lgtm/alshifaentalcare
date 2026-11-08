'use client'

import { useState, useTransition } from 'react'
import { failed } from '@/lib/notifyError'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { money, fmtDate, numFmt } from '@/lib/karachi'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'
import { issueStaffPortal, revokeStaffPortal } from '@/app/admin/payroll/actions'

export interface StaffRow {
  id: string
  full_name: string
  title: string | null
  phone: string | null
  monthly_salary: number
  is_active: boolean
}
export interface BalanceRow {
  staff_id: string
  balance: number
  total_advance: number
  unconfirmed: number
}
export interface LedgerRow {
  id: string
  staff_id: string
  entry_date: string
  kind: string
  amount: number
  period: string | null
  note: string | null
  acknowledged_at: string | null
}
export interface AccessRow {
  staff_id: string
  revoked_at: string | null
  last_login_at: string | null
  locked_until: string | null
}

const KIND: Record<string, string> = {
  salary_due: 'Mahana salary',
  bonus: 'Bonus',
  deduction: 'Katauti',
  advance: 'Advance',
  payout: 'Salary di',
}
const input = 'rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm outline-none focus:border-clinic-teal'

export default function PayrollManager({
  today,
  period,
  lastMonth,
  staff,
  balances,
  ledger,
  access,
}: {
  today: string
  period: string
  /** pichhla mahina (jo khatam ho chuka): iski salary tayyar hoti hai */
  lastMonth: string
  staff: StaffRow[]
  balances: BalanceRow[]
  ledger: LedgerRow[]
  access: AccessRow[]
}) {
  const router = useRouter()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [nf, setNf] = useState({ full_name: '', title: '', phone: '', monthly_salary: '', joined_on: today })

  async function addStaff(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { error } = await supabase.from('staff_members').insert({
      full_name: nf.full_name.trim(),
      title: nf.title.trim() || null,
      phone: nf.phone.trim() || null,
      monthly_salary: Number(nf.monthly_salary || 0),
      joined_on: nf.joined_on || today,
    })
    if (error) return setMsg({ ok: false, text: 'Staff save nahi hua.' })
    setNf({ full_name: '', title: '', phone: '', monthly_salary: '', joined_on: today })
    setMsg({ ok: true, text: 'Staff add ho gaya.' })
    router.refresh()
  }

  async function generate() {
    const supabase = createClient()
    const { data: calc } = await supabase.rpc('payroll_calc', { p_period: lastMonth })
    const rowsC = (Array.isArray(calc) ? calc : []) as { full_name: string; absent: number; unmarked: number }[]
    const absents = rowsC.filter((r) => Number(r.absent) > 0)
    const unm = rowsC.filter((r) => Number(r.unmarked) > 0)
    const warn = unm.length
      ? `\n\nPehle confirm karein: in ki hazri mark nahi hui: ${unm.map((r) => `${r.full_name} (${r.unmarked} din)`).join(', ')}. Hazri mein jaa kar Present, Chhutti ya Ghair-hazir chunein.\n\n`
      : absents.length
      ? `\n\nDhyan: in ke ghair-hazir din salary se kategi: ${absents.map((r) => `${r.full_name} (${r.absent} din)`).join(', ')}. Agar koi din paid chhutti hona chahiye to pehle Hazri mein theek karein.\n\n`
      : '\n\n'
    if (!confirm(`${lastMonth} ka mahina sab staff ke liye tayyar karein?${warn} Salary, hazri ki katauti aur overtime khate mein likh di jayegi, aur is mahine ki hazri lock ho jayegi.`)) return
    const { data, error } = await supabase.rpc('payroll_finalize_all', { p_period: lastMonth })
    if (error) return setMsg({ ok: false, text: error.message })
    setMsg({ ok: true, text: `${lastMonth}: ${data} staff ka mahina tayyar ho gaya (salary, katauti, overtime khate mein likh di). Jin ka pehle ho chuka tha unhe dobara nahi banaya.` })
    router.refresh()
  }

  const totalOwed = balances.reduce((s, b) => s + Math.max(0, Number(b.balance)), 0)
  const totalExtra = balances.reduce((s, b) => s + Math.max(0, -Number(b.balance)), 0)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clinic-teal/10 bg-white p-4">
        <div>
          <p className="text-xs text-clinic-ink/50">Staff ko kul dena baqaya</p>
          <p className="font-display text-xl font-semibold text-clinic-ink">{money(totalOwed)}</p>
          {totalExtra > 0 && <p className="text-[11px] text-red-600">Staff ne zyada liya: {money(totalExtra)}</p>}
        </div>
        <button onClick={generate} className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white">
          {lastMonth} ka mahina tayyar karein
        </button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}

      <div className="grid gap-4">
        {staff.map((s) => (
          <StaffCard
            key={s.id}
            s={s}
            today={today}
            period={period}
            bal={balances.find((b) => b.staff_id === s.id)}
            rows={ledger.filter((l) => l.staff_id === s.id)}
            acc={access.find((a) => a.staff_id === s.id)}
          />
        ))}
        {staff.length === 0 && (
          <p className="rounded-2xl border border-dashed border-clinic-teal/20 p-8 text-center text-sm text-clinic-ink/50">
            Abhi koi staff nahi. Neeche se add karein.
          </p>
        )}
      </div>

      <p className="rounded-2xl border border-dashed border-clinic-teal/30 p-4 text-sm text-clinic-ink/70">
        Naya staff yahan nahi, <a href="/admin/staff" className="font-semibold text-clinic-teal underline">&quot;Log aur Permissions&quot;</a> mein aik hi form se banta hai.
      </p>
    </div>
  )
}

function StaffCard({
  s,
  today,
  period,
  bal,
  rows,
  acc,
}: {
  period: string
  s: StaffRow
  today: string
  bal?: BalanceRow
  rows: LedgerRow[]
  acc?: AccessRow
}) {
  const router = useRouter()
  const [kind, setKind] = useState('advance')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [key, setKey] = useState(() => crypto.randomUUID())
  const [issued, setIssued] = useState<{ token: string; pin: string } | null>(null)
  const [lastMsg, setLastMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const balance = Number(bal?.balance ?? 0)
  const monthOf = (r: LedgerRow) => r.period ?? r.entry_date.slice(0, 7)
  const prevBal = rows.filter((r) => monthOf(r) < period).reduce((t, r) => t + Number(r.amount), 0)
  const cur = rows.filter((r) => monthOf(r) === period)
  const curSalary = cur.filter((r) => r.kind === 'salary_due' || r.kind === 'bonus').reduce((t, r) => t + Number(r.amount), 0)
  const curTaken = cur.filter((r) => r.kind === 'advance' || r.kind === 'payout' || r.kind === 'deduction').reduce((t, r) => t + Number(r.amount), 0)
  const needsMethod = kind === 'advance' || kind === 'payout'
  const portalOn = !!acc && !acc.revoked_at
  const locked = !!acc?.locked_until && new Date(acc.locked_until).getTime() > Date.now()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const supabase = createClient()
    const { error } = await supabase.rpc('staff_add_entry', {
      p_staff_id: s.id,
      p_kind: kind,
      p_amount: Number(amount),
      p_date: date,
      p_period: null,
      p_method: needsMethod ? method : null,
      p_note: note || null,
      p_key: key,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    const amt = Number(amount)
    const word = kind === 'advance' ? 'advance (peshgi)' : kind === 'payout' ? 'tankhwah ada' : kind === 'deduction' ? 'katauti' : 'bonus'
    const after = kind === 'bonus' ? balance + amt : balance - amt
    setLastMsg(
      `Assalam o Alaikum ${s.full_name},\n${date} ko aap ko Rs. ${numFmt(amt)} ${word} ${kind === 'deduction' ? 'lagayi gayi' : kind === 'bonus' ? 'di gayi' : 'di gayi'}${needsMethod ? ` (${method})` : ''}.${note ? `\nWajah/note: ${note}` : ''}\nAb aap ka baqaya: Rs. ${numFmt(after)}.\n\n${CLINIC.name}`,
    )
    setAmount('')
    setNote('')
    setKey(crypto.randomUUID())
    router.refresh()
  }

  function issue() {
    if (portalOn && !window.confirm('Naya link/PIN banane se purana link band ho jayega. Jaari rakhein?')) return
    start(async () => {
      const r = await issueStaffPortal(s.id)
      if (r.ok) setIssued({ token: r.token, pin: r.pin })
      else setErr(r.message)
      router.refresh()
    })
  }

  function revoke() {
    if (!window.confirm(`${s.full_name} ka link band kar dein?`)) return
    start(async () => {
      await revokeStaffPortal(s.id)
      setIssued(null)
      router.refresh()
    })
  }

  async function toggleActive() {
    const supabase = createClient()
    const { error } = await supabase.from('staff_members').update({ is_active: !s.is_active }).eq('id', s.id)
    if (failed(error, 'Staff ka status badalna')) return
    if (s.is_active) await revokeStaffPortal(s.id)
    router.refresh()
  }

  async function changeSalary() {
    const v = window.prompt(`${s.full_name} ki nayi mahana salary (abhi ${s.monthly_salary}). Purani banayi hui salary nahi badlegi:`)
    if (v === null || v.trim() === '' || Number.isNaN(Number(v)) || Number(v) < 0) return
    const supabase = createClient()
    const { error } = await supabase.from('staff_members').update({ monthly_salary: Number(v) }).eq('id', s.id)
    if (failed(error, 'Salary badalna')) return
    router.refresh()
  }

  const url = issued && typeof window !== 'undefined' ? `${window.location.origin}/staff/${issued.token}` : ''
  const wa = (text: string) => buildWhatsAppLink({ phoneOverride: s.phone ?? undefined, customMessage: text })
  const summaryMsg = [
    `Assalam o Alaikum ${s.full_name},`,
    `${CLINIC.name} se aap ka hisaab:`,
    `Abhi baqaya: ${money(balance)}`,
    ...rows.slice(0, 5).map((r) => `${fmtDate(r.entry_date)} ${KIND[r.kind] ?? r.kind}: ${money(Math.abs(Number(r.amount)))}`),
  ].join('\n')

  return (
    <div className={`rounded-2xl border bg-white p-4 ${s.is_active ? 'border-clinic-teal/10' : 'border-clinic-ink/10 opacity-60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display font-semibold text-clinic-ink">
            {s.full_name} <span className="text-xs font-normal text-clinic-ink/50">{s.title}</span>
          </p>
          <p className="text-xs text-clinic-ink/50">Salary {money(s.monthly_salary)} / mahina</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-clinic-ink/50">{balance < 0 ? 'Zyada liya (agle mahine se kategi)' : 'Baqaya (dena hai)'}</p>
          <p className={`font-display text-lg font-semibold ${balance < 0 ? 'text-red-600' : 'text-clinic-ink'}`}>
            {balance < 0 ? `−${money(Math.abs(balance))}` : money(balance)}
          </p>
          {Number(bal?.unconfirmed ?? 0) > 0 && (
            <p className="text-[11px] text-amber-700">{bal?.unconfirmed} entry par staff ne &quot;mil gaye&quot; nahi dabaya</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-clinic-teal/5 p-3 text-xs sm:grid-cols-4">
        <Cell label="Pichla baqaya / advance" v={prevBal} />
        <Cell label={`${period} ki salary`} v={curSalary} />
        <Cell label="Is mahine diya / kata" v={curTaken} />
        <Cell label="Net abhi" v={balance} bold />
      </div>

      {s.is_active && (
        <form onSubmit={save} className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={input}>
            <option value="advance">Advance (peshgi)</option>
            <option value="payout">Salary di</option>
            <option value="bonus">Bonus</option>
            <option value="deduction">Katauti</option>
          </select>
          <input required type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="Raqam" value={amount} onChange={(e) => setAmount(e.target.value)} className={input} />
          {needsMethod ? (
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={input}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="jazzcash">JazzCash</option>
            </select>
          ) : (
            <span />
          )}
          <input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          <input placeholder={kind === 'deduction' ? 'Wajah (zaroori)' : 'Note'} value={note} onChange={(e) => setNote(e.target.value)} className={input} />
          <button disabled={busy} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? '...' : 'Likhein'}
          </button>
        </form>
      )}
      {lastMsg && (
        <div role="status" className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          <span>Entry likh di gayi. Staff ko message bhejein?</span>
          <a href={wa(lastMsg)} target="_blank" rel="noopener noreferrer" className="min-h-[36px] rounded-full bg-whatsapp px-4 py-2 font-semibold text-white">WhatsApp par bhejein</a>
          <a href={`/admin/payroll/slip?staff=${s.id}&m=${period}`} target="_blank" rel="noopener noreferrer" className="min-h-[36px] rounded-full border border-clinic-teal px-4 py-2 font-semibold text-clinic-teal">Slip / PDF</a>
          <button type="button" onClick={() => setLastMsg(null)} className="min-h-[36px] px-2 underline">Band</button>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-clinic-teal/10 pt-3 text-xs">
        {s.phone && (
          <a href={wa(summaryMsg)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-whatsapp px-3 py-1.5 font-semibold text-white">
            Hisaab WhatsApp
          </a>
        )}
        {s.is_active && (
          <>
            <button disabled={pending} onClick={issue} className="rounded-full border border-clinic-teal px-3 py-1.5 font-semibold text-clinic-teal disabled:opacity-50">
              {portalOn ? 'Naya link + PIN' : 'Link + PIN banayein'}
            </button>
            {portalOn && (
              <button disabled={pending} onClick={revoke} className="rounded-full border border-red-300 px-3 py-1.5 font-semibold text-red-600 disabled:opacity-50">
                Link band karein
              </button>
            )}
          </>
        )}
        {portalOn && (
          <span className="text-clinic-ink/50">
            {locked ? 'Abhi locked (ghalat PIN) · ' : ''}
            {acc?.last_login_at ? `Akhri dafa dekha: ${fmtDate(acc.last_login_at)}` : 'Abhi tak nahi dekha'}
          </span>
        )}
        {acc?.revoked_at && <span className="text-red-600">Link band hai</span>}
        <span className="ml-auto flex gap-3">
          <button onClick={changeSalary} className="text-clinic-ink/50 underline">Salary badlein</button>
          <button onClick={toggleActive} className="text-clinic-ink/50 underline">{s.is_active ? 'Staff band karein' : 'Dobara chalu'}</button>
        </span>
      </div>

      {issued && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-800">Ye sirf abhi dikh raha hai, dobara nahi dikhega:</p>
          <p className="mt-1 break-all text-xs text-clinic-ink">{url}</p>
          <p className="mt-1 font-display text-lg font-semibold tracking-widest text-clinic-ink">PIN: {issued.pin}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {s.phone && (
              <a
                href={wa(`Assalam o Alaikum ${s.full_name},\n${CLINIC.name} mein aap ka hisaab dekhne ka link:\n${url}\n\nPIN alag se bataya jayega. Link kisi ko na dikhayein.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white"
              >
                Link WhatsApp par
              </a>
            )}
            {s.phone && (
              <a
                href={wa(`Aap ka PIN: ${issued.pin}\nIs ko kisi se share na karein.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white"
              >
                PIN WhatsApp par
              </a>
            )}
            <button onClick={() => setIssued(null)} className="rounded-full border border-clinic-ink/20 px-3 py-1.5 text-xs">
              Chhupa dein
            </button>
          </div>
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-clinic-ink/60">Poora hisaab ({rows.length})</summary>
        <div className="mt-2 divide-y divide-clinic-teal/10 text-sm">
          {rows.map((r) => {
            const a = Number(r.amount)
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-clinic-ink/70">
                  {fmtDate(r.entry_date)} · {KIND[r.kind] ?? r.kind}
                  {r.period ? ` (${r.period})` : ''}
                  {r.note ? ` · ${r.note}` : ''}
                  {(r.kind === 'advance' || r.kind === 'payout') && (r.acknowledged_at ? ' · ✓ mil gaye' : ' · confirm nahi')}
                </span>
                <span className={a >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                  {a >= 0 ? '+' : '-'}
                  {money(Math.abs(a))}
                </span>
              </div>
            )
          })}
        </div>
      </details>
    </div>
  )
}

function Cell({ label, v, bold }: { label: string; v: number; bold?: boolean }) {
  return (
    <div>
      <p className="text-clinic-ink/50">{label}</p>
      <p className={`${bold ? 'text-sm font-semibold' : 'font-medium'} ${v < 0 ? 'text-red-600' : 'text-clinic-ink'}`}>
        {v < 0 ? `−${money(Math.abs(v))}` : money(v)}
      </p>
    </div>
  )
}

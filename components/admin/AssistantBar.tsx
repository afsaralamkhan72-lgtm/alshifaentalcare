'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface PatientHit {
  id: string
  full_name: string
  phone: string
  mr_number: string | null
  department: string
  date_of_birth: string | null
}

interface Answer {
  patient: PatientHit
  lines: { label: string; value: string }[]
  heading: string
}

/** Words that signal what the user wants to know. Roman Urdu + English. */
const INTENTS = [
  {
    key: 'visit',
    words: ['visit', 'aya', 'aaya', 'ayi', 'aayi', 'last visit', 'kab aya', 'checkup', 'follow'],
  },
  { key: 'balance', words: ['balance', 'baqaya', 'bakaya', 'due', 'paisa', 'paise', 'remaining', 'bacha'] },
  { key: 'payment', words: ['payment', 'paid', 'diya', 'jama', 'installment', 'qist', 'kist'] },
  { key: 'prescription', words: ['prescription', 'dawa', 'dawai', 'medicine', 'nuskha'] },
  { key: 'appointment', words: ['appointment', 'booking', 'schedule', 'time'] },
  { key: 'plan', words: ['plan', 'treatment', 'braces', 'ortho'] },
]

/** Filler words stripped out so what's left is (hopefully) the patient's name */
const STOPWORDS = new Set([
  'ka', 'ki', 'ke', 'ko', 'kab', 'kya', 'kitna', 'kitni', 'hai', 'tha', 'thi', 'thay',
  'open', 'kholo', 'kholein', 'dikhao', 'dikha', 'do', 'de', 'page', 'profile', 'record',
  'show', 'me', 'what', 'when', 'was', 'is', 'the', 'his', 'her', 'last', 'total',
  ...INTENTS.flatMap((i) => i.words.filter((w) => !w.includes(' '))),
])

function detectIntent(q: string) {
  const lower = ' ' + q.toLowerCase() + ' '
  for (const intent of INTENTS) {
    if (intent.words.some((w) => lower.includes(' ' + w + ' ') || lower.includes(w))) {
      return intent.key
    }
  }
  return 'summary'
}

function extractName(q: string) {
  const words = q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w) && w.length > 1)
  return words.join(' ').trim()
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB') : '—'
}

/** Minimal typing for the browser's built-in speech recognition */
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

export default function AssistantBar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [listening, setListening] = useState(false)
  const [lang, setLang] = useState<'ur-PK' | 'en-US'>('ur-PK')
  const [micError, setMicError] = useState('')
  const [micSupported, setMicSupported] = useState(true)
  const recogRef = useRef<SpeechRecognitionLike | null>(null)
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [choices, setChoices] = useState<PatientHit[]>([])
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Ctrl/Cmd + K opens it from anywhere in the admin panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Web Speech API ships with Chrome/Edge. No API key, no cost.
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    setMicSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  function toggleMic() {
    if (listening) {
      recogRef.current?.stop()
      return
    }

    const w = window as unknown as Record<string, unknown>
    const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as
      | (new () => SpeechRecognitionLike)
      | undefined

    if (!Ctor) {
      setMicError('Is browser mein voice support nahi hai. Chrome use karein.')
      return
    }

    setMicError('')
    const recog = new Ctor()
    recogRef.current = recog
    recog.lang = lang
    recog.continuous = false
    recog.interimResults = true

    recog.onresult = (e) => {
      // Collect whatever has been transcribed so far
      const results = e.results as unknown as ArrayLike<ArrayLike<{ transcript: string }>>
      let text = ''
      for (let i = 0; i < results.length; i++) {
        text += results[i][0].transcript
      }
      setQuery(text)
    }

    recog.onerror = (e) => {
      setListening(false)
      if (e.error === 'not-allowed') {
        setMicError('Microphone ki ijazat nahi mili. Browser settings mein allow karein.')
      } else if (e.error === 'no-speech') {
        setMicError('Kuch sunai nahi diya. Dobara koshish karein.')
      } else {
        setMicError('Voice nahi chal saka. Type kar ke poochein.')
      }
    }

    recog.onend = () => setListening(false)

    setListening(true)
    recog.start()
  }

  function reset() {
    setAnswer(null)
    setChoices([])
    setMessage('')
  }

  async function ask(e?: React.FormEvent) {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return

    setLoading(true)
    reset()

    const supabase = createClient()
    const intent = detectIntent(q)
    const name = extractName(q) || q

    const { data: hits } = await supabase
      .from('patients')
      .select('id, full_name, phone, mr_number, department, date_of_birth')
      .is('deleted_at', null)
      .ilike('full_name', `%${name}%`)
      .limit(6)

    const patients = (hits ?? []) as PatientHit[]

    if (patients.length === 0) {
      setLoading(false)
      setMessage(`"${name}" naam ka koi patient nahi mila.`)
      return
    }

    if (patients.length > 1) {
      setLoading(false)
      setChoices(patients)
      return
    }

    await answerFor(patients[0], intent)
    setLoading(false)
  }

  async function answerFor(patient: PatientHit, intent: string) {
    const supabase = createClient()
    const lines: { label: string; value: string }[] = []
    let heading = 'Summary'

    if (intent === 'visit' || intent === 'summary') {
      const { data } = await supabase
        .from('visit_notes')
        .select('visit_date, procedure, notes, next_visit')
        .eq('patient_id', patient.id)
        .order('visit_date', { ascending: false })
        .limit(3)

      heading = intent === 'visit' ? 'Visits' : heading
      if (!data || data.length === 0) {
        lines.push({ label: 'Last visit', value: 'Koi visit record nahi' })
      } else {
        lines.push({ label: 'Last visit', value: `${fmt(data[0].visit_date)} — ${data[0].procedure ?? 'Visit'}` })
        if (data[0].notes) lines.push({ label: 'Notes', value: data[0].notes })
        const next = data.find((v) => v.next_visit)?.next_visit
        lines.push({ label: 'Next visit', value: next ? fmt(next) : 'Set nahi hai' })
        if (data[1]) {
          lines.push({
            label: 'Us se pehle',
            value: `${fmt(data[1].visit_date)} — ${data[1].procedure ?? 'Visit'}`,
          })
        }
      }
    }

    if (intent === 'balance' || intent === 'payment' || intent === 'plan' || intent === 'summary') {
      const { data: plans } = await supabase
        .from('treatment_plans')
        .select('id, title, total_cost, advance_paid, duration_months')
        .eq('patient_id', patient.id)

      let paid = 0
      let total = 0
      if (plans && plans.length > 0) {
        total = plans.reduce((s, p) => s + Number(p.total_cost), 0)
        paid = plans.reduce((s, p) => s + Number(p.advance_paid), 0)

        const { data: inst } = await supabase
          .from('installments')
          .select('paid_amount, due_date, amount')
          .in('plan_id', plans.map((p) => p.id))

        paid += (inst ?? []).reduce((s, i) => s + Number(i.paid_amount), 0)

        const today = new Date().toISOString().slice(0, 10)
        const overdue = (inst ?? []).filter((i) => Number(i.paid_amount) === 0 && i.due_date < today)
        const nextDue = (inst ?? [])
          .filter((i) => Number(i.paid_amount) === 0)
          .sort((a, b) => a.due_date.localeCompare(b.due_date))[0]

        if (intent !== 'summary') heading = 'Payments'
        lines.push({ label: 'Plan', value: plans.map((p) => p.title).join(', ') })
        lines.push({ label: 'Total', value: `Rs. ${total.toLocaleString()}` })
        lines.push({ label: 'Paid', value: `Rs. ${paid.toLocaleString()}` })
        lines.push({ label: 'Balance', value: `Rs. ${Math.max(0, total - paid).toLocaleString()}` })
        if (nextDue) {
          lines.push({
            label: 'Next installment',
            value: `Rs. ${Number(nextDue.amount).toLocaleString()} — ${fmt(nextDue.due_date)}`,
          })
        }
        if (overdue.length > 0) {
          lines.push({ label: 'Overdue', value: `${overdue.length} installment(s)` })
        }
      } else if (intent !== 'summary') {
        lines.push({ label: 'Plan', value: 'Koi treatment plan nahi hai' })
      }
    }

    if (intent === 'prescription') {
      heading = 'Prescriptions'
      const { data } = await supabase
        .from('prescriptions')
        .select('items, prescribed_date')
        .eq('patient_id', patient.id)
        .order('prescribed_date', { ascending: false })
        .limit(3)

      if (!data || data.length === 0) {
        lines.push({ label: 'Prescriptions', value: 'Koi record nahi' })
      } else {
        for (const rx of data) {
          const items = (rx.items ?? []) as { name_en?: string; name_ur?: string }[]
          lines.push({
            label: fmt(rx.prescribed_date),
            value: items.map((i) => i.name_en || i.name_ur).filter(Boolean).join(' · ') || '—',
          })
        }
      }
    }

    if (intent === 'appointment') {
      heading = 'Appointments'
      const { data } = await supabase
        .from('appointments')
        .select('treatment_name, preferred_date, preferred_time, status')
        .eq('phone', patient.phone)
        .order('preferred_date', { ascending: false })
        .limit(3)

      if (!data || data.length === 0) {
        lines.push({ label: 'Appointments', value: 'Koi record nahi' })
      } else {
        for (const a of data) {
          lines.push({
            label: fmt(a.preferred_date),
            value: `${a.treatment_name ?? 'Consultation'} — ${a.status}`,
          })
        }
      }
    }

    setAnswer({ patient, lines, heading })
  }

  async function pick(p: PatientHit) {
    setChoices([])
    setLoading(true)
    await answerFor(p, detectIntent(query))
    setLoading(false)
  }

  function openProfile(id: string) {
    setOpen(false)
    setQuery('')
    reset()
    router.push(`/admin/patients/${id}`)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-clinic-teal/20 px-3 py-1.5 text-xs text-clinic-ink/50 transition-colors hover:border-clinic-teal hover:text-clinic-teal"
      >
        <span>Ask about a patient</span>
        <kbd className="hidden rounded bg-clinic-mint px-1.5 py-0.5 text-[10px] font-semibold text-clinic-teal sm:inline">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
          >
            <form onSubmit={ask} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={listening ? 'Sun raha hoon... boliye' : 'Zeeshan Ansari ki last visit kab thi?'}
                className="w-full rounded-xl border border-clinic-teal/20 px-4 py-3 text-sm outline-none focus:border-clinic-teal"
              />

              {micSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  title={listening ? 'Stop' : 'Bol kar poochein'}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                    listening
                      ? 'animate-pulse bg-red-600 text-white'
                      : 'bg-clinic-mint text-clinic-teal hover:bg-clinic-teal hover:text-white'
                  }`}
                >
                  {/* microphone icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <path d="M12 17v4" />
                  </svg>
                </button>
              )}
            </form>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-clinic-ink/40">
                Misalein: &quot;Ali ka balance kitna hai&quot; · &quot;Fatima ki dawai&quot;
              </p>

              {micSupported && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-clinic-ink/40">Voice:</span>
                  {(['ur-PK', 'en-US'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        lang === l ? 'bg-clinic-teal text-white' : 'bg-clinic-mint text-clinic-teal'
                      }`}
                    >
                      {l === 'ur-PK' ? 'اردو' : 'English'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {listening && (
              <p className="mt-2 text-xs font-medium text-red-600">
                Sun raha hoon... boliye, phir Enter dabayein.
              </p>
            )}

            {micError && <p className="mt-2 text-xs text-amber-700">{micError}</p>}

            {loading && <p className="mt-4 text-sm text-clinic-ink/50">Dhoond raha hoon...</p>}

            {message && !loading && (
              <p className="mt-4 rounded-xl bg-clinic-mint px-4 py-3 text-sm text-clinic-ink/60">
                {message}
              </p>
            )}

            {choices.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-clinic-ink/50">
                  Aik se zyada patient mile — kis ka matlab tha?
                </p>
                <div className="mt-2 grid gap-2">
                  {choices.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => pick(p)}
                      className="rounded-xl border border-clinic-teal/10 px-4 py-2 text-left text-sm hover:border-clinic-teal"
                    >
                      <span className="font-medium text-clinic-ink">{p.full_name}</span>
                      <span className="ml-2 text-xs text-clinic-ink/40">
                        {p.mr_number} · {p.phone}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {answer && (
              <div className="mt-4 rounded-xl border border-clinic-teal/10 bg-clinic-mint/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display font-semibold text-clinic-ink">
                      {answer.patient.full_name}
                    </p>
                    <p className="text-xs text-clinic-ink/50">
                      {answer.patient.mr_number} · {answer.patient.phone}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-clinic-teal">
                    {answer.heading}
                  </span>
                </div>

                <div className="mt-3 grid gap-2">
                  {answer.lines.map((l, i) => (
                    <div key={i} className="flex justify-between gap-4 text-sm">
                      <span className="shrink-0 text-clinic-ink/50">{l.label}</span>
                      <span className="text-right font-medium text-clinic-ink">{l.value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => openProfile(answer.patient.id)}
                  className="mt-4 w-full rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white"
                >
                  Poora Profile Kholein
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

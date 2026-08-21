import Link from 'next/link'
import { CLINIC, timingsLine } from '@/clinic.config'
import { createClient } from '@/lib/supabase/server'

const STEPS = [
  {
    n: '01',
    title: 'Send a Message',
    body: 'Message us on WhatsApp or call the clinic. Tell us the problem in your own words, no forms to fill.',
  },
  {
    n: '02',
    title: 'Get Your Time',
    body: 'We confirm a slot that suits you and send a reminder before the appointment so nothing is missed.',
  },
  {
    n: '03',
    title: 'Examination & Plan',
    body: 'A full examination, then a clear plan: what is needed, how many visits it will take, and what it will cost.',
  },
  {
    n: '04',
    title: 'Treatment & Follow-up',
    body: 'Treatment at your pace, with instalments where needed, and a follow-up reminder when the next visit is due.',
  },
]

const FAQS = [
  {
    q: 'Do I need an appointment, or can I walk in?',
    a: 'Walk-in patients are welcome, but an appointment means far less waiting. A quick WhatsApp message is enough to reserve your time.',
  },
  {
    q: 'What are the clinic timings?',
    a: '',
  },
  {
    q: 'Can long treatments be paid in instalments?',
    a: 'Yes. Treatments such as braces, crowns and dentures can be split into monthly instalments. Every payment is recorded and you can ask for a statement at any time.',
  },
  {
    q: 'Do you treat children?',
    a: 'Yes. Both dental care and homeopathic consultation are available for children, with gentle handling and age-appropriate treatment.',
  },
  {
    q: 'Can I get dental and homeopathic treatment together?',
    a: 'You can. Both are offered at the same clinic by the same doctor, so your records stay in one place and nothing is repeated unnecessarily.',
  },
  {
    q: 'Is emergency treatment available?',
    a: 'For severe pain or swelling, message us on WhatsApp straight away and we will try to fit you in the same day.',
  },
]

export default async function ProcessAndFaq() {
  let closedDay = ''
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'clinic_info')
      .maybeSingle()
    closedDay = ((data?.value ?? {}) as Record<string, string>).closed_day || ''
  } catch {
    // koi chutti set nahi
  }

  return (
    <>
      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
          How It Works
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink sm:text-3xl">
          From First Message to Full Recovery
        </h2>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-clinic-teal/10 bg-white p-6">
              <span className="font-display text-3xl font-semibold text-clinic-mint">{s.n}</span>
              <p className="mt-2 font-display font-semibold text-clinic-ink">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-clinic-ink/60">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timings & location band */}
      <section className="bg-clinic-mint/50 py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
          {[
            {
              label: 'Timings',
              value: CLINIC.timings.short,
              note: closedDay ? `${closedDay} closed` : 'Open daily',
            },
            {
              label: 'Location',
              value: CLINIC.address.area,
              note: CLINIC.address.city,
            },
            {
              label: 'Phone & WhatsApp',
              value: CLINIC.phone.display,
              note: 'Call or message anytime',
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-clinic-amber">
                {item.label}
              </p>
              <p className="mt-2 font-display text-xl font-semibold text-clinic-ink">
                {item.value}
              </p>
              <p className="mt-1 text-sm text-clinic-ink/50">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
          Common Questions
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink sm:text-3xl">
          Things Patients Usually Ask
        </h2>

        <div className="mt-8 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
          {FAQS.map((f) => {
            const answer =
              f.q === 'What are the clinic timings?'
                ? `${timingsLine(closedDay)} at ${CLINIC.address.full}.`
                : f.a
            return (
            <details key={f.q} className="group px-6 py-4">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium text-clinic-ink marker:content-['']">
                {f.q}
                <span className="shrink-0 text-clinic-teal transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-clinic-ink/60">{answer}</p>
            </details>
            )
          })}
        </div>

        <p className="mt-6 text-center text-sm text-clinic-ink/60">
          Still have a question?{' '}
          <Link href="/contact" className="font-semibold text-clinic-teal hover:underline">
            Get in touch
          </Link>
        </p>
      </section>
    </>
  )
}

const POINTS = [
  {
    title: 'Do Specialties, Aik Chhat',
    body: 'Dental aur Homeopathic — dono ka ilaj aik hi jagah, aik hi doctor ki nigrani mein.',
    icon: (
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: 'WhatsApp Par Appointment',
    body: 'Line mein lagne ki zaroorat nahi. Aik message bhejein, waqt confirm ho jayega.',
    icon: <path d="M21 12a9 9 0 1 1-4.2-7.6L21 3l-1.4 4.2A8.9 8.9 0 0 1 21 12Z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: 'Har Marz Ka Record',
    body: 'Aap ka dental chart, nuskhe aur poori history mehfooz — har visit par saamne.',
    icon: (
      <path
        d="M8 3h8a2 2 0 0 1 2 2v16l-6-3-6 3V5a2 2 0 0 1 2-2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: 'Aasan Qist Ka Nizam',
    body: 'Braces jaise lambe ilaj mahana qiston mein — har payment ka tehreeri record.',
    icon: (
      <path
        d="M3 10h18M3 6h18v12H3zM7 15h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
]

export default function WhyChooseUs() {
  return (
    <section className="bg-clinic-mint/50 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">
          Kyun Al Shifa
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-clinic-ink sm:text-3xl">
          Aap Ke Aaram Ka Khayal
        </h2>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p) => (
            <div key={p.title} className="rounded-2xl bg-white p-6">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="text-clinic-teal"
              >
                {p.icon}
              </svg>
              <p className="mt-4 font-display font-semibold text-clinic-ink">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-clinic-ink/60">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

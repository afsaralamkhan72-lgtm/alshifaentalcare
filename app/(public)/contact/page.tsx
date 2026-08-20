import PageHeader from '@/components/public/PageHeader'

const MAP_EMBED_SRC =
  'https://www.google.com/maps?q=Numaish+Nizami+Road+Karachi&output=embed'

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact Us"
        title="Get in Touch"
        description="Call karein, WhatsApp par message karein, ya seedha clinic visit karein."
      />

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-clinic-teal/10">
            <iframe
              src={MAP_EMBED_SRC}
              className="h-72 w-full sm:h-full sm:min-h-[320px]"
              loading="lazy"
              title="Al Shifa Health Care Location"
            />
          </div>

          <div className="rounded-2xl bg-clinic-mint p-6 sm:p-8">
            <p className="font-display text-lg font-semibold text-clinic-ink">
              Al Shifa Health Care
            </p>
            <p className="mt-1 text-sm text-clinic-ink/70">Dr. Muhammad Khalid Mahmood</p>
            <p className="mt-4 text-sm text-clinic-ink/70">Numaish, Nizami Road, Karachi</p>
            <p className="mt-1 text-sm text-clinic-ink/70">Timings: 10:00 AM – 5:00 PM (Daily)</p>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href="tel:03422078639"
                className="rounded-full border border-clinic-teal px-5 py-2.5 text-center text-sm font-semibold text-clinic-teal transition-colors hover:bg-clinic-teal hover:text-white"
              >
                Call: 0342-2078639
              </a>
              <a
                href="https://wa.me/923422078639"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-whatsapp px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#1EBE5A]"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

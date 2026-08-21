import PageHeader from '@/components/public/PageHeader'
import { CLINIC } from '@/clinic.config'

const MAP_EMBED_SRC =
  `https://www.google.com/maps?q=${encodeURIComponent(CLINIC.mapQuery)}&output=embed`

export const metadata = {
  title: 'Contact & Location',
  description: `Visit ${CLINIC.name} at ${CLINIC.address.full}. ${CLINIC.timings.full}. Call ${CLINIC.phone.display}.`,
}

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
              title={`${CLINIC.name} Location`}
            />
          </div>

          <div className="rounded-2xl bg-clinic-mint p-6 sm:p-8">
            <p className="font-display text-lg font-semibold text-clinic-ink">
              {CLINIC.name}
            </p>
            <p className="mt-1 text-sm text-clinic-ink/70">{CLINIC.doctor.name}</p>
            <p className="mt-4 text-sm text-clinic-ink/70">{CLINIC.address.full}</p>
            <p className="mt-1 text-sm text-clinic-ink/70">Timings: 10:00 AM – 5:00 PM (Daily)</p>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href={`tel:${CLINIC.phone.dial}`}
                className="rounded-full border border-clinic-teal px-5 py-2.5 text-center text-sm font-semibold text-clinic-teal transition-colors hover:bg-clinic-teal hover:text-white"
              >
                Call: {CLINIC.phone.display}
              </a>
              <a
                href={`https://wa.me/${CLINIC.phone.whatsapp}`}
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

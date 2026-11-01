import PageHeader from '@/components/public/PageHeader'
import BookingForm from '@/components/public/BookingForm'
import { CLINIC } from '@/clinic.config'

export const metadata = {
  title: 'Book an Appointment',
  description: `Book your appointment at ${CLINIC.name}, ${CLINIC.address.city}, online or on WhatsApp.`,
}

export default function BookingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Book Appointment"
        title="Online Appointment Booking"
        description="Form bharein, hamari team confirm karegi. Ya seedha WhatsApp par message karein."
      />

      <section className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <BookingForm />
      </section>
    </>
  )
}

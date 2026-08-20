import PageHeader from '@/components/public/PageHeader'
import BookingForm from '@/components/public/BookingForm'

export default function BookingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Book Appointment"
        title="Online Appointment Booking"
        description="Form bharein — hamari team confirm karegi. Ya seedha WhatsApp par message karein."
      />

      <section className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <BookingForm />
      </section>
    </>
  )
}

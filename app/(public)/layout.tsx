import Navbar from '@/components/public/Navbar'
import Footer from '@/components/public/Footer'
import EmergencyPopup from '@/components/public/EmergencyPopup'
import WhatsAppButton from '@/components/public/WhatsAppButton'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />

      {/* Site-wide floating action + the 10-second CMS-driven popup */}
      <WhatsAppButton variant="floating" />
      <EmergencyPopup />
    </>
  )
}

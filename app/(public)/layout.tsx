import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/public/Navbar'
import Footer from '@/components/public/Footer'
import EmergencyPopup from '@/components/public/EmergencyPopup'
import WhatsAppButton from '@/components/public/WhatsAppButton'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let logoUrl: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'clinic_info')
      .maybeSingle()
    logoUrl = ((data?.value ?? {}) as Record<string, string>).logo_url || null
  } catch {
    // logo stays null -> placeholder mark
  }

  return (
    <>
      <Navbar logoUrl={logoUrl} />
      <main>{children}</main>
      <Footer />

      {/* Site-wide floating action + the 10-second CMS-driven popup */}
      <WhatsAppButton variant="floating" />
      <EmergencyPopup />
    </>
  )
}

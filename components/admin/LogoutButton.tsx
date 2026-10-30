'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-clinic-teal/20 px-4 py-1.5 text-sm font-medium text-clinic-ink/70 transition-colors hover:bg-clinic-mint"
    >
      Logout
    </button>
  )
}

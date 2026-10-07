import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from '@/components/admin/LoginForm'
import { CLINIC } from '@/clinic.config'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Already logged in staff shouldn't see the login form again
  if (user) redirect('/admin/dashboard')

  return (
    <div className="flex min-h-screen items-center justify-center bg-clinic-teal px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <p className="font-display text-xl font-semibold text-clinic-ink">{CLINIC.name}</p>
        <p className="mt-1 text-sm text-clinic-ink/50">Staff Login, Admin / Doctor / Receptionist</p>
        <LoginForm />
      </div>
    </div>
  )
}

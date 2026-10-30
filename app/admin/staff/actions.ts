'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

/**
 * Doctor Supabase Authentication mein user bana chuka hai.
 * Yahan "Activate" dabane se wo user receptionist ban jata hai.
 * Is raaste se sirf receptionist banta hai, admin/doctor nahi.
 */
export async function activateReceptionist(formData: FormData) {
  await requireAdmin()

  const userId = String(formData.get('user_id') ?? '').trim()
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!userId || !fullName) return

  const supabase = await createClient()
  await supabase.from('staff_profiles').insert({
    id: userId,
    full_name: fullName,
    role: 'receptionist',
    phone: phone || null,
    is_active: true,
  })

  revalidatePath('/admin/staff')
}

/** Kisi staff ko band/dobara chalu karna. Delete nahi hota, record rehta hai. */
export async function setStaffActive(formData: FormData) {
  const me = await requireAdmin()

  const id = String(formData.get('id') ?? '')
  const active = String(formData.get('active') ?? '') === 'true'
  if (!id || id === me.id) return // apne aap ko band nahi kar sakte

  const supabase = await createClient()
  await supabase.from('staff_profiles').update({ is_active: active }).eq('id', id)

  revalidatePath('/admin/staff')
}

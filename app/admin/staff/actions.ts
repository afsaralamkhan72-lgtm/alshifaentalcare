'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'

function back(path: string, key: 'err' | 'ok', msg: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(msg)}`)
}

function permsFrom(formData: FormData): string[] {
  return formData.getAll('perm').map(String).filter(Boolean)
}

/**
 * Naya staff account: email + password yahin se banta hai (Supabase mein jaane ki zaroorat nahi).
 * Password sirf Supabase Auth ko jata hai (hash ho kar), hamari kisi table mein save nahi hota.
 */
export async function createStaff(formData: FormData) {
  await requireAdmin()

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const role = String(formData.get('role') ?? 'receptionist')
  const perms = permsFrom(formData)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back('/admin/staff', 'err', 'Email theek nahi')
  if (password.length < 8) back('/admin/staff', 'err', 'Password kam az kam 8 haroof ka ho')
  if (fullName.length < 2) back('/admin/staff', 'err', 'Naam likhein')
  if (role !== 'receptionist' && role !== 'doctor') back('/admin/staff', 'err', 'Role theek nahi')

  const admin = createAdminClient()
  if (!admin) back('/admin/staff', 'err', 'SUPABASE_SERVICE_ROLE_KEY Vercel mein set nahi hai')

  const { data: created, error: cErr } = await admin!.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (cErr || !created?.user) back('/admin/staff', 'err', 'Account nahi bana: ' + (cErr?.message ?? 'unknown'))

  const uid = created!.user.id
  const { error: pErr } = await admin!.from('staff_profiles').insert({
    id: uid,
    full_name: fullName,
    role,
    phone: phone || null,
    is_active: true,
  })
  if (pErr) {
    // Adhura account nahi chhodna: sirf abhi bana naya login wapas
    await admin!.auth.admin.deleteUser(uid)
    back('/admin/staff', 'err', 'Staff profile nahi bani: ' + pErr.message)
  }

  if (role === 'receptionist') {
    const supabase = await createClient()
    const { error: sErr } = await supabase.rpc('set_staff_permissions', { p_user: uid, p_codes: perms })
    if (sErr) back('/admin/staff', 'err', 'Account ban gaya, magar permissions nahi lagi: ' + sErr.message)
  }

  revalidatePath('/admin/staff')
  back('/admin/staff', 'ok', `${fullName} ka account ban gaya`)
}

export async function savePermissions(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const path = `/admin/staff/${id}`
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_staff_permissions', { p_user: id, p_codes: permsFrom(formData) })
  if (error) back(path, 'err', error.message)
  revalidatePath('/admin/staff')
  back(path, 'ok', 'Permissions save ho gayin (foran lagu)')
}

/** Band/chalu: database mein is_active (foran access khatam) + login bhi band (ban) */
export async function setStaffActive(formData: FormData) {
  const me = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const active = String(formData.get('active') ?? '') === 'true'
  const path = String(formData.get('back') ?? '/admin/staff')
  if (!id || id === me.id) back(path, 'err', 'Apne aap ko band nahi kar sakte')

  const supabase = await createClient()
  const { error } = await supabase.from('staff_profiles').update({ is_active: active }).eq('id', id)
  if (error) back(path, 'err', error.message)

  const admin = createAdminClient()
  if (admin) {
    await admin.auth.admin.updateUserById(id, { ban_duration: active ? 'none' : '876000h' })
  }
  revalidatePath('/admin/staff')
  back(path, 'ok', active ? 'Dobara chalu ho gaya' : 'Band ho gaya, foran login/access khatam')
}

export async function resetStaffPassword(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const password = String(formData.get('password') ?? '')
  const path = `/admin/staff/${id}`
  if (password.length < 8) back(path, 'err', 'Password kam az kam 8 haroof ka ho')
  const admin = createAdminClient()
  if (!admin) back(path, 'err', 'SUPABASE_SERVICE_ROLE_KEY set nahi hai')
  const { error } = await admin!.auth.admin.updateUserById(id, { password })
  if (error) back(path, 'err', error.message)
  back(path, 'ok', 'Naya password lag gaya')
}

/** Purana tareeqa: jo user Supabase mein pehle se bana hai use Receptionist banana */
export async function activateReceptionist(formData: FormData) {
  await requireAdmin()
  const userId = String(formData.get('user_id') ?? '').trim()
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  if (!userId || !fullName) return

  const supabase = await createClient()
  const { error } = await supabase.from('staff_profiles').insert({
    id: userId, full_name: fullName, role: 'receptionist', phone: phone || null, is_active: true,
  })
  if (error) back('/admin/staff', 'err', error.message)
  await supabase.rpc('set_staff_permissions', {
    p_user: userId,
    p_codes: ['patients.view','patients.create','patients.edit','appointments.view','appointments.manage','lab.view','lab.manage','inventory.view'],
  })
  revalidatePath('/admin/staff')
  back('/admin/staff', 'ok', 'Activate ho gaya')
}

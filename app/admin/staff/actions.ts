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
  const title = String(formData.get('title') ?? '').trim()
  const salary = Math.max(0, Number(formData.get('monthly_salary') ?? 0) || 0)
  const joined = String(formData.get('joined_on') ?? '').trim()
  const withLogin = String(formData.get('with_login') ?? 'yes') === 'yes'
  const role = String(formData.get('role') ?? 'receptionist')
  const perms = permsFrom(formData)

  if (fullName.length < 2) back('/admin/staff', 'err', 'Naam likhein')
  const supabase = await createClient()

  // Staff ka hazri/salary wala record: pehle se hai to wohi (dobara nahi banega), warna naya
  async function ensureMember(profileId: string | null) {
    const { data: found } = await supabase
      .from('staff_members')
      .select('id, profile_id')
      .ilike('full_name', fullName)
      .eq('is_active', true)
      .limit(2)
    const same = (found ?? []).filter((m) => !m.profile_id || m.profile_id === profileId)
    if (same.length === 1) {
      if (profileId && !same[0].profile_id) await supabase.from('staff_members').update({ profile_id: profileId }).eq('id', same[0].id)
      return null
    }
    const { error } = await supabase.from('staff_members').insert({
      full_name: fullName,
      title: title || null,
      phone: phone || null,
      profile_id: profileId,
      monthly_salary: salary,
      joined_on: joined || undefined,
    })
    return error ? error.message : null
  }

  // Doctor ho to "Treating doctor" ki list mein bhi wohi naam (dohra nahi likhna parta)
  async function syncDoctor(isDoc: boolean) {
    if (!isDoc) return
    const { data: ex } = await supabase.from('treating_doctors').select('id').ilike('name', fullName).limit(1)
    if (!ex || ex.length === 0) await supabase.from('treating_doctors').insert({ name: fullName })
  }

  if (!withLogin) {
    const err = await ensureMember(null)
    await syncDoctor(/\bdr\b|doctor/i.test(`${fullName} ${title}`))
    if (err) back('/admin/staff', 'err', 'Staff save nahi hua: ' + err)
    revalidatePath('/admin/staff')
    revalidatePath('/admin/payroll')
    back('/admin/staff', 'ok', `${fullName} add ho gaya (login ke baghair, sirf hazri aur salary)`)
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back('/admin/staff', 'err', 'Email theek nahi')
  if (password.length < 8) back('/admin/staff', 'err', 'Password kam az kam 8 haroof ka ho')
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
    const { error: sErr } = await supabase.rpc('set_staff_permissions', { p_user: uid, p_codes: perms })
    if (sErr) back('/admin/staff', 'err', 'Account ban gaya, magar permissions nahi lagi: ' + sErr.message)
  }

  const mErr = await ensureMember(uid)
  await syncDoctor(role === 'doctor')
  revalidatePath('/admin/staff')
  revalidatePath('/admin/payroll')
  if (mErr) back('/admin/staff', 'err', `${fullName} ka login ban gaya, magar hazri/salary ka record nahi bana: ${mErr}`)
  back('/admin/staff', 'ok', `${fullName} ka account aur hazri/salary ka record ban gaya`)
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
  const { error: permErr } = await supabase.rpc('set_staff_permissions', {
    p_user: userId,
    p_codes: ['patients.view','patients.create','patients.edit','appointments.view','appointments.manage','lab.view','lab.manage','inventory.view'],
  })
  if (permErr) back('/admin/staff', 'err', 'Account ban gaya magar permissions nahi lagin: ' + permErr.message)
  revalidatePath('/admin/staff')
  back('/admin/staff', 'ok', 'Activate ho gaya')
}

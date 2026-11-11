import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import PermissionPicker, { type PermGroup } from '@/components/admin/PermissionPicker'
import { activateReceptionist, createStaff, setStaffActive } from './actions'
import Link from 'next/link'
import StaffTabs from '@/components/admin/StaffTabs'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Doctor / Admin',
  doctor: 'Doctor',
  receptionist: 'Reception',
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>
}) {
  const sp = await searchParams
  const me = await requireAdmin()
  const supabase = await createClient()

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, full_name, role, phone, is_active, created_at')
    .order('created_at', { ascending: true })

  const known = new Set((staff ?? []).map((s) => s.id))

  // Supabase Auth mein jo users hain par abhi staff nahi bane
  let pending: { id: string; email: string }[] = []
  let authError = ''
  const admin = createAdminClient()
  if (!admin) {
    authError = 'SUPABASE_SERVICE_ROLE_KEY set nahi hai, isliye naye users ki list nahi dikh sakti.'
  } else {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) authError = 'Auth users ki list nahi mil saki.'
    else
      pending = data.users
        .filter((u) => !known.has(u.id))
        .map((u) => ({ id: u.id, email: u.email ?? '(email nahi)' }))
  }

  const [{ data: catalog }] = await Promise.all([
    supabase.from('permission_catalog').select('code, label, grp, sort_order').order('sort_order'),
  ])
  const groups: PermGroup[] = []
  for (const c of catalog ?? []) {
    let g = groups.find((x) => x.grp === c.grp)
    if (!g) groups.push((g = { grp: c.grp, items: [] }))
    g.items.push({ code: c.code, label: c.label })
  }
  const receptionDefault = [
    'patients.view', 'patients.create', 'patients.edit', 'appointments.view', 'appointments.manage',
    'lab.view', 'lab.manage', 'inventory.view',
  ]

  const inputClass =
    'rounded-lg border border-clinic-teal/30 px-3 py-1.5 text-sm outline-none focus:border-clinic-teal'

  return (
    <div>
      <StaffTabs isAdmin />
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Staff: log aur permissions</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Naya staff yahin se banayein, aur tick se tay karein ke wo kya dekh/kar sakta hai. Supabase mein jaane ki zaroorat nahi.
      </p>
      {sp.ok && <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{sp.ok}</p>}
      {sp.err && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{sp.err}</p>}

      <section className="mt-6 rounded-2xl border border-clinic-teal/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Naya staff (aik hi form)</h2>
        <p className="mt-1 text-xs text-clinic-ink/55">Is se hazri, salary aur (chaho to) login, teeno aik saath ban jate hain.</p>
        <form action={createStaff} className="mt-3 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <input name="full_name" required placeholder="Naam" aria-label="Naam" className={inputClass} />
            <input name="title" placeholder="Ohda (jaise Dental Doctor, Clinic Staff)" aria-label="Ohda" className={inputClass} />
            <input name="phone" placeholder="Phone (WhatsApp ke liye)" aria-label="Phone" className={inputClass} />
            <input name="monthly_salary" type="number" min={0} placeholder="Mahana tankhwah Rs." aria-label="Mahana tankhwah" className={inputClass} />
            <label className="grid gap-0.5 text-xs text-clinic-ink/60">Kaam shuru
              <input name="joined_on" type="date" className={inputClass} />
            </label>
            <label className="grid gap-0.5 text-xs text-clinic-ink/60">Login chahiye?
              <select name="with_login" defaultValue="yes" className={inputClass}>
                <option value="yes">Haan, panel mein login</option>
                <option value="no">Nahi, sirf hazri aur salary</option>
              </select>
            </label>
            <input name="email" type="email" placeholder="Email (sirf login ho to)" aria-label="Email" className={inputClass} autoComplete="off" />
            <input name="password" type="password" minLength={8} placeholder="Password 8+ (sirf login ho to)" aria-label="Password" className={inputClass} autoComplete="new-password" />
            <select name="role" aria-label="Role" className={inputClass + ' max-w-full'} defaultValue="receptionist">
              <option value="receptionist">Reception / Assistant (permissions tick se)</option>
              <option value="doctor">Doctor (clinical + paisa, sab)</option>
            </select>
          </div>
          <PermissionPicker groups={groups} defaultChecked={receptionDefault} />
          <div>
            <button className="rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white">Staff banayein</button>
            <span className="ml-3 text-xs text-clinic-ink/50">Doctor ke liye ticks ki zaroorat nahi. Password staff ko khud batayein.</span>
          </div>
        </form>
      </section>

      {(pending.length > 0 || authError) && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Supabase mein bane, abhi activate nahi</h2>
          {authError && <p className="mt-2 text-sm text-amber-700">{authError}</p>}
          <div className="mt-3 grid gap-3">
            {pending.map((u) => (
              <form
                key={u.id}
                action={activateReceptionist}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-clinic-teal/10 bg-white p-4"
              >
                <input type="hidden" name="user_id" value={u.id} />
                <span className="mr-2 text-sm font-medium text-clinic-ink">{u.email}</span>
                <input name="full_name" required placeholder="Naam" aria-label="Naam" className={inputClass} />
                <input name="phone" placeholder="Phone (optional)" aria-label="Phone (optional)" className={inputClass} />
                <button className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white">
                  Activate (Receptionist)
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Maujooda Staff</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-clinic-teal/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-clinic-mint text-left text-clinic-ink/60">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(staff ?? []).map((s) => (
                <tr key={s.id} className="border-t border-clinic-teal/10">
                  <td className="px-4 py-3 font-medium text-clinic-ink">{s.full_name}</td>
                  <td className="px-4 py-3">{ROLE_LABEL[s.role] ?? s.role}</td>
                  <td className="px-4 py-3">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {s.is_active ? 'Active' : 'Band'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/staff/${s.id}`} className="mr-4 text-xs font-semibold text-clinic-teal hover:underline">
                      Permissions
                    </Link>
                    {s.id !== me.id && (
                      <form action={setStaffActive} className="inline">
                        <input type="hidden" name="back" value="/admin/staff" />
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="active" value={s.is_active ? 'false' : 'true'} />
                        <button className="text-xs font-semibold text-clinic-teal hover:underline">
                          {s.is_active ? 'Band karein' : 'Dobara chalu karein'}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-clinic-ink/50">
          Staff delete nahi hota, sirf band hota hai, taake purana record aur audit log mehfooz
          rahe.
        </p>
      </section>
    </div>
  )
}

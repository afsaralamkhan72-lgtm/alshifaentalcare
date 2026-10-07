import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import { activateReceptionist, setStaffActive } from './actions'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Doctor / Admin',
  doctor: 'Doctor',
  receptionist: 'Reception',
}

export default async function StaffPage() {
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

  const inputClass =
    'rounded-lg border border-clinic-teal/30 px-3 py-1.5 text-sm outline-none focus:border-clinic-teal'

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Staff</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">
        Receptionist banane ka tareeqa: pehle Supabase → Authentication → Users mein email aur
        password se user banayein, phir yahan us ke samne Activate dabayein.
      </p>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">
          Activate hone ka intezar
        </h2>
        {authError && <p className="mt-2 text-sm text-amber-700">{authError}</p>}
        {pending.length === 0 && !authError ? (
          <p className="mt-2 text-sm text-clinic-ink/50">Koi naya user nahi.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {pending.map((u) => (
              <form
                key={u.id}
                action={activateReceptionist}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-clinic-teal/10 bg-white p-4"
              >
                <input type="hidden" name="user_id" value={u.id} />
                <span className="mr-2 text-sm font-medium text-clinic-ink">{u.email}</span>
                <input name="full_name" required placeholder="Naam" className={inputClass} />
                <input name="phone" placeholder="Phone (optional)" className={inputClass} />
                <button className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white">
                  Activate (Receptionist)
                </button>
              </form>
            ))}
          </div>
        )}
      </section>

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
                    {s.id !== me.id && (
                      <form action={setStaffActive}>
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

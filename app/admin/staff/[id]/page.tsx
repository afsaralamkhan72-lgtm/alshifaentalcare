import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import PermissionPicker, { type PermGroup } from '@/components/admin/PermissionPicker'
import { resetStaffPassword, savePermissions, setStaffActive } from '../actions'

export default async function StaffEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ err?: string; ok?: string }>
}) {
  const me = await requireAdmin()
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: s } = await supabase
    .from('staff_profiles')
    .select('id, full_name, role, phone, is_active')
    .eq('id', id)
    .maybeSingle()
  if (!s) notFound()

  const [{ data: catalog }, { data: given }, { data: log }] = await Promise.all([
    supabase.from('permission_catalog').select('code, label, grp, sort_order').order('sort_order'),
    supabase.from('staff_permissions').select('perm_code').eq('user_id', id),
    supabase
      .from('audit_log')
      .select('created_at, action, actor_name, new_data, old_data')
      .eq('table_name', 'staff_permissions')
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const groups: PermGroup[] = []
  for (const c of catalog ?? []) {
    let g = groups.find((x) => x.grp === c.grp)
    if (!g) groups.push((g = { grp: c.grp, items: [] }))
    g.items.push({ code: c.code, label: c.label })
  }
  const checked = (given ?? []).map((r) => r.perm_code as string)
  const full = s.role !== 'receptionist'
  const history = (log ?? []).filter(
    (l) => ((l.new_data ?? l.old_data) as { user_id?: string } | null)?.user_id === id
  )

  const inputClass =
    'rounded-lg border border-clinic-teal/30 px-3 py-1.5 text-sm outline-none focus:border-clinic-teal'

  return (
    <div className="max-w-4xl">
      <Link href="/admin/staff" className="text-sm text-clinic-teal hover:underline">← Staff</Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-clinic-ink">{s.full_name}</h1>
      <p className="text-sm text-clinic-ink/60">
        {s.role === 'admin' ? 'Admin' : s.role === 'doctor' ? 'Doctor' : 'Reception'} · {s.phone ?? 'phone nahi'} ·{' '}
        {s.is_active ? 'Active' : 'Band'}
      </p>

      {sp.ok && <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{sp.ok}</p>}
      {sp.err && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{sp.err}</p>}

      <section className="mt-6 rounded-2xl border border-clinic-teal/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Kya kar sakta hai (Permissions)</h2>
        {full ? (
          <p className="mt-2 text-sm text-clinic-ink/60">
            Admin aur Doctor ko clinical kaam ki sab permissions hamesha hoti hain; unhein tick karne ki zaroorat nahi.
          </p>
        ) : (
          <form action={savePermissions} className="mt-3">
            <input type="hidden" name="id" value={s.id} />
            <PermissionPicker groups={groups} defaultChecked={checked} />
            <button className="mt-4 rounded-full bg-clinic-teal px-5 py-2 text-sm font-semibold text-white">
              Permissions save karein
            </button>
            <p className="mt-2 text-xs text-clinic-ink/50">
              Save karte hi database mein lagu ho jati hain. Har tabdeeli Audit Log mein likhi jati hai.
            </p>
          </form>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-clinic-teal/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-clinic-ink">Naya password</h2>
        <form action={resetStaffPassword} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={s.id} />
          <input name="password" type="text" minLength={8} required placeholder="Naya password (8+)" className={inputClass} autoComplete="off" />
          <button className="rounded-full bg-clinic-teal px-4 py-1.5 text-xs font-semibold text-white">Password badlein</button>
        </form>
      </section>

      {s.id !== me.id && (
        <section className="mt-6 rounded-2xl border border-clinic-teal/10 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Account band / chalu</h2>
          <form action={setStaffActive} className="mt-3">
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="back" value={`/admin/staff/${s.id}`} />
            <input type="hidden" name="active" value={s.is_active ? 'false' : 'true'} />
            <button className={`rounded-full px-4 py-1.5 text-xs font-semibold text-white ${s.is_active ? 'bg-red-600' : 'bg-emerald-600'}`}>
              {s.is_active ? 'Band karein (foran access khatam)' : 'Dobara chalu karein'}
            </button>
          </form>
          <p className="mt-2 text-xs text-clinic-ink/50">Staff delete nahi hota, record aur audit log mehfooz rehta hai.</p>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-sm font-semibold text-clinic-ink/70">Permissions ki tabdeeliyan</h2>
          <ul className="mt-2 grid gap-1 text-xs text-clinic-ink/60">
            {history.map((l, i) => {
              const d = (l.new_data ?? l.old_data) as { perm_code?: string }
              return (
                <li key={i}>
                  {new Date(l.created_at).toLocaleString('en-GB')} — {l.actor_name ?? 'system'}:{' '}
                  {l.action === 'DELETE' ? 'hataya' : 'diya'} · {d?.perm_code}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

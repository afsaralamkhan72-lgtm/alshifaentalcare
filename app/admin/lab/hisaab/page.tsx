import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import LabLedger, { type LabGroup } from '@/components/admin/LabLedger'

export default async function LabLedgerPage() {
  await requireOwner()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lab_cases')
    .select('id, case_number, lab_name, work_type, status, cost, lab_paid, created_at, patients(full_name)')
    .is('deleted_at', null)
    .gt('cost', 0)
    .order('created_at', { ascending: true })
    .limit(3000)

  type Row = { id: string; case_number: string | null; lab_name: string; work_type: string | null; status: string; cost: number; lab_paid: number; created_at: string; patients: { full_name: string } | { full_name: string }[] | null }
  const groups = new Map<string, LabGroup>()
  for (const c of (data ?? []) as unknown as Row[]) {
    const key = c.lab_name.trim().toLowerCase()
    const g = groups.get(key) ?? { name: c.lab_name.trim(), cases: 0, cost: 0, paid: 0, open: [] }
    const cost = Number(c.cost), paid = Number(c.lab_paid)
    g.cases += 1
    g.cost += cost
    g.paid += paid
    if (cost > paid) {
      const p = Array.isArray(c.patients) ? c.patients[0] : c.patients
      g.open.push({ id: c.id, case_number: c.case_number, work_type: c.work_type, patient: p?.full_name ?? null, date: c.created_at.slice(0, 10), owed: Math.round((cost - paid) * 100) / 100 })
    }
    groups.set(key, g)
  }
  const list = Array.from(groups.values()).sort((a, b) => b.cost - b.paid - (a.cost - a.paid) || a.name.localeCompare(b.name))

  return (
    <div>
      <Link href="/admin/lab" className="mb-2 inline-block text-sm text-clinic-ink/50 hover:text-clinic-teal">← Lab Work</Link>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Lab ka hisaab</h1>
      <p className="mt-1 text-sm text-clinic-ink/60">Har lab ko kitna dena hai. Payment purane case se shuru hoti hai aur kharcha khud likha jata hai.</p>
      {error ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Hisaab abhi nahi khul saka: {error.message}</p> : <LabLedger groups={list} />}
    </div>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getStaffProfile, isOwnerRole } from '@/lib/auth'
import { fmtDate, money } from '@/lib/karachi'

// PostgREST ke .or() filter ko tornay wale characters nikal dein
const clean = (s: string) => s.replace(/[%,()*\\"']/g, ' ').trim().slice(0, 60)

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const profile = await getStaffProfile()
  const owner = isOwnerRole(profile.role)
  const { q: raw } = await searchParams
  const q = clean(raw ?? '')
  const supabase = await createClient()

  const [pts, appts, invs, labs] =
    q.length < 2
      ? [null, null, null, null]
      : await Promise.all([
          supabase
            .from('patients')
            .select('id, full_name, mr_number, phone, department')
            .is('deleted_at', null)
            .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,mr_number.ilike.%${q}%`)
            .order('full_name')
            .limit(25),
          supabase
            .from('appointments')
            .select('id, patient_name, phone, preferred_date, status')
            .is('deleted_at', null)
            .or(`patient_name.ilike.%${q}%,phone.ilike.%${q}%`)
            .order('preferred_date', { ascending: false })
            .limit(10),
          owner
            ? supabase
                .from('invoices')
                .select('id, invoice_number, invoice_date, total, status, patients(full_name)')
                .ilike('invoice_number', `%${q}%`)
                .order('invoice_date', { ascending: false })
                .limit(10)
            : Promise.resolve({ data: [] }),
          owner
            ? supabase
                .from('lab_cases')
                .select('id, case_number, lab_name, work_type, status')
                .is('deleted_at', null)
                .or(`case_number.ilike.%${q}%,lab_name.ilike.%${q}%`)
                .limit(10)
            : Promise.resolve({ data: [] }),
        ])

  const Section = ({ title, children, n }: { title: string; children: React.ReactNode; n: number }) =>
    n === 0 ? null : (
      <section className="mt-6">
        <h2 className="font-display font-semibold text-clinic-ink">{title} ({n})</h2>
        <div className="mt-2 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">{children}</div>
      </section>
    )

  const total = (pts?.data?.length ?? 0) + (appts?.data?.length ?? 0) + (invs?.data?.length ?? 0) + (labs?.data?.length ?? 0)

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-clinic-ink">Talash</h1>
      <form className="mt-3 flex gap-2">
        <input
          name="q"
          defaultValue={raw ?? ''}
          autoFocus
          placeholder="Mareez ka naam, phone, MR number, invoice ya lab case"
          className="w-full max-w-lg rounded-lg border border-clinic-teal/30 px-3 py-2 text-sm outline-none focus:border-clinic-teal"
        />
        <button className="rounded-lg bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">Dhoondein</button>
      </form>

      {q.length > 0 && q.length < 2 && <p className="mt-4 text-sm text-clinic-ink/50">Kam az kam 2 harf likhein.</p>}
      {pts && total === 0 && <p className="mt-6 text-sm text-clinic-ink/50">&quot;{q}&quot; ka koi nateeja nahi mila.</p>}

      <Section title="Mareez" n={pts?.data?.length ?? 0}>
        {(pts?.data ?? []).map((p) => (
          <Link key={p.id} href={`/admin/patients/${p.id}`} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm hover:bg-clinic-mint/40">
            <span className="font-medium text-clinic-ink">{p.full_name}</span>
            <span className="text-clinic-ink/50">{p.mr_number} · {p.phone} · {p.department}</span>
          </Link>
        ))}
      </Section>

      <Section title="Invoices" n={invs?.data?.length ?? 0}>
        {((invs?.data ?? []) as unknown as { id: string; invoice_number: string; invoice_date: string; total: number; status: string; patients: { full_name: string } | null }[]).map((i) => (
          <Link key={i.id} href={`/admin/invoices/${i.id}`} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm hover:bg-clinic-mint/40">
            <span className="font-medium text-clinic-ink">{i.invoice_number} · {i.patients?.full_name}</span>
            <span className="text-clinic-ink/50">{fmtDate(i.invoice_date)} · {money(i.total)}{i.status === 'void' ? ' · cancel' : ''}</span>
          </Link>
        ))}
      </Section>

      <Section title="Lab cases" n={labs?.data?.length ?? 0}>
        {(labs?.data ?? []).map((l) => (
          <Link key={l.id} href={`/admin/lab/${l.id}`} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm hover:bg-clinic-mint/40">
            <span className="font-medium text-clinic-ink">{l.case_number} · {l.lab_name}</span>
            <span className="text-clinic-ink/50">{l.work_type} · {l.status}</span>
          </Link>
        ))}
      </Section>

      <Section title="Appointments" n={appts?.data?.length ?? 0}>
        {(appts?.data ?? []).map((a) => (
          <Link key={a.id} href="/admin/appointments" className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm hover:bg-clinic-mint/40">
            <span className="font-medium text-clinic-ink">{a.patient_name}</span>
            <span className="text-clinic-ink/50">{a.phone} · {fmtDate(a.preferred_date)} · {a.status}</span>
          </Link>
        ))}
      </Section>
    </div>
  )
}

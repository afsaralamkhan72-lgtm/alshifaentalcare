import Link from 'next/link'

/** Yaad-dahani aur Recall: aik hi kaam ke do hisse, upar se aik doosre par jaane ke liye */
export default function FollowTabs({ active }: { active: 'recall' | 'reminders' }) {
  const t = (k: 'recall' | 'reminders', l: string, d: string) => (
    <Link
      href={`/admin/${k}`}
      className={`flex-1 rounded-2xl border px-4 py-2.5 text-center ${active === k ? 'border-clinic-teal bg-clinic-teal text-white' : 'border-clinic-teal/20 bg-white text-clinic-teal'}`}
    >
      <span className="block text-sm font-semibold">{l}</span>
      <span className={`block text-[11px] ${active === k ? 'text-white/80' : 'text-clinic-ink/55'}`}>{d}</span>
    </Link>
  )
  return (
    <div className="mb-4 flex gap-2 print:hidden">
      {t('recall', 'Recall', 'Dobara bulana: check-up, scaling')}
      {t('reminders', 'Yaad-dahani', 'Dawa khatam, agle din ka hal')}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  accent?: 'teal' | 'amber' | 'green' | 'red'
}

const ACCENT_MAP: Record<string, string> = {
  teal: 'text-clinic-teal',
  amber: 'text-clinic-amber',
  green: 'text-emerald-600',
  red: 'text-red-600',
}

export default function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-clinic-teal/10 bg-white p-5">
      <p className={`font-display text-2xl font-semibold ${accent ? ACCENT_MAP[accent] : 'text-clinic-ink'}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-clinic-ink/50">{label}</p>
    </div>
  )
}

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

const BAR: Record<string, string> = {
  teal: 'bg-clinic-teal',
  amber: 'bg-clinic-amber',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  none: 'bg-clinic-teal/20',
}

export default function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-clinic-teal/10 bg-white p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${BAR[accent ?? 'none']}`} />
      <p className={`font-display text-2xl font-semibold ${accent ? ACCENT_MAP[accent] : 'text-clinic-ink'}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-clinic-ink/50">{label}</p>
    </div>
  )
}

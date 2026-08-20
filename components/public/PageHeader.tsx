interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
}

export default function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section className="border-b border-clinic-teal/10 bg-clinic-mint">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-clinic-amber">{eyebrow}</p>
        )}
        <h1 className="mt-1 font-display text-3xl font-semibold text-clinic-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-clinic-ink/70">{description}</p>}
      </div>
    </section>
  )
}

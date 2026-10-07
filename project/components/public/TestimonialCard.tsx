interface TestimonialCardProps {
  patientName: string
  reviewText: string
  rating?: number | null
}

export default function TestimonialCard({ patientName, reviewText, rating }: TestimonialCardProps) {
  return (
    <div className="rounded-2xl border border-clinic-teal/10 bg-white p-6 shadow-sm">
      {rating != null && (
        <div className="mb-2 flex gap-0.5 text-clinic-amber" aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i}>{i < rating ? '★' : '☆'}</span>
          ))}
        </div>
      )}
      <p className="text-sm text-clinic-ink/70">&ldquo;{reviewText}&rdquo;</p>
      <p className="mt-4 text-sm font-semibold text-clinic-ink">{patientName}</p>
    </div>
  )
}

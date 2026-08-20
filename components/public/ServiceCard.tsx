import Image from 'next/image'
import WhatsAppButton from './WhatsAppButton'

interface ServiceCardProps {
  title: string
  shortDescription?: string | null
  imageUrl?: string | null
  department: 'dental' | 'homeopathic'
}

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M12 3c-2.2 0-3 1-4.5 1S5 3 3.8 4.2C2.6 5.4 3 8 3.5 10c.5 2 1 4 1.5 6 .3 1.5 1 2 1.8 2s1.2-1 1.4-2.3c.2-1.4.5-3.7 1.8-3.7s1.6 2.3 1.8 3.7c.2 1.3.6 2.3 1.4 2.3s1.5-.5 1.8-2c.5-2 1-4 1.5-6 .5-2 .9-4.6-.3-5.8C15 3 14.2 3 12 3z" />
    </svg>
  )
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M5 20c8 0 14-6 14-15C10 5 4 11 4 19c0 .5 0 .8.1 1z" />
      <path d="M5 20c3-4 6-7 12-13" />
    </svg>
  )
}

export default function ServiceCard({ title, shortDescription, imageUrl, department }: ServiceCardProps) {
  const isDental = department === 'dental'

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-clinic-teal/10 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative h-40 w-full">
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${isDental ? 'bg-clinic-teal/10' : 'bg-clinic-amber/10'}`}
          >
            {isDental ? (
              <ToothIcon className="h-10 w-10 text-clinic-teal/50" />
            ) : (
              <LeafIcon className="h-10 w-10 text-clinic-amber/60" />
            )}
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${isDental ? 'bg-clinic-teal' : 'bg-clinic-amber'}`}
        >
          {isDental ? 'Dental' : 'Homeopathic'}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-base font-semibold text-clinic-ink">{title}</p>
        {shortDescription && (
          <p className="mt-1 flex-1 text-sm text-clinic-ink/60">{shortDescription}</p>
        )}
        <div className="mt-4">
          <WhatsAppButton treatmentName={title} label="Book This" />
        </div>
      </div>
    </div>
  )
}

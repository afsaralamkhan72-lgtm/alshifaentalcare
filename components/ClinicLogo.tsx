import Image from 'next/image'
import { CLINIC } from '@/clinic.config'

interface Props {
  logoUrl?: string | null
  name?: string
  /** Rendered size in px */
  size?: number
  /** Show the clinic name beside the mark */
  withName?: boolean
  className?: string
}

/**
 * Clinic logo with a built-in placeholder.
 *
 * Until a logo is uploaded from Edit Website, this renders a simple
 * tooth-and-leaf mark in the clinic colours, so invoices and the site
 * never look unfinished.
 */
export default function ClinicLogo({
  logoUrl,
  name = CLINIC.name,
  size = 44,
  withName = false,
  className = '',
}: Props) {
  const mark = logoUrl ? (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg"
      style={{ width: size, height: size }}
    >
      <Image src={logoUrl} alt={name} fill className="object-contain" sizes={`${size}px`} />
    </div>
  ) : (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className="shrink-0"
      aria-label={name}
    >
      {/* leaf arc, homeopathic side */}
      <path
        d="M10 30c0-10 7-18 16-18"
        stroke="#2E9E7B"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M17 15c-3-2-6-1-7 2 3 1 6 0 7-2Z" fill="#2E9E7B" />
      <path d="M22 10c-2-3-5-3-7-1 2 2 5 3 7 1Z" fill="#3FBF93" />
      {/* tooth, dental side */}
      <path
        d="M24 13c3-2 7-2 9 1 2 3 1 8 0 12-.7 2.6-1.3 6-3 6s-1.6-4-3-4-1.3 4-3 4-2.3-3.4-3-6c-1-4-2-9 0-12 2-3 6-3 9-1Z"
        stroke="#0B4F4A"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )

  if (!withName) return <span className={className}>{mark}</span>

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      {mark}
      <span className="font-display font-semibold leading-tight text-clinic-teal">{name}</span>
    </span>
  )
}

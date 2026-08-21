'use client'

import Link from 'next/link'
import { buildWhatsAppLink } from '@/lib/whatsapp'

export interface BirthdayPatient {
  id: string
  full_name: string
  phone: string
  department: string | null
  date_of_birth: string | null
}

interface Props {
  patient: BirthdayPatient
  age: number
  offer: { message: string; offer_label: string }
  highlight?: boolean
}

export default function BirthdayCard({ patient, age, offer, highlight = false }: Props) {
  const dob = patient.date_of_birth ? new Date(patient.date_of_birth) : null

  const link = buildWhatsAppLink({
    phoneOverride: patient.phone,
    customMessage: [
      `Assalam o Alaikum ${patient.full_name},`,
      '',
      offer.message,
      '',
      `Offer: ${offer.offer_label}`,
      '',
      'Al Shifa Health Care',
      'Dr. Muhammad Khalid Mahmood',
      'Numaish, Nizami Road, Karachi · 0342-2078639',
    ].join('\n'),
  })

  return (
    <div
      className={`rounded-2xl border bg-white p-4 ${
        highlight ? 'border-clinic-amber/40' : 'border-clinic-teal/10'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/admin/patients/${patient.id}`}
            className="font-medium text-clinic-ink hover:text-clinic-teal"
          >
            {patient.full_name}
          </Link>
          <p className="text-xs text-clinic-ink/50">
            {patient.phone}
            {patient.department ? ` · ${patient.department}` : ''}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-clinic-ink/50">
            {dob ? dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
          </p>
          <p
            className={`font-display font-semibold ${
              highlight ? 'text-clinic-amber' : 'text-clinic-teal'
            }`}
          >
            {age} saal
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-clinic-teal/10 pt-3">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white"
        >
          Send Wishes + Offer
        </a>
        <a
          href={`tel:${patient.phone.replace(/[^0-9+]/g, '')}`}
          className="rounded-full border border-clinic-teal px-3 py-1.5 text-xs font-semibold text-clinic-teal"
        >
          Call
        </a>
      </div>
    </div>
  )
}

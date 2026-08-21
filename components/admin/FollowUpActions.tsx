'use client'

import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'

interface Props {
  patientName: string
  patientPhone: string
  nextVisit: string
  procedure: string
}

export default function FollowUpActions({
  patientName,
  patientPhone,
  nextVisit,
  procedure,
}: Props) {
  const link = buildWhatsAppLink({
    phoneOverride: patientPhone,
    customMessage: [
      `Assalam o Alaikum ${patientName},`,
      `Aap ka agla visit (${procedure}) ${new Date(nextVisit).toLocaleDateString('en-GB')} ko due hai.`,
      `Baraye meherbani appointment confirm karwa lein.`,
      '',
      CLINIC.name,
      '${CLINIC.address.full} · ${CLINIC.phone.display}',
    ].join('\n'),
  })

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white"
      >
        Send Reminder
      </a>
      <a
        href={`tel:${patientPhone.replace(/[^0-9+]/g, '')}`}
        className="rounded-full border border-clinic-teal px-3 py-1.5 text-xs font-semibold text-clinic-teal"
      >
        Call
      </a>
    </div>
  )
}

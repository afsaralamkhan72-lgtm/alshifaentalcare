'use client'

import Link from 'next/link'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'

interface Props {
  patientId: string
  patientName: string
  patientPhone: string
  mrNumber: string | null
  portalCode: string | null
  department: string
  /** Ortho jaise plan wala patient hai ya nahi */
  hasPlan: boolean
  total: number
  paid: number
  balance: number
  nextAppointment: string | null
  nextVisit: string | null
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB') : null
}

export default function PatientQuickActions({
  patientId,
  patientName,
  patientPhone,
  mrNumber,
  portalCode,
  hasPlan,
  total,
  paid,
  balance,
  nextAppointment,
  nextVisit,
}: Props) {
  const portalUrl =
    typeof window !== 'undefined' && portalCode
      ? `${window.location.origin}/portal/${portalCode}`
      : ''

  const nextDate = fmt(nextAppointment) ?? fmt(nextVisit)

  // Poora statement: total, diya, baqaya, agla visit aur portal code
  const statementLink = buildWhatsAppLink({
    phoneOverride: patientPhone,
    customMessage: [
      `Assalam o Alaikum ${patientName},`,
      '',
      `${CLINIC.name} se aap ka hisaab:`,
      '',
      `Total bill      : Rs. ${total.toLocaleString()}`,
      `Aap ne diya     : Rs. ${paid.toLocaleString()}`,
      `Baqaya          : Rs. ${balance.toLocaleString()}`,
      ...(nextDate ? ['', `Agli appointment: ${nextDate}`] : []),
      ...(portalCode
        ? [
            '',
            'Apna poora record khud dekhein:',
            portalUrl,
            `Code: ${portalCode}`,
          ]
        : []),
      '',
      CLINIC.doctor.name,
      `${CLINIC.name} · ${CLINIC.address.full}`,
      CLINIC.phone.display,
    ].join('\n'),
  })

  return (
    <div className="mt-4 rounded-2xl border border-clinic-teal/20 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        {hasPlan ? (
          <a
            href="#treatment-plans"
            className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white"
          >
            + Month Payment
          </a>
        ) : (
          <Link
            href={`/admin/patients/${patientId}/invoice`}
            className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white"
          >
            + Treatment / Payment
          </Link>
        )}

        <a
          href="#visit-notes"
          className="rounded-full border border-clinic-teal px-4 py-2 text-sm font-semibold text-clinic-teal"
        >
          + Add Visit
        </a>

        <a
          href="#patient-photos"
          className="rounded-full border border-clinic-teal/30 px-4 py-2 text-sm font-semibold text-clinic-ink/80"
        >
          + Photo
        </a>

        <a
          href={statementLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-whatsapp px-4 py-2 text-sm font-semibold text-white"
        >
          Statement WhatsApp
        </a>

        <Link
          href={`/admin/patients/${patientId}/invoice`}
          className="rounded-full border border-clinic-teal/30 px-4 py-2 text-sm font-semibold text-clinic-ink/80"
        >
          PDF / Print
        </Link>

        <a
          href={`tel:${patientPhone.replace(/[^0-9+]/g, '')}`}
          className="rounded-full border border-clinic-teal/30 px-4 py-2 text-sm font-semibold text-clinic-ink/80"
        >
          Call
        </a>
      </div>

      {/* Message mein jo jayega, wahi yahan dikh raha hai */}
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-clinic-teal/10 pt-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-clinic-ink/60">Total Bill</p>
          <p className="font-display font-semibold text-clinic-ink">
            Rs. {total.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-clinic-ink/60">Diya</p>
          <p className="font-display font-semibold text-emerald-700">
            Rs. {paid.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-clinic-ink/60">Baqaya</p>
          <p className="font-display font-semibold text-amber-700">
            Rs. {balance.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-clinic-ink/60">Agli Appointment</p>
          <p className="font-display font-semibold text-clinic-teal">{nextDate ?? '—'}</p>
        </div>
      </div>

      {!portalCode && (
        <p className="mt-2 text-xs text-amber-700">
          Portal code nahi bana. SETUP-ALL.sql chalayein taake patient apna record dekh sake.
        </p>
      )}
      {mrNumber && (
        <p className="mt-2 text-xs text-clinic-ink/50">MR: {mrNumber}</p>
      )}
    </div>
  )
}

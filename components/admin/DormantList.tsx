'use client'

import Link from 'next/link'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'

export interface DormantPatient {
  id: string
  full_name: string
  phone: string
  mr_number: string | null
  created_at: string
}

export default function DormantList({ patients }: { patients: DormantPatient[] }) {
  if (patients.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 px-4 py-6 text-center text-sm text-clinic-ink/50">
        Koi dormant patient nahi.
      </div>
    )
  }

  return (
    <div className="mt-3 divide-y divide-clinic-teal/10 rounded-2xl border border-clinic-teal/10 bg-white">
      {patients.map((p) => {
        const link = buildWhatsAppLink({
          phoneOverride: p.phone,
          customMessage: [
            `Assalam o Alaikum ${p.full_name},`,
            '',
            `Kaafi arse se aap ki clinic par tashreef aawari nahi hui. Umeed hai aap khairiyat se hain.`,
            `Dant ka routine check-up har chhe mahine baad zaroori hota hai.`,
            `Appointment ke liye is number par raabta karein.`,
            '',
            CLINIC.name,
            CLINIC.doctor.name,
            '${CLINIC.address.full} · ${CLINIC.phone.display}',
          ].join('\n'),
        })

        return (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Link
                href={`/admin/patients/${p.id}`}
                className="text-sm font-medium text-clinic-ink hover:text-clinic-teal"
              >
                {p.full_name}
              </Link>
              <p className="text-xs text-clinic-ink/50">
                {p.mr_number} · {p.phone} · registered{' '}
                {new Date(p.created_at).toLocaleDateString('en-GB')}
              </p>
            </div>

            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white"
            >
              WhatsApp
            </a>
          </div>
        )
      })}
    </div>
  )
}

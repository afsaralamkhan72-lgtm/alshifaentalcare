'use client'

import { buildWhatsAppLink } from '@/lib/whatsapp'
import { CLINIC } from '@/clinic.config'

interface Props {
  patientName: string
  patientPhone: string
  mrNumber: string
  portalCode?: string | null
  previousBalance?: number
  /** Jo treatments ke paise abhi baqi hain */
  dues?: { name: string; due: number; dueDate: string | null }[]
  todayCharge?: number
  todayPaid?: number
  total: number
  paid: number
  balance: number
}

export default function InvoiceActions({
  patientName,
  patientPhone,
  mrNumber,
  portalCode,
  previousBalance = 0,
  dues = [],
  todayCharge = 0,
  todayPaid = 0,
  total,
  paid,
  balance,
}: Props) {
  // Text summary for WhatsApp, the PDF itself stays on the device,
  // nothing is uploaded to Supabase.
  // Portal link is appended so the patient can check the same figures
  // themselves later, without calling the clinic.
  const portalUrl =
    typeof window !== 'undefined' && portalCode
      ? `${window.location.origin}/portal/${portalCode}`
      : ''

  const link = buildWhatsAppLink({
    phoneOverride: patientPhone,
    customMessage: [
      `Assalam o Alaikum ${patientName},`,
      `${CLINIC.name}, payment statement (${mrNumber})`,
      '',
      `Purana baqaya : Rs. ${previousBalance.toLocaleString()}`,
      `Aaj ka kaam   : Rs. ${todayCharge.toLocaleString()}`,
      `Aaj mile      : Rs. ${todayPaid.toLocaleString()}`,
      `Ab baqaya     : Rs. ${balance.toLocaleString()}`,
      ...(dues.length > 0
        ? [
            '',
            'Baqaya kis kaam ka:',
            ...dues.map(
              (d) =>
                `· ${d.name}: Rs. ${d.due.toLocaleString()}${
                  d.dueDate ? ` (${new Date(d.dueDate).toLocaleDateString('en-GB')} tak)` : ''
                }`
            ),
          ]
        : []),
      '',
      `(Kul charges Rs. ${total.toLocaleString()}, kul payment Rs. ${paid.toLocaleString()})`,
      ...(portalCode
        ? [
            '',
            'Aap apna record khud bhi dekh sakte hain:',
            portalUrl,
            `Code: ${portalCode}`,
            '',
            'Link kholein aur ye code likhein, aap ko apni appointment,',
            'baqaya raqam aur har payment ki tafseel nazar aa jayegi.',
            'Ye link zaati hai, kisi aur ke sath share na karein.',
          ]
        : []),
      '',
      CLINIC.doctor.name,
      '${CLINIC.name} · ${CLINIC.phone.display}',
    ].join('\n'),
  })

  return (
    <>
      {/* Hide everything except the invoice sheet when printing */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-sheet, #invoice-sheet * { visibility: visible; }
          #invoice-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
          }
        }
      `}</style>

      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-full bg-clinic-teal px-5 py-2.5 text-sm font-semibold text-white"
        >
          Download PDF
        </button>

        <button
          onClick={() => window.print()}
          className="rounded-full border border-clinic-teal px-5 py-2.5 text-sm font-semibold text-clinic-teal"
        >
          Print
        </button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white"
        >
          Send Summary on WhatsApp
        </a>
      </div>
    </>
  )
}

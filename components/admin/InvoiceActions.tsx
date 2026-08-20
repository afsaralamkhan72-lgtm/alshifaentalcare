'use client'

import { buildWhatsAppLink } from '@/lib/whatsapp'

interface Props {
  patientName: string
  patientPhone: string
  mrNumber: string
  total: number
  paid: number
  balance: number
}

export default function InvoiceActions({
  patientName,
  patientPhone,
  mrNumber,
  total,
  paid,
  balance,
}: Props) {
  // Text summary for WhatsApp — the PDF itself stays on the device,
  // nothing is uploaded to Supabase.
  const link = buildWhatsAppLink({
    phoneOverride: patientPhone,
    customMessage: [
      `Assalam o Alaikum ${patientName},`,
      `Al Shifa Health Care — payment statement (${mrNumber})`,
      '',
      `Total: Rs. ${total.toLocaleString()}`,
      `Paid: Rs. ${paid.toLocaleString()}`,
      `Balance: Rs. ${balance.toLocaleString()}`,
      '',
      'Dr. Muhammad Khalid Mahmood',
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
          Save as PDF / Print
        </button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white"
        >
          Send Summary on WhatsApp
        </a>
        <p className="text-xs text-clinic-ink/50">
          PDF sirf aap ke device par banegi — Supabase par kuch save nahi hota.
        </p>
      </div>
    </>
  )
}

'use client'

import { buildWhatsAppLink } from '@/lib/whatsapp'

interface Props {
  caseNumber: string
  labName: string
  labWhatsapp: string | null
  patientName: string
  workType: string | null
  teeth: string[]
  shade: string | null
  material: string | null
  dueDate: string | null
  instructions: string | null
}

export default function LabOrderActions({
  caseNumber,
  labName,
  labWhatsapp,
  patientName,
  workType,
  teeth,
  shade,
  material,
  dueDate,
  instructions,
}: Props) {
  // The whole work order as a WhatsApp message, sent straight to the lab
  const lines = [
    `*Al Shifa Health Care, Lab Work Order*`,
    `Case: ${caseNumber}`,
    '',
    `Patient: ${patientName}`,
    workType ? `Work: ${workType}` : '',
    teeth.length ? `Teeth (FDI): ${teeth.join(', ')}` : '',
    shade ? `Shade: ${shade}` : '',
    material ? `Material: ${material}` : '',
    dueDate ? `Due: ${new Date(dueDate).toLocaleDateString('en-GB')}` : '',
    instructions ? `\nInstructions: ${instructions}` : '',
    '',
    'Dr. Muhammad Khalid Mahmood',
    'Numaish, Nizami Road, Karachi · 0342-2078639',
  ].filter(Boolean)

  const link = labWhatsapp
    ? buildWhatsAppLink({ phoneOverride: labWhatsapp, customMessage: lines.join('\n') })
    : null

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #lab-sheet, #lab-sheet * { visibility: visible; }
          #lab-sheet {
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

        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white"
          >
            Send to {labName} on WhatsApp
          </a>
        ) : (
          <span className="rounded-full bg-amber-50 px-4 py-2 text-xs text-amber-700">
            Is lab ka WhatsApp number save nahi hai, case edit kar ke daal dein.
          </span>
        )}
      </div>
    </>
  )
}

'use client'

/** Sirf #print-sheet chhapta hai (admin ka sidebar/header nahi) */
export default function SheetPrintButton({ label = 'Print / PDF' }: { label?: string }) {
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-sheet, #print-sheet * { visibility: visible; }
          #print-sheet { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
          @page { margin: 12mm; }
        }
      `}</style>
      <button onClick={() => window.print()} className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white">
        {label}
      </button>
    </>
  )
}

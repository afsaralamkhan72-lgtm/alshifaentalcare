'use client'

export default function HistoryPrintButton() {
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #history-sheet, #history-sheet * { visibility: visible; }
          #history-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
          }
        }
      `}</style>

      <button
        onClick={() => window.print()}
        className="rounded-full bg-clinic-teal px-4 py-2 text-sm font-semibold text-white"
      >
        Save as PDF / Print
      </button>
    </>
  )
}

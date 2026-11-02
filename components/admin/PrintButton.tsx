'use client'
export default function PrintButton() {
  return <button onClick={() => window.print()} className="mt-6 rounded-lg bg-clinic-teal px-4 py-2 text-white print:hidden">Print</button>
}

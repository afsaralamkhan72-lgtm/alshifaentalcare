'use client'

import { useEffect, useState } from 'react'
import ReceiptPrompt from '@/components/admin/ReceiptPrompt'
import { RECEIPT_EVENT, type ReceiptAsk } from '@/lib/receiptEvent'

/** Layout mein aik jagah: koi bhi payment ke baad "Rasid bhejein" ka dibba neeche nazar aata hai. */
export default function ReceiptHost() {
  const [ask, setAsk] = useState<ReceiptAsk | null>(null)
  useEffect(() => {
    const h = (e: Event) => setAsk((e as CustomEvent<ReceiptAsk>).detail)
    window.addEventListener(RECEIPT_EVENT, h)
    return () => window.removeEventListener(RECEIPT_EVENT, h)
  }, [])
  if (!ask) return null
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md shadow-xl print:hidden">
      <ReceiptPrompt patientId={ask.patientId} amount={ask.amount} method={ask.method} onClose={() => setAsk(null)} />
    </div>
  )
}

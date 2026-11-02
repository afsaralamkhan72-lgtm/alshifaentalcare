/** Kisi bhi screen se "rasid bhejein" ka dialog kholna (dialog layout mein hai, screen badalne par bhi bacha rehta hai). */
export interface ReceiptAsk {
  patientId: string
  amount: number
  method?: string | null
}
export const RECEIPT_EVENT = 'alshifa-receipt-ask'
export function askReceipt(a: ReceiptAsk) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<ReceiptAsk>(RECEIPT_EVENT, { detail: a }))
}

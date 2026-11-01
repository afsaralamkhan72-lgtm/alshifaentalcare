'use client'

/**
 * Phase 0: bill/payment ki entry ab HATAI nahi ja sakti.
 *
 * Pehle ye button transactions table se row hamesha ke liye mita deta tha.
 * Aage Cancel / Void / Refund ka tareeqa aayega (kis ne, kab, kyun record ho kar).
 * Tab tak galat amount ko "Edit" se theek karein.
 */
interface Props {
  id: string
  label: string
  amount: number
}

export default function DeleteTransactionButton(_props: Props) {
  return null
}

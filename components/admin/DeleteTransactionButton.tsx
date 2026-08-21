'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  id: string
  label: string
  amount: number
}

export default function DeleteTransactionButton({ id, label, amount }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (
      !confirm(
        `"${label}" (Rs. ${amount.toLocaleString()}) bill se hata dein?\n\nYe entry Billing aur Reports se bhi nikal jayegi. Ye wapas nahi aayegi.`
      )
    )
      return

    setBusy(true)
    const supabase = createClient()
    await supabase.from('transactions').delete().eq('id', id)
    setBusy(false)
    router.refresh()
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      title="Hatayein"
      className="rounded px-1.5 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 print:hidden"
    >
      ✕
    </button>
  )
}

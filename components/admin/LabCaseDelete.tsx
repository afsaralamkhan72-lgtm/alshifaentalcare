'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { numFmt } from '@/lib/karachi'

/** Lab case ko Recycle Bin mein bhejta hai (sirf doctor/admin). Payments ko haath nahi lagata. */
export default function LabCaseDelete({
  id,
  caseNumber,
  paid,
  goTo,
  small,
}: {
  id: string
  caseNumber: string
  paid: number
  goTo?: string
  small?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function del() {
    const warn =
      paid > 0
        ? `${caseNumber} mein lab ko Rs. ${numFmt(paid)} di ja chuki hain. Case Recycle Bin mein chala jayega, lekin Kharche mein wo payment ka record waisa hi rahega.\n\nPhir bhi hatayein?`
        : `${caseNumber} ko Recycle Bin mein bhejein? Wahan se wapas bhi la sakte hain.`
    if (!window.confirm(warn)) return
    setBusy(true)
    setErr('')
    const supabase = createClient()
    const { error } = await supabase.from('lab_cases').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setBusy(false)
    if (error) {
      setErr('Nahi hua: ' + error.message)
      return
    }
    if (goTo) router.push(goTo)
    else router.refresh()
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={del}
        disabled={busy}
        className={`rounded-full border border-red-200 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 ${small ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'}`}
      >
        {busy ? '...' : 'Delete'}
      </button>
      {err && <span className="mt-1 max-w-xs text-xs text-red-600">{err}</span>}
    </span>
  )
}

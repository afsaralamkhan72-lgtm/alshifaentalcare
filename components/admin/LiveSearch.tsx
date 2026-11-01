'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/** Type karte hi talash (thora ruk kar: har harf par server ko call nahi jati) */
export default function LiveSearch({ placeholder = 'Naam, phone ya MR number...', param = 'q' }: { placeholder?: string; param?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [v, setV] = useState(sp.get(param) ?? '')
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString())
      if (v.trim()) next.set(param, v.trim())
      else next.delete(param)
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])
  return (
    <input
      name={param}
      value={v}
      onChange={(e) => setV(e.target.value)}
      placeholder={placeholder}
      className="min-w-[200px] flex-1 rounded-lg border border-clinic-teal/20 px-3 py-2.5 text-sm"
      autoFocus
    />
  )
}

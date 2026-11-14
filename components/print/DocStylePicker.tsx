'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/** Is kaghaz ka style sirf is baar ke liye badalna (Settings nahi badalti) */
export default function DocStylePicker({ current }: { current: 'soft' | 'duo' }) {
  const router = useRouter()
  const path = usePathname()
  const sp = useSearchParams()
  const set = (v: 'soft' | 'duo') => {
    const q = new URLSearchParams(sp.toString())
    q.set('tpl', v)
    router.replace(path + '?' + q.toString())
  }
  const b = 'rounded-full px-4 py-1.5 text-xs font-semibold min-h-[36px] '
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden" data-testid="doc-style-picker">
      <span className="text-xs text-clinic-ink/60">Style:</span>
      <button type="button" data-testid="style-soft" onClick={() => set('soft')} className={b + (current === 'soft' ? 'bg-clinic-teal text-white' : 'border border-clinic-teal text-clinic-teal')}>
        Rangeen header
      </button>
      <button type="button" data-testid="style-duo" onClick={() => set('duo')} className={b + (current === 'duo' ? 'bg-clinic-teal text-white' : 'border border-clinic-teal text-clinic-teal')}>
        Do doctors wala (Duo)
      </button>
    </div>
  )
}

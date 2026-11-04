'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const KEY = 'as_mode'

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
function save(v: string) {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    /* koi baat nahi */
  }
}

export default function StartPicker({ name }: { name: string }) {
  const router = useRouter()
  const [showStaff, setShowStaff] = useState(false)
  const taps = useRef({ n: 0, t: 0 })

  // Staff ka phone pehle se "staff" yaad rakhe to seedha login. Sirf app kholne par aik baar (wapas aane par nahi).
  useEffect(() => {
    try {
      const reset = new URLSearchParams(location.search).get('badlo')
      if (reset) {
        localStorage.removeItem(KEY)
        return
      }
      if (sessionStorage.getItem('as_start_done')) return
      sessionStorage.setItem('as_start_done', '1')
    } catch {
      /* aage barhein */
    }
    if (read() === 'staff') router.replace('/login')
    else if (read() === 'patient') {
      try {
        const c = localStorage.getItem('as_code')
        if (c && /^[a-z0-9-]{3,60}$/.test(c)) router.replace(`/portal/${encodeURIComponent(c)}`)
      } catch {
        /* picker dikhayein */
      }
    }
  }, [router])

  function logoTap() {
    const now = Date.now()
    taps.current = { n: now - taps.current.t < 2000 ? taps.current.n + 1 : 1, t: now }
    if (taps.current.n >= 5) setShowStaff(true)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-clinic-teal px-5 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center">
        <button type="button" onClick={logoTap} aria-label="Logo" className="mx-auto block select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={84} height={84} className="mx-auto rounded-2xl" />
        </button>
        <h1 className="mt-4 font-display text-xl font-semibold text-clinic-ink">{name}</h1>
        <p className="mt-1 text-sm text-clinic-ink/55">Khush aamdeed</p>

        <div className="mt-6 grid gap-3">
          <Link
            href="/portal"
            onClick={() => save('patient')}
            className="rounded-xl bg-clinic-teal px-4 py-3.5 text-base font-semibold text-white"
          >
            Mera record dekhein
          </Link>
          <Link href="/booking" className="rounded-xl border border-clinic-teal/30 px-4 py-3 text-base font-semibold text-clinic-teal">
            Appointment lein
          </Link>
          {showStaff && (
            <Link
              href="/login"
              onClick={() => save('staff')}
              className="rounded-xl border border-clinic-ink/20 px-4 py-3 text-sm font-semibold text-clinic-ink/70"
            >
              Staff login
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

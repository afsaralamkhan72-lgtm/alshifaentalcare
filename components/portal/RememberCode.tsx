'use client'

import { useEffect } from 'react'
import NativePush from '@/components/NativePush'

/** Patient ka code phone mein yaad rakhta hai, taa ke app dobara kholne par seedha record khule. */
export default function RememberCode({ code }: { code: string }) {
  useEffect(() => {
    try {
      localStorage.setItem('as_code', code)
    } catch {
      /* koi baat nahi */
    }
  }, [code])
  return <NativePush kind="patient" code={code} />
}

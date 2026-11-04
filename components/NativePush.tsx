'use client'

import { useEffect } from 'react'

interface PushPlugin {
  requestPermissions: () => Promise<{ receive: string }>
  register: () => Promise<void>
  addListener: (ev: string, cb: (x: never) => void) => Promise<unknown>
}

/**
 * Sirf Android app ke andar chalta hai (browser mein kuch nahi karta).
 * Phone ka notification token server ko bhejta hai. Firebase ki chaabi na ho to bhi kuch toot-ta nahi.
 */
export default function NativePush({ kind, code }: { kind: 'patient' | 'staff'; code?: string }) {
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, PushPlugin> } }).Capacitor
    if (!cap?.isNativePlatform?.()) return
    const P = cap.Plugins?.PushNotifications
    if (!P) return
    let alive = true
    ;(async () => {
      try {
        const perm = await P.requestPermissions()
        if (perm.receive !== 'granted' || !alive) return
        await P.addListener('registration', ((t: { value: string }) => {
          fetch('/api/device/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t.value, kind, code }) }).catch(() => {})
        }) as (x: never) => void)
        await P.addListener('pushNotificationActionPerformed', ((a: { notification?: { data?: { url?: string } } }) => {
          const u = a.notification?.data?.url
          if (u && u.startsWith('/')) window.location.href = u
        }) as (x: never) => void)
        await P.register()
      } catch {
        /* notification nahi chali to app chalti rahe */
      }
    })()
    return () => {
      alive = false
    }
  }, [kind, code])
  return null
}

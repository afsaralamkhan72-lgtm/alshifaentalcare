'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MEDIA_BUCKET } from '@/lib/upload'

export interface MediaItem {
  id: string
  storage_path: string
  caption: string | null
  category: string | null
}

/** Chhoti tasveerein / files (private bucket: har file ka signed link). Click = poori file naye tab mein */
export default function MediaStrip({ items, size = 56 }: { items: MediaItem[]; size?: number }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    let off = false
    if (items.length === 0) return
    ;(async () => {
      const supabase = createClient()
      const entries = await Promise.all(
        items.map(async (m) => {
          const { data } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(m.storage_path, 3600)
          return [m.id, data?.signedUrl ?? ''] as const
        })
      )
      if (!off) setUrls(Object.fromEntries(entries))
    })()
    return () => {
      off = true
    }
  }, [items])
  if (items.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((m) => {
        const isPdf = /\.pdf$/i.test(m.storage_path)
        const u = urls[m.id]
        return (
          <a
            key={m.id}
            href={u || undefined}
            target="_blank"
            rel="noopener noreferrer"
            title={m.caption ?? ''}
            className="flex items-center justify-center overflow-hidden rounded-lg border border-clinic-teal/15 bg-clinic-mint text-[10px] font-semibold text-clinic-teal"
            style={{ width: size, height: size }}
          >
            {isPdf ? 'PDF' : u ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u} alt={m.caption ?? ''} className="h-full w-full object-cover" />
            ) : (
              '...'
            )}
          </a>
        )
      })}
    </div>
  )
}

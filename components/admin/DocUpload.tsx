'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage, buildStoragePath } from '@/lib/image-compress'

/** Bill / rasid ki photo: chhoti karke private bucket mein; sirf raasta wapas deta hai. */
export default function DocUpload({ folder, value, onChange }: { folder: string; value: string | null; onChange: (path: string | null) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setBusy(true); setErr('')
    try {
      if (!f.type.startsWith('image/')) throw new Error('Sirf photo chunein')
      const small = await compressImage(f, { maxWidth: 1400, maxHeight: 1400, quality: 0.75 })
      const path = buildStoragePath(folder, small)
      const { error } = await createClient().storage.from('business-docs').upload(path, small, { cacheControl: '3600', upsert: false })
      if (error) throw error
      onChange(path)
    } catch (x) { setErr(x instanceof Error ? x.message : 'Photo upload nahi hui') }
    setBusy(false)
    e.target.value = ''
  }
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <label className="cursor-pointer rounded-lg border border-clinic-teal/30 px-3 py-1.5">
        {busy ? 'Upload ho rahi…' : value ? 'Photo badlein' : 'Bill ki photo'}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} disabled={busy} aria-label="Bill ki photo" />
      </label>
      {value && <><span className="text-emerald-700">✓ lag gayi</span><button type="button" className="underline" onClick={() => onChange(null)}>Hatayein</button></>}
      {err && <span role="alert" className="text-red-600">{err}</span>}
    </span>
  )
}

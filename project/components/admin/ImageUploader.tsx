'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { compressImage, buildStoragePath } from '@/lib/image-compress'

interface ImageUploaderProps {
  bucket: string
  folder: string
  value: string | null
  onChange: (url: string | null) => void
  label?: string
}

export default function ImageUploader({ bucket, folder, value, onChange, label }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [savedKb, setSavedKb] = useState<number | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const originalKb = Math.round(file.size / 1024)
      const compressed = await compressImage(file)
      const compressedKb = Math.round(compressed.size / 1024)

      const supabase = createClient()
      const path = buildStoragePath(folder, compressed)

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, compressed, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl)
      setSavedKb(originalKb - compressedKb)
    } catch {
      setError('Upload nahi hua. Bucket permissions check karein.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {label && <label className="text-sm font-medium text-clinic-ink">{label}</label>}

      <div className="mt-1 flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-clinic-mint">
          {value && <Image src={value} alt="" fill className="object-cover" />}
        </div>

        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            className="block w-full text-xs text-clinic-ink/60 file:mr-3 file:rounded-full file:border-0 file:bg-clinic-mint file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-clinic-teal"
          />
          {uploading && <p className="mt-1 text-xs text-clinic-ink/50">Compressing &amp; uploading...</p>}
          {savedKb !== null && savedKb > 0 && (
            <p className="mt-1 text-xs text-emerald-600">{savedKb} KB space bachaya gaya</p>
          )}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          {value && !uploading && (
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setSavedKb(null)
              }}
              className="mt-1 text-xs text-red-600 hover:underline"
            >
              Remove image
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/image-compress'

const BUCKET = 'patient-media'

/** Har patient ki profile pic isi aik fixed naam par rehti hai */
function profilePath(patientId: string) {
  return `${patientId}/profile.webp`
}

export default function PatientProfilePhoto({
  patientId,
  hasPhoto,
}: {
  patientId: string
  hasPhoto: boolean
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!hasPhoto) return
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(profilePath(patientId), 3600)
      if (!cancelled) setUrl(data?.signedUrl ?? '')
    }
    load()
    return () => {
      cancelled = true
    }
  }, [patientId, hasPhoto])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // Profile pic sirf chhota avatar ban kar dikhti hai, isliye
      // treatment photos se bhi zyada kas kar compress karte hain
      const compressed = await compressImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.8,
      })

      const supabase = createClient()
      const path = profilePath(patientId)

      // upsert: true — purani photo ki jagah yehi file overwrite hoti hai,
      // storage mein dusri copy kabhi nahi banti
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressed, { upsert: true, cacheControl: '3600' })

      if (uploadError) throw uploadError

      await supabase.from('patients').update({ profile_photo_path: path }).eq('id', patientId)
      router.refresh()
    } catch {
      // silent fail is fine here, user can just retry
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <label className="group relative block h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-clinic-mint">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-clinic-teal/40">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
          </svg>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        {uploading ? '...' : 'Badlein'}
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
      />
    </label>
  )
}

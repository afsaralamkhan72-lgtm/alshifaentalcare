'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/image-compress'

export interface PatientPhoto {
  id: string
  storage_path: string
  caption: string | null
  taken_on: string
}

const BUCKET = 'patient-media'

const MAX_PHOTOS = 3

export default function PatientPhotoGallery({
  patientId,
  photos,
}: {
  patientId: string
  photos: PatientPhoto[]
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')
  const [urls, setUrls] = useState<Record<string, string>>({})

  // Bucket private hai, isliye har photo ke liye signed URL leni parti hai
  useEffect(() => {
    let cancelled = false
    async function loadUrls() {
      const supabase = createClient()
      const entries = await Promise.all(
        photos.map(async (p) => {
          const { data } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(p.storage_path, 3600)
          return [p.id, data?.signedUrl ?? ''] as const
        })
      )
      if (!cancelled) setUrls(Object.fromEntries(entries))
    }
    if (photos.length > 0) loadUrls()
  }, [photos])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Storage par bojh na pade, isliye har patient ke sirf 3 hi
    // treatment photos rakhte hain. Nayi ke liye purani hatani hogi.
    if (photos.length >= MAX_PHOTOS) {
      setError(`Zyada se zyada ${MAX_PHOTOS} photos. Pehle koi purani photo delete karein.`)
      e.target.value = ''
      return
    }

    setUploading(true)
    setError('')

    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 })
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const ext = compressed.name.split('.').pop() ?? 'webp'
      const path = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressed, { cacheControl: '3600' })

      if (uploadError) throw uploadError

      await supabase.from('patient_photos').insert({
        patient_id: patientId,
        storage_path: path,
        caption: caption.trim() || null,
        created_by: user?.id ?? null,
      })

      setCaption('')
      router.refresh()
    } catch {
      setError('Upload nahi hui. Kya phase17.sql chalayi thi?')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function remove(photo: PatientPhoto) {
    if (!confirm('Ye photo delete karein?')) return
    const supabase = createClient()
    await supabase.storage.from(BUCKET).remove([photo.storage_path])
    await supabase.from('patient_photos').delete().eq('id', photo.id)
    router.refresh()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-clinic-ink">Photos</h2>
          <p className="text-sm text-clinic-ink/60">
            Sirf staff dekh sakta hai. Upload karte hi khud compress ho jati hai.
            Zyada se zyada {MAX_PHOTOS} photos ({photos.length}/{MAX_PHOTOS}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-40 rounded-lg border border-clinic-teal/20 px-3 py-2 text-sm"
          />
          <label
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ${
              photos.length >= MAX_PHOTOS
                ? 'cursor-not-allowed bg-clinic-mint text-clinic-ink/40'
                : 'bg-clinic-teal text-white'
            }`}
          >
            {uploading ? 'Uploading...' : '+ Photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading || photos.length >= MAX_PHOTOS}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {photos.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-clinic-teal/20 bg-clinic-mint/40 p-6 text-center text-sm text-clinic-ink/60">
          Koi photo nahi. Visit ke waqt daant ki tasveer, X-ray, ya progress photo lagayein.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-xl bg-clinic-mint">
              {urls[p.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[p.id]}
                  alt={p.caption ?? 'Patient photo'}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-xs text-clinic-ink/40">
                  Loading...
                </div>
              )}

              <button
                onClick={() => remove(p)}
                className="absolute right-1 top-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ✕
              </button>

              <div className="bg-white/90 p-1.5">
                <p className="truncate text-[11px] text-clinic-ink/70">{p.caption ?? '—'}</p>
                <p className="text-[10px] text-clinic-ink/40">
                  {new Date(p.taken_on).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

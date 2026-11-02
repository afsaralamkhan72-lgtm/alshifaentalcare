import { compressImage } from '@/lib/image-compress'
import type { SupabaseClient } from '@supabase/supabase-js'

export const MEDIA_BUCKET = 'patient-media'

/**
 * Patient ki files (tasveer, X-ray, PDF report) storage mein daal kar patient_photos mein record.
 * Tasveer khud compress hoti hai; PDF waisi hi jati hai. Har file ka record patient (aur jahan ho
 * treatment / visit / lab case) se juda hota hai. Ghalti par saaf error wapas.
 */
export async function uploadPatientFiles(
  supabase: SupabaseClient,
  patientId: string,
  files: File[],
  meta: { category: string; caption?: string | null; treatment_id?: string | null; visit_id?: string | null; lab_case_id?: string | null }
): Promise<{ ok: number; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let ok = 0
  for (const f of files) {
    if (f.size > 8 * 1024 * 1024) return { ok, error: `${f.name}: file 8MB se bari hai` }
    const file = f.type.startsWith('image/') ? await compressImage(f, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 }) : f
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
    const path = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: '3600', contentType: file.type || undefined })
    if (upErr) return { ok, error: `${f.name}: upload nahi hui (${upErr.message})` }
    const { error: insErr } = await supabase.from('patient_photos').insert({
      patient_id: patientId,
      storage_path: path,
      caption: meta.caption?.trim() || f.name.slice(0, 80),
      created_by: user?.id ?? null,
      category: meta.category,
      treatment_id: meta.treatment_id ?? null,
      visit_id: meta.visit_id ?? null,
      lab_case_id: meta.lab_case_id ?? null,
    })
    if (insErr) return { ok, error: `${f.name}: record save nahi hua (${insErr.message})` }
    ok++
  }
  return { ok, error: null }
}

/**
 * Compresses an image in the browser BEFORE uploading to Supabase Storage.
 *
 * Approach: resize down to a sensible max dimension, then re-encode as WebP
 * at high quality (0.85). This is "compress but not blur", the image stays
 * visually sharp on screen, but file size typically drops 70–90% vs the
 * original phone/camera photo, so the free 1GB Storage lasts much longer.
 */
export async function compressImage(
  file: File,
  { maxWidth = 1600, maxHeight = 1600, quality = 0.85 } = {}
): Promise<File> {
  // Non-images (or SVG, which shouldn't be rasterized) pass through untouched
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file

  const bitmap = await createImageBitmap(file)

  let { width, height } = bitmap
  const scale = Math.min(maxWidth / width, maxHeight / height, 1)
  width = Math.round(width * scale)
  height = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  // High-quality downscaling, prevents the jagged/blurry look of naive resizing
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality)
  )

  if (!blob) return file

  // Safety net: if compression somehow made it bigger, keep the original
  if (blob.size >= file.size) return file

  const newName = file.name.replace(/\.[^.]+$/, '') + '.webp'
  return new File([blob], newName, { type: 'image/webp' })
}

/** Generates a collision-safe storage path */
export function buildStoragePath(folder: string, file: File) {
  const ext = file.name.split('.').pop() ?? 'webp'
  const stamp = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `${folder}/${stamp}-${rand}.${ext}`
}

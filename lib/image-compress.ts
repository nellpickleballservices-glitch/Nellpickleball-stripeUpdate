/**
 * Compress an uploaded image in the browser before sending it to Supabase.
 * Returns a new File (WebP) or the original if compression isn't worth it.
 *
 * Skips:
 *   - GIFs (animation would be lost)
 *   - Files already under `skipBelowBytes` (default 200 KB)
 *   - Any error → falls back to the original file silently
 *
 * Defaults: max 1920 px on the longest side, WebP at 82% quality.
 */
export interface CompressOptions {
  maxWidth?: number
  quality?: number
  skipBelowBytes?: number
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const maxWidth = opts.maxWidth ?? 1920
  const quality = opts.quality ?? 0.82
  const skipBelowBytes = opts.skipBelowBytes ?? 200 * 1024

  // Skip cases where compression would hurt or has no benefit.
  if (file.type === 'image/gif') return file
  if (file.type === 'image/svg+xml') return file
  if (file.size < skipBelowBytes) return file
  if (typeof document === 'undefined') return file

  try {
    const dataUrl = await readAsDataURL(file)
    const img = await loadImage(dataUrl)

    const longest = Math.max(img.naturalWidth, img.naturalHeight)
    const scale = longest > maxWidth ? maxWidth / longest : 1
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)

    const blob = await canvasToBlob(canvas, 'image/webp', quality)
    if (!blob) return file

    // If WebP ended up bigger than the source (rare on already-optimized inputs),
    // keep the original so we never make things worse.
    if (blob.size >= file.size) return file

    const newName = file.name.replace(/\.[^.]+$/, '') + '.webp'
    return new File([blob], newName, { type: 'image/webp', lastModified: Date.now() })
  } catch {
    return file
  }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))
}

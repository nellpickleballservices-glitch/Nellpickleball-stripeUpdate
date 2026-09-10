import { put } from '@vercel/blob'

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'] as const

const MAX_IMAGE_SIZE = 10 * 1024 * 1024   // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024  // 100 MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm',
  'video/quicktime': 'mov',
}

interface UploadOptions {
  /** Subfolder prefix in the blob store (e.g. "gallery", "expeditions"). */
  folder: string
  /** Allow video MIME types in addition to images. */
  allowVideo?: boolean
}

/**
 * Validate and upload a file to Vercel Blob.
 * Returns the public URL of the uploaded file.
 */
export async function uploadToBlob(file: File, opts: UploadOptions): Promise<string> {
  if (!file || file.size === 0) throw new Error('No file provided')

  const isImage = (ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type)
  const isVideo = opts.allowVideo && (ALLOWED_VIDEO_MIME as readonly string[]).includes(file.type)

  if (!isImage && !isVideo) {
    const allowed = opts.allowVideo
      ? 'JPEG, PNG, WebP, GIF images and MP4, WebM, MOV videos'
      : 'JPEG, PNG, WebP, and GIF images'
    throw new Error(`Only ${allowed} are allowed`)
  }

  const sizeLimit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
  if (file.size > sizeLimit) {
    const mb = Math.round(sizeLimit / 1024 / 1024)
    throw new Error(`File must be smaller than ${mb} MB`)
  }

  const ext = MIME_TO_EXT[file.type] ?? (isVideo ? 'mp4' : 'jpg')
  const fileName = `${opts.folder}/${crypto.randomUUID()}.${ext}`

  const blob = await put(fileName, file, {
    access: 'public',
    contentType: file.type,
  })

  return blob.url
}

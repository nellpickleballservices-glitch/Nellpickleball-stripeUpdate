'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { GalleryItem } from '@/lib/types/admin'

export async function getGalleryItemsAction(): Promise<GalleryItem[]> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('gallery_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[gallery] getGalleryItems error:', error.message)
    throw new Error('Operation failed')
  }
  return (data ?? []) as GalleryItem[]
}

function validateUrl(url: string | null, fieldName: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`${fieldName} must use http or https`)
    }
  } catch {
    throw new Error(`${fieldName} must use http or https`)
  }
  return url
}

export async function createGalleryItemAction(formData: FormData): Promise<{ success: boolean }> {
  await requireAdmin()

  const media_type = formData.get('media_type') as string
  const url = formData.get('url') as string
  const grid_size = formData.get('grid_size') as string

  if (!url) throw new Error('URL is required')
  if (!['image', 'video'].includes(media_type)) throw new Error('Invalid media type')
  if (!['1x1', '1x2', '2x1', '2x2'].includes(grid_size)) throw new Error('Invalid grid size')

  validateUrl(url, 'URL')
  const thumbnail_url = validateUrl((formData.get('thumbnail_url') as string) || null, 'Thumbnail URL')

  const sortRaw = formData.get('sort_order') as string | null
  const sort_order = sortRaw && sortRaw.trim() !== '' ? parseInt(sortRaw, 10) : 0
  if (isNaN(sort_order) || sort_order < 0) throw new Error('Invalid sort order')

  const { error } = await supabaseAdmin.from('gallery_items').insert({
    media_type,
    url,
    thumbnail_url,
    title_es: (formData.get('title_es') as string) || null,
    title_en: (formData.get('title_en') as string) || null,
    caption_es: (formData.get('caption_es') as string) || null,
    caption_en: (formData.get('caption_en') as string) || null,
    grid_size,
    sort_order,
    is_visible: formData.get('is_visible') === 'on',
  })

  if (error) {
    console.error('[gallery] createGalleryItem error:', error.message)
    throw new Error('Operation failed')
  }
  return { success: true }
}

export async function updateGalleryItemAction(
  itemId: string,
  formData: FormData
): Promise<{ success: boolean }> {
  await requireAdmin()

  const media_type = formData.get('media_type') as string
  const url = formData.get('url') as string
  const grid_size = formData.get('grid_size') as string

  if (!url) throw new Error('URL is required')
  if (!['image', 'video'].includes(media_type)) throw new Error('Invalid media type')
  if (!['1x1', '1x2', '2x1', '2x2'].includes(grid_size)) throw new Error('Invalid grid size')

  validateUrl(url, 'URL')
  const thumbnail_url = validateUrl((formData.get('thumbnail_url') as string) || null, 'Thumbnail URL')

  const sortRaw = formData.get('sort_order') as string | null
  const sort_order = sortRaw && sortRaw.trim() !== '' ? parseInt(sortRaw, 10) : 0
  if (isNaN(sort_order) || sort_order < 0) throw new Error('Invalid sort order')

  const { error } = await supabaseAdmin
    .from('gallery_items')
    .update({
      media_type,
      url,
      thumbnail_url,
      title_es: (formData.get('title_es') as string) || null,
      title_en: (formData.get('title_en') as string) || null,
      caption_es: (formData.get('caption_es') as string) || null,
      caption_en: (formData.get('caption_en') as string) || null,
      grid_size,
      sort_order,
      is_visible: formData.get('is_visible') === 'on',
    })
    .eq('id', itemId)

  if (error) {
    console.error('[gallery] updateGalleryItem error:', error.message)
    throw new Error('Operation failed')
  }
  return { success: true }
}

const GALLERY_BUCKET = 'gallery'
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime']
const ALLOWED_MIME = [...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME]
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100 MB — videos are heavy even when compressed

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  if (!buckets?.find((b) => b.name === GALLERY_BUCKET)) {
    const { error } = await supabaseAdmin.storage.createBucket(GALLERY_BUCKET, {
      public: true,
      fileSizeLimit: MAX_VIDEO_SIZE,
      allowedMimeTypes: ALLOWED_MIME,
    })
    if (error && !error.message.includes('already exists')) {
      throw error
    }
  } else {
    // Bucket exists — keep its MIME-type allowlist and size cap in sync with
    // the constants above so newly-allowed types (e.g. video) take effect.
    const { error } = await supabaseAdmin.storage.updateBucket(GALLERY_BUCKET, {
      public: true,
      fileSizeLimit: MAX_VIDEO_SIZE,
      allowedMimeTypes: ALLOWED_MIME,
    })
    if (error) {
      console.error('[gallery] updateBucket error:', error.message)
      // Don't throw — the bucket may still accept the file even if updating
      // its settings failed (e.g. permission scope). The upload below will
      // surface its own error if the existing allowlist rejects the file.
    }
  }
}

export async function uploadGalleryFileAction(formData: FormData): Promise<{ url: string }> {
  await requireAdmin()

  const file = formData.get('file') as File
  if (!file || file.size === 0) throw new Error('No file provided')

  const isVideo = ALLOWED_VIDEO_MIME.includes(file.type)
  const isImage = ALLOWED_IMAGE_MIME.includes(file.type)
  if (!isImage && !isVideo) {
    throw new Error('Only JPEG/PNG/WebP/GIF images and MP4/WebM/MOV videos are allowed')
  }

  const sizeLimit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
  if (file.size > sizeLimit) {
    const mb = Math.round(sizeLimit / 1024 / 1024)
    throw new Error(`File must be smaller than ${mb} MB`)
  }

  await ensureBucket()

  const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm',
    'video/quicktime': 'mov',
  }
  const ext = MIME_TO_EXT[file.type] ?? (isVideo ? 'mp4' : 'jpg')
  const fileName = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from(GALLERY_BUCKET)
    .upload(fileName, file, { contentType: file.type, upsert: false })

  if (error) {
    console.error('[gallery] upload error:', error.message, {
      contentType: file.type,
      size: file.size,
      bucket: GALLERY_BUCKET,
    })
    // Surface the actual Supabase message so the UI can show a real cause
    // (e.g. "mime type not allowed", "Payload too large").
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(GALLERY_BUCKET)
    .getPublicUrl(fileName)

  return { url: urlData.publicUrl }
}

export async function deleteGalleryItemAction(itemId: string): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin.from('gallery_items').delete().eq('id', itemId)
  if (error) {
    console.error('[gallery] deleteGalleryItem error:', error.message)
    throw new Error('Operation failed')
  }
  return { success: true }
}

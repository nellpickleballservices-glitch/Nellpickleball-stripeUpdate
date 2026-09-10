'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { GalleryItem } from '@/lib/types/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  const trim = (key: string, max: number) => {
    const v = (formData.get(key) as string)?.trim() || null
    return v && v.length > max ? v.slice(0, max) : v
  }

  const { error } = await supabaseAdmin.from('gallery_items').insert({
    media_type,
    url,
    thumbnail_url,
    title_es: trim('title_es', 200),
    title_en: trim('title_en', 200),
    caption_es: trim('caption_es', 500),
    caption_en: trim('caption_en', 500),
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
  if (!UUID_RE.test(itemId)) throw new Error('Invalid ID')

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

  const trim = (key: string, max: number) => {
    const v = (formData.get(key) as string)?.trim() || null
    return v && v.length > max ? v.slice(0, max) : v
  }

  const { error } = await supabaseAdmin
    .from('gallery_items')
    .update({
      media_type,
      url,
      thumbnail_url,
      title_es: trim('title_es', 200),
      title_en: trim('title_en', 200),
      caption_es: trim('caption_es', 500),
      caption_en: trim('caption_en', 500),
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

export async function uploadGalleryFileAction(formData: FormData): Promise<{ url: string }> {
  await requireAdmin()

  const { uploadToBlob } = await import('@/lib/blob')
  const file = formData.get('file') as File
  const url = await uploadToBlob(file, { folder: 'gallery', allowVideo: true })
  return { url }
}

export async function deleteGalleryItemAction(itemId: string): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!UUID_RE.test(itemId)) throw new Error('Invalid ID')

  const { error } = await supabaseAdmin.from('gallery_items').delete().eq('id', itemId)
  if (error) {
    console.error('[gallery] deleteGalleryItem error:', error.message)
    throw new Error('Operation failed')
  }
  return { success: true }
}

import type { Expedition } from '@/lib/types/admin'

/**
 * Resolve the ordered list of images for an expedition's carousel.
 * Falls back to the single cover image for rows created before multi-image support.
 */
export function getExpeditionImages(exp: Pick<Expedition, 'image_url' | 'image_urls'>): string[] {
  const list = exp.image_urls && exp.image_urls.length > 0 ? exp.image_urls : exp.image_url ? [exp.image_url] : []
  return list.filter(Boolean)
}

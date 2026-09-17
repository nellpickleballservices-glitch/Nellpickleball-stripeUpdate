'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deleteManyFromBlob } from '@/lib/blob'
import type { Expedition } from '@/lib/types/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXPEDITIONS_TAG = 'expeditions'

// Cached read paths — the homepage and detail page call these on every render.
// Tagged so admin create/update/delete can invalidate immediately.
const fetchPublishedExpeditions = unstable_cache(
  async (): Promise<Expedition[]> => {
    const { data, error } = await supabaseAdmin
      .from('expeditions')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('start_date', { ascending: true })

    if (error) {
      console.error('[expeditions] getPublishedExpeditions error:', error.message)
      return []
    }
    return (data ?? []) as Expedition[]
  },
  ['published-expeditions'],
  { tags: [EXPEDITIONS_TAG], revalidate: 300 }
)

const fetchExpeditionById = unstable_cache(
  async (id: string): Promise<Expedition | null> => {
    const { data, error } = await supabaseAdmin
      .from('expeditions')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single()

    if (error || !data) return null
    return data as Expedition
  },
  ['expedition-by-id'],
  { tags: [EXPEDITIONS_TAG], revalidate: 300 }
)

function validateUrl(url: string, field: string): void {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
  } catch {
    throw new Error(`${field} must be a valid http/https URL`)
  }
}

function parseImageUrls(formData: FormData): string[] {
  const raw = (formData.get('image_urls') as string) ?? '[]'
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Invalid images')
  }
  if (!Array.isArray(parsed)) throw new Error('Invalid images')

  const urls = parsed.map((u) => String(u).trim()).filter(Boolean)
  if (urls.length === 0) throw new Error('At least one image is required')
  urls.forEach((u) => validateUrl(u, 'Image URL'))
  return urls
}

// Length caps prevent storing pathological payloads even from an authenticated
// admin (compromised session, XSS poisoning, copy-paste mishap).
const MAX_TITLE_LEN = 200
const MAX_DESCRIPTION_LEN = 2000
const MAX_DETAILS_LEN = 100_000 // ~100 KB of JSON blocks
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function checkLen(value: string | null | undefined, max: number, field: string): void {
  if (value && value.length > max) {
    throw new Error(`${field} must be ${max} characters or less`)
  }
}

function parseExpeditionForm(formData: FormData) {
  const title_es = (formData.get('title_es') as string)?.trim()
  const title_en = (formData.get('title_en') as string)?.trim()
  const start_date = (formData.get('start_date') as string)?.trim()
  const end_date = (formData.get('end_date') as string)?.trim()
  const expires_at_raw = (formData.get('expires_at') as string)?.trim()
  const expires_at = expires_at_raw ? expires_at_raw : null

  if (!title_es) throw new Error('Spanish title is required')
  if (!title_en) throw new Error('English title is required')
  if (!start_date) throw new Error('Start date is required')
  if (!end_date) throw new Error('End date is required')

  // Strict date-format check — rejects anything that isn't YYYY-MM-DD.
  if (!DATE_RE.test(start_date)) throw new Error('Invalid start date')
  if (!DATE_RE.test(end_date)) throw new Error('Invalid end date')
  if (expires_at && !DATE_RE.test(expires_at)) throw new Error('Invalid expiration date')
  if (new Date(end_date).getTime() < new Date(start_date).getTime()) {
    throw new Error('End date must be on or after the start date')
  }

  const description_es = (formData.get('description_es') as string) || null
  const description_en = (formData.get('description_en') as string) || null
  const details_es = (formData.get('details_es') as string) || null
  const details_en = (formData.get('details_en') as string) || null

  // Length caps — defense-in-depth against payload-storage abuse.
  checkLen(title_es, MAX_TITLE_LEN, 'Spanish title')
  checkLen(title_en, MAX_TITLE_LEN, 'English title')
  checkLen(description_es, MAX_DESCRIPTION_LEN, 'Spanish description')
  checkLen(description_en, MAX_DESCRIPTION_LEN, 'English description')
  checkLen(details_es, MAX_DETAILS_LEN, 'Spanish details')
  checkLen(details_en, MAX_DETAILS_LEN, 'English details')

  const image_urls = parseImageUrls(formData)
  const image_url = image_urls[0] // first image is the cover (used for OpenGraph)

  const sortRaw = formData.get('sort_order') as string | null
  const sort_order = sortRaw && sortRaw.trim() !== '' ? parseInt(sortRaw, 10) : 0
  if (isNaN(sort_order) || sort_order < 0 || sort_order > 10_000) {
    throw new Error('Invalid sort order')
  }

  return {
    title_es,
    title_en,
    description_es,
    description_en,
    details_es,
    details_en,
    image_url,
    image_urls,
    start_date,
    end_date,
    expires_at,
    is_published: formData.get('is_published') === 'on',
    sort_order,
  }
}

export async function getExpeditionsAction(): Promise<Expedition[]> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('expeditions')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('start_date', { ascending: true })

  if (error) {
    console.error('[expeditions] getExpeditions error:', error.message)
    throw new Error('Operation failed')
  }
  return (data ?? []) as Expedition[]
}

export async function getPublishedExpeditionsAction(): Promise<Expedition[]> {
  return fetchPublishedExpeditions()
}

export async function getExpeditionByIdAction(id: string): Promise<Expedition | null> {
  if (!UUID_RE.test(id)) return null
  return fetchExpeditionById(id)
}

export async function createExpeditionAction(formData: FormData): Promise<{ success: boolean }> {
  await requireAdmin()

  const payload = parseExpeditionForm(formData)

  const { error } = await supabaseAdmin.from('expeditions').insert(payload)

  if (error) {
    console.error('[expeditions] createExpedition error:', error.message)
    throw new Error('Operation failed')
  }

  revalidateTag(EXPEDITIONS_TAG, 'max')
  revalidatePath('/')
  return { success: true }
}

export async function updateExpeditionAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!UUID_RE.test(id)) throw new Error('Invalid ID')

  const { data: old } = await supabaseAdmin
    .from('expeditions')
    .select('image_urls')
    .eq('id', id)
    .single()

  const payload = parseExpeditionForm(formData)

  const { error } = await supabaseAdmin
    .from('expeditions')
    .update(payload)
    .eq('id', id)

  if (error) {
    console.error('[expeditions] updateExpedition error:', error.message)
    throw new Error('Operation failed')
  }

  if (old) {
    const oldUrls = (old.image_urls as string[] | null) ?? []
    const newUrls = (payload.image_urls as string[] | null) ?? []
    const removed = oldUrls.filter((u) => !newUrls.includes(u))
    if (removed.length > 0) void deleteManyFromBlob(removed)
  }

  revalidateTag(EXPEDITIONS_TAG, 'max')
  revalidatePath('/')
  revalidatePath(`/expeditions/${id}`)
  return { success: true }
}

export async function deleteExpeditionAction(id: string): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!UUID_RE.test(id)) throw new Error('Invalid ID')

  const { data: old } = await supabaseAdmin
    .from('expeditions')
    .select('image_urls')
    .eq('id', id)
    .single()

  const { error } = await supabaseAdmin.from('expeditions').delete().eq('id', id)

  if (error) {
    console.error('[expeditions] deleteExpedition error:', error.message)
    throw new Error('Operation failed')
  }

  if (old) {
    const urls = (old.image_urls as string[] | null) ?? []
    if (urls.length > 0) void deleteManyFromBlob(urls)
  }

  revalidateTag(EXPEDITIONS_TAG, 'max')
  revalidatePath('/')
  return { success: true }
}

export async function uploadExpeditionImageAction(formData: FormData): Promise<{ url: string }> {
  await requireAdmin()

  const { uploadToBlob } = await import('@/lib/blob')
  const file = formData.get('file') as File
  const url = await uploadToBlob(file, { folder: 'expeditions' })
  return { url }
}

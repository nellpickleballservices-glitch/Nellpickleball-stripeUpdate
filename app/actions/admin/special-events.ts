'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deleteFromBlob, deleteManyFromBlob } from '@/lib/blob'
import {
  SPECIAL_EVENTS_TAG,
  type SpecialEvent,
  type AdminSpecialEventSignup,
  type PaymentStatus,
} from '@/lib/types/special-events'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

const MAX_TITLE_LEN = 200
const MAX_DESCRIPTION_LEN = 2000
const MAX_DETAILS_LEN = 100_000

function checkLen(value: string | null | undefined, max: number, field: string): void {
  if (value && value.length > max) {
    throw new Error(`${field} must be ${max} characters or less`)
  }
}

function validateUrl(url: string): void {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
  } catch {
    throw new Error('Image URL must be a valid http/https URL')
  }
}

function parseJsonArray(formData: FormData, field: string): unknown[] {
  const raw = (formData.get(field) as string) ?? '[]'
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error()
    return parsed
  } catch {
    throw new Error(`Invalid ${field}`)
  }
}

function parseSpecialEventForm(formData: FormData) {
  const title_es = (formData.get('title_es') as string)?.trim()
  const title_en = (formData.get('title_en') as string)?.trim()
  if (!title_es) throw new Error('Spanish title is required')
  if (!title_en) throw new Error('English title is required')

  const start_time = (formData.get('start_time') as string)?.trim()
  const end_time = (formData.get('end_time') as string)?.trim()
  if (!TIME_RE.test(start_time ?? '')) throw new Error('Invalid start time')
  if (!TIME_RE.test(end_time ?? '')) throw new Error('Invalid end time')
  if (end_time <= start_time) throw new Error('End time must be after the start time')

  const event_date = ((formData.get('event_date') as string) ?? '').trim()
  if (!DATE_RE.test(event_date)) throw new Error('Event date is required')

  const image_urls = parseJsonArray(formData, 'image_urls')
    .map((u) => String(u).trim())
    .filter(Boolean)
  image_urls.forEach(validateUrl)

  const capacity = parseInt((formData.get('capacity') as string) ?? '20', 10)
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    throw new Error('Capacity must be between 1 and 500')
  }

  const priceRaw = ((formData.get('price') as string) ?? '0').trim()
  const priceNum = priceRaw === '' ? 0 : Number(priceRaw)
  if (!Number.isFinite(priceNum) || priceNum < 0 || priceNum > 100_000) {
    throw new Error('Invalid price')
  }
  const price_cents = Math.round(priceNum * 100)

  const currency = ((formData.get('currency') as string) ?? 'usd').toLowerCase()
  if (currency !== 'usd' && currency !== 'dop') throw new Error('Invalid currency')

  // Promo pricing
  let promo_price_cents: number | null = null
  let promo_expires_at: string | null = null
  const promoEnabled = formData.get('promo_enabled') === 'on'
  if (promoEnabled) {
    const promoPriceRaw = ((formData.get('promo_price') as string) ?? '').trim()
    const promoNum = promoPriceRaw === '' ? null : Number(promoPriceRaw)
    if (promoNum !== null && (!Number.isFinite(promoNum) || promoNum < 0 || promoNum > 100_000)) {
      throw new Error('Invalid promotional price')
    }
    promo_price_cents = promoNum !== null ? Math.round(promoNum * 100) : null

    const promoDateRaw = ((formData.get('promo_expires_at') as string) ?? '').trim()
    if (promo_price_cents !== null && !promoDateRaw) {
      throw new Error('Promotional expiry date is required when promo price is set')
    }
    promo_expires_at = promoDateRaw ? new Date(promoDateRaw).toISOString() : null

    if ((promo_price_cents === null) !== (promo_expires_at === null)) {
      throw new Error('Both promo price and expiry date must be set together')
    }
  }

  const allow_stripe = formData.get('allow_stripe') === 'on'
  const allow_cash = formData.get('allow_cash') === 'on'
  if (!allow_stripe && !allow_cash) {
    throw new Error('Enable at least one payment method')
  }

  const card_size = ((formData.get('card_size') as string) ?? 'normal').toLowerCase()
  if (card_size !== 'normal' && card_size !== 'large' && card_size !== 'featured') {
    throw new Error('Invalid card size')
  }

  const description_es = (formData.get('description_es') as string) || null
  const description_en = (formData.get('description_en') as string) || null
  const details_es = (formData.get('details_es') as string) || null
  const details_en = (formData.get('details_en') as string) || null

  checkLen(title_es, MAX_TITLE_LEN, 'Spanish title')
  checkLen(title_en, MAX_TITLE_LEN, 'English title')
  checkLen(description_es, MAX_DESCRIPTION_LEN, 'Spanish description')
  checkLen(description_en, MAX_DESCRIPTION_LEN, 'English description')
  checkLen(details_es, MAX_DETAILS_LEN, 'Spanish details')
  checkLen(details_en, MAX_DETAILS_LEN, 'English details')

  const hero_title_es = ((formData.get('hero_title_es') as string) ?? '').trim() || null
  const hero_title_en = ((formData.get('hero_title_en') as string) ?? '').trim() || null
  const hero_subtitle_es = ((formData.get('hero_subtitle_es') as string) ?? '').trim() || null
  const hero_subtitle_en = ((formData.get('hero_subtitle_en') as string) ?? '').trim() || null
  const hero_image_url = ((formData.get('hero_image_url') as string) ?? '').trim() || null
  if (hero_image_url) validateUrl(hero_image_url)

  checkLen(hero_title_es, MAX_TITLE_LEN, 'Hero title (ES)')
  checkLen(hero_title_en, MAX_TITLE_LEN, 'Hero title (EN)')
  checkLen(hero_subtitle_es, MAX_DESCRIPTION_LEN, 'Hero subtitle (ES)')
  checkLen(hero_subtitle_en, MAX_DESCRIPTION_LEN, 'Hero subtitle (EN)')

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
    image_url: image_urls[0] ?? null,
    image_urls,
    event_date,
    start_time,
    end_time,
    capacity,
    price_cents,
    currency,
    promo_price_cents,
    promo_expires_at,
    allow_stripe,
    allow_cash,
    card_size,
    hero_title_es,
    hero_title_en,
    hero_subtitle_es,
    hero_subtitle_en,
    hero_image_url,
    location_name: ((formData.get('location_name') as string) || '').trim() || null,
    is_published: formData.get('is_published') === 'on',
    sort_order,
    updated_at: new Date().toISOString(),
  }
}

function invalidate(id?: string) {
  revalidateTag(SPECIAL_EVENTS_TAG, 'max')
  revalidatePath('/')
  if (id) revalidatePath(`/special-events/${id}`)
}

// ─────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────

export async function getSpecialEventsAction(): Promise<SpecialEvent[]> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('special_events')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('event_date', { ascending: true })

  if (error) {
    console.error('[special-events] getSpecialEvents error:', error.message)
    throw new Error('Operation failed')
  }
  return (data ?? []) as SpecialEvent[]
}

export async function createSpecialEventAction(formData: FormData): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin.from('special_events').insert(parseSpecialEventForm(formData))

  if (error) {
    console.error('[special-events] createSpecialEvent error:', error.message)
    throw new Error('Operation failed')
  }

  invalidate()
  return { success: true }
}

export async function updateSpecialEventAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!UUID_RE.test(id)) throw new Error('Invalid ID')

  // Fetch old images before update for cleanup
  const { data: old } = await supabaseAdmin
    .from('special_events')
    .select('image_urls, hero_image_url')
    .eq('id', id)
    .single()

  const parsed = parseSpecialEventForm(formData)

  const { error } = await supabaseAdmin
    .from('special_events')
    .update(parsed)
    .eq('id', id)

  if (error) {
    console.error('[special-events] updateSpecialEvent error:', error.message)
    throw new Error('Operation failed')
  }

  // Clean up replaced images
  if (old) {
    const oldUrls = (old.image_urls as string[] | null) ?? []
    const newUrls = (parsed.image_urls as string[] | null) ?? []
    const removed = oldUrls.filter((u) => !newUrls.includes(u))
    if (removed.length > 0) void deleteManyFromBlob(removed)

    const oldHero = old.hero_image_url as string | null
    if (oldHero && oldHero !== parsed.hero_image_url) void deleteFromBlob(oldHero)
  }

  invalidate(id)
  return { success: true }
}

export async function deleteSpecialEventAction(id: string): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!UUID_RE.test(id)) throw new Error('Invalid ID')

  // Fetch images before delete for cleanup
  const { data: old } = await supabaseAdmin
    .from('special_events')
    .select('image_urls, hero_image_url')
    .eq('id', id)
    .single()

  const { error } = await supabaseAdmin.from('special_events').delete().eq('id', id)

  if (error) {
    console.error('[special-events] deleteSpecialEvent error:', error.message)
    throw new Error('Operation failed')
  }

  // Clean up all blobs
  if (old) {
    const urls = (old.image_urls as string[] | null) ?? []
    if (old.hero_image_url) urls.push(old.hero_image_url as string)
    if (urls.length > 0) void deleteManyFromBlob(urls)
  }

  invalidate(id)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────
// Roster
// ─────────────────────────────────────────────────────────────────────────

export async function getSpecialEventSignupsAction(
  eventId?: string
): Promise<AdminSpecialEventSignup[]> {
  await requireAdmin()
  if (eventId && !UUID_RE.test(eventId)) throw new Error('Invalid ID')

  let query = supabaseAdmin
    .from('special_event_signups')
    .select('*, special_events(title_en, title_es)')
    .order('created_at', { ascending: true })

  if (eventId) query = query.eq('event_id', eventId)

  const { data, error } = await query

  if (error) {
    console.error('[special-events] getSignups error:', error.message)
    throw new Error('Operation failed')
  }

  return (data ?? []).map((row) => {
    const { special_events, ...signup } = row as Record<string, unknown> & {
      special_events: { title_en: string; title_es: string } | null
    }
    return {
      ...(signup as unknown as AdminSpecialEventSignup),
      event_title: special_events?.title_en ?? special_events?.title_es ?? null,
    }
  })
}

const ALLOWED_STATUSES: PaymentStatus[] = ['pending', 'paid', 'cancelled', 'refunded']

export async function updateSpecialEventSignupStatusAction(
  id: string,
  status: PaymentStatus
): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!UUID_RE.test(id)) throw new Error('Invalid ID')
  if (!ALLOWED_STATUSES.includes(status)) throw new Error('Invalid status')

  const { error } = await supabaseAdmin
    .from('special_event_signups')
    .update({
      payment_status: status,
      hold_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[special-events] updateSignupStatus error:', error.message)
    throw new Error('Operation failed')
  }

  invalidate()
  return { success: true }
}

export async function deleteSpecialEventSignupAction(id: string): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!UUID_RE.test(id)) throw new Error('Invalid ID')

  const { error } = await supabaseAdmin.from('special_event_signups').delete().eq('id', id)

  if (error) {
    console.error('[special-events] deleteSignup error:', error.message)
    throw new Error('Operation failed')
  }

  invalidate()
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────
// Image upload
// ─────────────────────────────────────────────────────────────────────────

export async function uploadSpecialEventImageAction(formData: FormData): Promise<{ url: string }> {
  console.log('[special-events] upload: action called')
  await requireAdmin()
  console.log('[special-events] upload: admin check passed')

  const { uploadToBlob } = await import('@/lib/blob')
  const file = formData.get('file') as File
  if (!file || file.size === 0) {
    console.error('[special-events] upload: no file or empty file')
    throw new Error('No file provided')
  }
  console.log('[special-events] upload: file=%s size=%d type=%s', file.name, file.size, file.type)
  const url = await uploadToBlob(file, { folder: 'special-events' })
  console.log('[special-events] upload: success url=%s', url)
  return { url }
}

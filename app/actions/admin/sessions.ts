'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deleteManyFromBlob } from '@/lib/blob'
import { SESSIONS_TAG } from '@/lib/sessions'
import type {
  PlaySession,
  AdminSessionSignup,
  DayOfWeek,
  PaymentStatus,
} from '@/lib/types/sessions'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

// Length caps — defense-in-depth against payload-storage abuse, even from an
// authenticated admin (compromised session, copy-paste mishap).
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

function parseSessionForm(formData: FormData) {
  const title_es = (formData.get('title_es') as string)?.trim()
  const title_en = (formData.get('title_en') as string)?.trim()
  if (!title_es) throw new Error('Spanish title is required')
  if (!title_en) throw new Error('English title is required')

  const start_time = (formData.get('start_time') as string)?.trim()
  const end_time = (formData.get('end_time') as string)?.trim()
  if (!TIME_RE.test(start_time ?? '')) throw new Error('Invalid start time')
  if (!TIME_RE.test(end_time ?? '')) throw new Error('Invalid end time')
  if (end_time <= start_time) throw new Error('End time must be after the start time')

  // Two shapes, mirroring play_sessions_recurrence in 0026: a recurring series
  // needs weekdays and a horizon, a one-time game needs a single date. Each
  // clears the other's columns so a row can never claim to be both.
  const is_recurring = formData.get('is_recurring') !== 'false'

  const days_of_week = is_recurring
    ? (parseJsonArray(formData, 'days_of_week')
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) as DayOfWeek[])
    : []
  if (is_recurring && days_of_week.length === 0) {
    throw new Error('Pick at least one day of the week')
  }

  let specific_date: string | null = null
  if (!is_recurring) {
    const raw = ((formData.get('specific_date') as string) ?? '').trim()
    if (!DATE_RE.test(raw)) throw new Error('Pick the date this session runs')
    specific_date = raw
  }

  const blackout_dates = parseJsonArray(formData, 'blackout_dates')
    .map((d) => String(d).trim())
    .filter((d) => DATE_RE.test(d))

  const image_urls = parseJsonArray(formData, 'image_urls')
    .map((u) => String(u).trim())
    .filter(Boolean)
  image_urls.forEach(validateUrl)

  const capacity = parseInt((formData.get('capacity') as string) ?? '10', 10)
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
    throw new Error('Capacity must be between 1 and 100')
  }

  // Price arrives as a decimal string ("15.00"); cents is what we store, so
  // rounding happens once, here, rather than drifting across the codebase.
  const priceRaw = ((formData.get('price') as string) ?? '0').trim()
  const priceNum = priceRaw === '' ? 0 : Number(priceRaw)
  if (!Number.isFinite(priceNum) || priceNum < 0 || priceNum > 10_000) {
    throw new Error('Invalid price')
  }
  const price_cents = Math.round(priceNum * 100)

  const currency = ((formData.get('currency') as string) ?? 'usd').toLowerCase()
  if (currency !== 'usd' && currency !== 'dop') throw new Error('Invalid currency')

  // Meaningless for a one-time session, and nullable in the database precisely
  // so the row doesn't have to invent a horizon it will never use.
  let weeks_ahead: number | null = null
  if (is_recurring) {
    weeks_ahead = parseInt((formData.get('weeks_ahead') as string) ?? '8', 10)
    if (!Number.isInteger(weeks_ahead) || weeks_ahead < 1 || weeks_ahead > 52) {
      throw new Error('Weeks ahead must be between 1 and 52')
    }
  }

  // A session with no payment path at all is unbookable, so the database
  // rejects it too (play_sessions_payment_method). Fail here with a message
  // the admin can actually act on.
  const allow_stripe = formData.get('allow_stripe') === 'on'
  const allow_cash = formData.get('allow_cash') === 'on'
  if (!allow_stripe && !allow_cash) {
    throw new Error('Enable at least one payment method')
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
    is_recurring,
    days_of_week,
    start_time,
    end_time,
    weeks_ahead,
    specific_date,
    blackout_dates,
    capacity,
    price_cents,
    currency,
    allow_stripe,
    allow_cash,
    location_name: ((formData.get('location_name') as string) || '').trim() || null,
    is_published: formData.get('is_published') === 'on',
    sort_order,
    updated_at: new Date().toISOString(),
  }
}

function invalidate(id?: string) {
  revalidateTag(SESSIONS_TAG, 'max')
  revalidatePath('/')
  if (id) revalidatePath(`/sessions/${id}`)
}

// ─────────────────────────────────────────────────────────────────────────
// Session CRUD
// ─────────────────────────────────────────────────────────────────────────

export async function getSessionsAction(): Promise<PlaySession[]> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('play_sessions')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('[sessions] getSessions error:', error.message)
    throw new Error('Operation failed')
  }
  return (data ?? []) as PlaySession[]
}

export async function createSessionAction(formData: FormData): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin.from('play_sessions').insert(parseSessionForm(formData))

  if (error) {
    console.error('[sessions] createSession error:', error.message)
    throw new Error('Operation failed')
  }

  invalidate()
  return { success: true }
}

export async function updateSessionAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!UUID_RE.test(id)) throw new Error('Invalid ID')

  const { data: old } = await supabaseAdmin
    .from('play_sessions')
    .select('image_urls')
    .eq('id', id)
    .single()

  const parsed = parseSessionForm(formData)

  const { error } = await supabaseAdmin
    .from('play_sessions')
    .update(parsed)
    .eq('id', id)

  if (error) {
    console.error('[sessions] updateSession error:', error.message)
    throw new Error('Operation failed')
  }

  if (old) {
    const oldUrls = (old.image_urls as string[] | null) ?? []
    const newUrls = (parsed.image_urls as string[] | null) ?? []
    const removed = oldUrls.filter((u) => !newUrls.includes(u))
    if (removed.length > 0) void deleteManyFromBlob(removed)
  }

  invalidate(id)
  return { success: true }
}

export async function deleteSessionAction(id: string): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!UUID_RE.test(id)) throw new Error('Invalid ID')

  const { data: old } = await supabaseAdmin
    .from('play_sessions')
    .select('image_urls')
    .eq('id', id)
    .single()

  const { error } = await supabaseAdmin.from('play_sessions').delete().eq('id', id)

  if (error) {
    console.error('[sessions] deleteSession error:', error.message)
    throw new Error('Operation failed')
  }

  if (old) {
    const urls = (old.image_urls as string[] | null) ?? []
    if (urls.length > 0) void deleteManyFromBlob(urls)
  }

  invalidate(id)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────
// Roster
// ─────────────────────────────────────────────────────────────────────────

/** Sign-ups for one session, or across all sessions when no id is given. */
export async function getSessionSignupsAction(
  sessionId?: string
): Promise<AdminSessionSignup[]> {
  await requireAdmin()
  if (sessionId && !UUID_RE.test(sessionId)) throw new Error('Invalid ID')

  let query = supabaseAdmin
    .from('session_signups')
    .select('*, play_sessions(title_en, title_es)')
    .order('session_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (sessionId) query = query.eq('session_id', sessionId)

  const { data, error } = await query

  if (error) {
    console.error('[sessions] getSignups error:', error.message)
    throw new Error('Operation failed')
  }

  return (data ?? []).map((row) => {
    const { play_sessions, ...signup } = row as Record<string, unknown> & {
      play_sessions: { title_en: string; title_es: string } | null
    }
    return {
      ...(signup as unknown as AdminSessionSignup),
      session_title: play_sessions?.title_en ?? play_sessions?.title_es ?? null,
    }
  })
}

const ALLOWED_STATUSES: PaymentStatus[] = ['pending', 'paid', 'cancelled', 'refunded']

/**
 * Used mainly to settle cash sign-ups once the money is collected, and to
 * cancel no-shows so their spot returns to the pool.
 */
export async function updateSignupStatusAction(
  id: string,
  status: PaymentStatus
): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!UUID_RE.test(id)) throw new Error('Invalid ID')
  if (!ALLOWED_STATUSES.includes(status)) throw new Error('Invalid status')

  const { error } = await supabaseAdmin
    .from('session_signups')
    .update({
      payment_status: status,
      // Settling or releasing a spot ends any pending hold.
      hold_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[sessions] updateSignupStatus error:', error.message)
    throw new Error('Operation failed')
  }

  invalidate()
  return { success: true }
}

export async function deleteSignupAction(id: string): Promise<{ success: boolean }> {
  await requireAdmin()
  if (!UUID_RE.test(id)) throw new Error('Invalid ID')

  const { error } = await supabaseAdmin.from('session_signups').delete().eq('id', id)

  if (error) {
    console.error('[sessions] deleteSignup error:', error.message)
    throw new Error('Operation failed')
  }

  invalidate()
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────
// Image upload
// ─────────────────────────────────────────────────────────────────────────

export async function uploadSessionImageAction(formData: FormData): Promise<{ url: string }> {
  await requireAdmin()

  const { uploadToBlob } = await import('@/lib/blob')
  const file = formData.get('file') as File
  const url = await uploadToBlob(file, { folder: 'sessions' })
  return { url }
}

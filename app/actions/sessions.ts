'use server'

import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured, siteOrigin } from '@/lib/stripe'
import { generateOccurrences, SESSIONS_TAG } from '@/lib/sessions'
import { sendSessionSignupEmails } from '@/lib/resend/emails'
import type {
  PlaySession,
  SessionOccurrence,
  PaymentMethod,
} from '@/lib/types/sessions'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * How long a Stripe sign-up holds its spot while the person is on the Checkout
 * page. Long enough to type a card, short enough that an abandoned checkout
 * frees the spot quickly. Stripe's own session expiry is set to match.
 */
const STRIPE_HOLD_MINUTES = 30

// ─────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────

// The session templates change rarely, so they're cached and tag-invalidated
// by the admin actions. Live sign-up COUNTS are deliberately not cached — a
// stale "2 spots left" is exactly the bug that produces angry customers.
const fetchPublishedSessions = unstable_cache(
  async (): Promise<PlaySession[]> => {
    const { data, error } = await supabaseAdmin
      .from('play_sessions')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('[sessions] getPublishedSessions error:', error.message)
      return []
    }
    return (data ?? []) as PlaySession[]
  },
  ['published-play-sessions'],
  { tags: [SESSIONS_TAG], revalidate: 300 }
)

const fetchSessionById = unstable_cache(
  async (id: string): Promise<PlaySession | null> => {
    const { data, error } = await supabaseAdmin
      .from('play_sessions')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .maybeSingle()

    if (error || !data) return null
    return data as PlaySession
  },
  ['play-session-by-id'],
  { tags: [SESSIONS_TAG], revalidate: 300 }
)

/**
 * Live occupancy for one session, keyed by date. Reads the same
 * `session_taken_count` definition the booking function enforces, so the
 * number shown to a visitor and the number the database will act on agree.
 */
async function getTakenByDate(sessionId: string): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin
    .from('session_signups')
    .select('session_date, payment_status, hold_expires_at')
    .eq('session_id', sessionId)
    .in('payment_status', ['pending', 'paid'])

  if (error) {
    console.error('[sessions] getTakenByDate error:', error.message)
    return {}
  }

  const now = Date.now()
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    // Lapsed Stripe holds have already released their spot.
    if (row.hold_expires_at && Date.parse(row.hold_expires_at) <= now) continue
    counts[row.session_date] = (counts[row.session_date] ?? 0) + 1
  }
  return counts
}

export interface SessionWithOccurrences {
  session: PlaySession
  occurrences: SessionOccurrence[]
}

/** Published sessions plus their live, unexpired dates. Powers the list page. */
export async function getPublicSessionsAction(): Promise<SessionWithOccurrences[]> {
  const sessions = await fetchPublishedSessions()

  const withDates = await Promise.all(
    sessions.map(async (session) => ({
      session,
      occurrences: generateOccurrences(session, await getTakenByDate(session.id)),
    }))
  )

  // A session whose dates have all expired (or that has no configured days)
  // has nothing bookable left, so it drops off the public list entirely.
  return withDates.filter((s) => s.occurrences.length > 0)
}

export async function getPublicSessionAction(
  id: string
): Promise<SessionWithOccurrences | null> {
  if (!UUID_RE.test(id)) return null

  const session = await fetchSessionById(id)
  if (!session) return null

  return {
    session,
    occurrences: generateOccurrences(session, await getTakenByDate(session.id)),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Sign-up
// ─────────────────────────────────────────────────────────────────────────

export interface SignupInput {
  session_id: string
  session_date: string
  name: string
  email: string
  phone?: string
  payment_method: PaymentMethod
  /** Honeypot — bots fill every field; real users never see this one. */
  hp?: string
}

export type SignupResult =
  | { success: true; kind: 'cash'; signupId: string }
  | { success: true; kind: 'stripe'; checkoutUrl: string }
  | { success: false; error: string }

/**
 * Maps the booking function's raised exceptions onto messages a visitor can
 * act on. Anything unrecognized stays generic rather than leaking SQL.
 */
function bookingErrorMessage(raw: string): string {
  if (raw.includes('SESSION_FULL')) return 'sold_out'
  if (raw.includes('ALREADY_SIGNED_UP')) return 'already_signed_up'
  if (raw.includes('SESSION_DATE_CANCELLED')) return 'date_cancelled'
  if (raw.includes('SESSION_DATE_PAST')) return 'date_past'
  if (raw.includes('SESSION_DATE_INVALID')) return 'date_invalid'
  if (raw.includes('SESSION_NOT_AVAILABLE') || raw.includes('SESSION_NOT_FOUND')) return 'unavailable'
  if (raw.includes('PAYMENT_METHOD_NOT_ALLOWED')) return 'payment_method'
  return 'generic'
}

export async function createSessionSignupAction(input: SignupInput): Promise<SignupResult> {
  // Silent honeypot reject — pretend success so bots don't retry.
  if (input.hp && input.hp.trim().length > 0) {
    return { success: true, kind: 'cash', signupId: 'ok' }
  }

  const name = input.name?.trim() ?? ''
  const email = input.email?.trim().toLowerCase() ?? ''
  const phone = input.phone?.trim() || null

  if (!UUID_RE.test(input.session_id)) return { success: false, error: 'unavailable' }
  if (!DATE_RE.test(input.session_date)) return { success: false, error: 'date_invalid' }
  if (name.length < 2 || name.length > 120) return { success: false, error: 'name' }
  if (!EMAIL_RE.test(email) || email.length > 200) return { success: false, error: 'email' }
  if (phone && phone.length > 40) return { success: false, error: 'phone' }
  if (input.payment_method !== 'stripe' && input.payment_method !== 'cash') {
    return { success: false, error: 'payment_method' }
  }
  if (input.payment_method === 'stripe' && !isStripeConfigured()) {
    return { success: false, error: 'payment_unavailable' }
  }

  // The database claims the spot. Capacity, duplicate sign-ups, blackout dates,
  // and "is this date even a real occurrence" are all enforced there under an
  // advisory lock, so two simultaneous buyers cannot both take the last spot.
  const { data, error } = await supabaseAdmin.rpc('book_session_spot', {
    p_session_id: input.session_id,
    p_date: input.session_date,
    p_name: name,
    p_email: email,
    p_phone: phone,
    p_payment_method: input.payment_method,
    p_hold_minutes: input.payment_method === 'stripe' ? STRIPE_HOLD_MINUTES : null,
  })

  if (error) {
    const code = bookingErrorMessage(error.message)
    if (code === 'generic') {
      console.error('[sessions] book_session_spot error:', error.message)
    }
    return { success: false, error: code }
  }

  // Supabase returns a `returns table`-shaped result as an array in some
  // versions and a bare object in others; normalize before touching it.
  const signup = (Array.isArray(data) ? data[0] : data) as
    | { id: string; amount_cents: number; currency: string }
    | null

  if (!signup?.id) {
    console.error('[sessions] book_session_spot returned no row')
    return { success: false, error: 'generic' }
  }

  const session = await fetchSessionById(input.session_id)

  if (input.payment_method === 'cash') {
    void sendSessionSignupEmails({
      sessionTitle: session?.title_en ?? session?.title_es ?? 'Session',
      sessionDate: input.session_date,
      startTime: session?.start_time ?? '',
      endTime: session?.end_time ?? '',
      name,
      email,
      phone,
      paymentMethod: 'cash',
      amountCents: signup.amount_cents,
      currency: signup.currency,
    })
    return { success: true, kind: 'cash', signupId: signup.id }
  }

  // Stripe path — the spot is held for STRIPE_HOLD_MINUTES while they pay.
  try {
    const stripe = getStripe()
    const origin = siteOrigin()
    const title = session?.title_en ?? session?.title_es ?? 'Pickleball session'

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: signup.currency,
            unit_amount: signup.amount_cents,
            product_data: {
              name: title,
              description: `${input.session_date} · ${(session?.start_time ?? '').slice(0, 5)}–${(session?.end_time ?? '').slice(0, 5)}`,
            },
          },
        },
      ],
      // The webhook trusts this to find the row it must mark paid.
      metadata: {
        signup_id: signup.id,
        session_id: input.session_id,
        session_date: input.session_date,
      },
      // Expire the Checkout page in step with our own hold so Stripe can't
      // accept a payment for a spot we've already released. Stripe requires
      // at least 30 minutes.
      expires_at: Math.floor(Date.now() / 1000) + STRIPE_HOLD_MINUTES * 60,
      success_url: `${origin}/sessions/success?signup=${signup.id}`,
      cancel_url: `${origin}/sessions/${input.session_id}?canceled=1`,
    })

    if (!checkout.url) throw new Error('Stripe returned no checkout URL')

    // Correlate before redirecting: the webhook may fire before the browser
    // ever comes back, and it looks the row up by this id.
    await supabaseAdmin
      .from('session_signups')
      .update({ stripe_session_id: checkout.id, updated_at: new Date().toISOString() })
      .eq('id', signup.id)

    return { success: true, kind: 'stripe', checkoutUrl: checkout.url }
  } catch (err) {
    // Checkout could not be created — release the spot immediately instead of
    // leaving a ghost hold blocking a real player for half an hour.
    await supabaseAdmin
      .from('session_signups')
      .update({ payment_status: 'cancelled', hold_expires_at: null })
      .eq('id', signup.id)

    console.error('[sessions] stripe checkout error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'payment_unavailable' }
  }
}

/** Confirmation-page lookup. Returns only what the payer already knows. */
export async function getSignupSummaryAction(signupId: string): Promise<{
  status: string
  sessionTitle: string
  sessionDate: string
  startTime: string
  endTime: string
  paymentMethod: string
} | null> {
  if (!UUID_RE.test(signupId)) return null

  const { data, error } = await supabaseAdmin
    .from('session_signups')
    .select('payment_status, payment_method, session_date, play_sessions(title_en, title_es, start_time, end_time)')
    .eq('id', signupId)
    .maybeSingle()

  if (error || !data) return null

  const session = data.play_sessions as unknown as
    | { title_en: string; title_es: string; start_time: string; end_time: string }
    | null

  return {
    status: data.payment_status,
    sessionTitle: session?.title_en ?? session?.title_es ?? '',
    sessionDate: data.session_date,
    startTime: session?.start_time ?? '',
    endTime: session?.end_time ?? '',
    paymentMethod: data.payment_method,
  }
}

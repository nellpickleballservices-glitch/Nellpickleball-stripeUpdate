'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getStripe, isStripeConfigured, siteOrigin } from '@/lib/stripe'
import { sendSpecialEventSignupEmails } from '@/lib/resend/emails'
import { SPECIAL_EVENTS_TAG } from '@/lib/types/special-events'
import { revalidateTag } from 'next/cache'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STRIPE_HOLD_MINUTES = 30

type PaymentMethod = 'stripe' | 'cash'

export interface SpecialEventSignupInput {
  event_id: string
  payment_method: PaymentMethod
}

export type SpecialEventSignupResult =
  | { success: true; kind: 'cash'; signupId: string }
  | { success: true; kind: 'stripe'; checkoutUrl: string }
  | { success: false; error: string }

function bookingErrorMessage(raw: string): string {
  if (raw.includes('EVENT_FULL')) return 'sold_out'
  if (raw.includes('ALREADY_SIGNED_UP')) return 'already_signed_up'
  if (raw.includes('EVENT_DATE_PAST')) return 'date_past'
  if (raw.includes('EVENT_NOT_AVAILABLE') || raw.includes('EVENT_NOT_FOUND')) return 'unavailable'
  if (raw.includes('PAYMENT_METHOD_NOT_ALLOWED')) return 'payment_method'
  return 'generic'
}

export async function createSpecialEventSignupAction(
  input: SpecialEventSignupInput
): Promise<SpecialEventSignupResult> {
  // Auth check — must be logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'login_required' }

  // Get user profile for name
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Guest'
  const email = user.email!.toLowerCase()

  if (!UUID_RE.test(input.event_id)) return { success: false, error: 'unavailable' }
  if (input.payment_method !== 'stripe' && input.payment_method !== 'cash') {
    return { success: false, error: 'payment_method' }
  }
  if (input.payment_method === 'stripe' && !isStripeConfigured()) {
    return { success: false, error: 'payment_unavailable' }
  }

  // ── Cash path: book immediately (no online payment needed) ──
  if (input.payment_method === 'cash') {
    const { data, error } = await supabaseAdmin.rpc('book_special_event_spot', {
      p_event_id: input.event_id,
      p_name: name,
      p_email: email,
      p_phone: null,
      p_payment_method: 'cash',
      p_hold_minutes: null,
    })

    if (error) {
      const code = bookingErrorMessage(error.message)
      if (code === 'generic') {
        console.error('[special-events] book_special_event_spot error:', error.message)
      }
      return { success: false, error: code }
    }

    const signup = (Array.isArray(data) ? data[0] : data) as
      | { id: string; amount_cents: number; currency: string }
      | null

    if (!signup?.id) {
      console.error('[special-events] book_special_event_spot returned no row')
      return { success: false, error: 'generic' }
    }

    const { data: event } = await supabaseAdmin
      .from('special_events')
      .select('title_en, title_es, event_date, start_time, end_time')
      .eq('id', input.event_id)
      .single()

    const eventTitle = event?.title_en ?? event?.title_es ?? 'Special Event'

    void sendSpecialEventSignupEmails({
      eventTitle,
      eventDate: event?.event_date ?? '',
      startTime: event?.start_time ?? '',
      endTime: event?.end_time ?? '',
      name,
      email,
      paymentMethod: 'cash',
      amountCents: signup.amount_cents,
      currency: signup.currency,
    })
    revalidateTag(SPECIAL_EVENTS_TAG, { expire: 0 })
    return { success: true, kind: 'cash', signupId: signup.id }
  }

  // ── Stripe path: validate only, defer signup to webhook ──
  // Validate capacity, duplicates, and get price without creating a signup row.
  // The actual signup is created by the Stripe webhook after payment succeeds.
  const { data: valData, error: valError } = await supabaseAdmin.rpc('validate_special_event_booking', {
    p_event_id: input.event_id,
    p_email: email,
    p_payment_method: 'stripe',
  })

  if (valError) {
    const code = bookingErrorMessage(valError.message)
    if (code === 'generic') {
      console.error('[special-events] validate_special_event_booking error:', valError.message)
    }
    return { success: false, error: code }
  }

  const validation = (Array.isArray(valData) ? valData[0] : valData) as
    | { amount_cents: number; currency: string }
    | null

  if (!validation) {
    console.error('[special-events] validate_special_event_booking returned no row')
    return { success: false, error: 'generic' }
  }

  const { data: event } = await supabaseAdmin
    .from('special_events')
    .select('title_en, title_es, event_date, start_time, end_time')
    .eq('id', input.event_id)
    .single()

  const eventTitle = event?.title_en ?? event?.title_es ?? 'Special Event'

  try {
    const stripe = getStripe()
    const origin = siteOrigin()

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: validation.currency,
            unit_amount: validation.amount_cents,
            product_data: {
              name: eventTitle,
              description: `${event?.event_date ?? ''} · ${(event?.start_time ?? '').slice(0, 5)}–${(event?.end_time ?? '').slice(0, 5)}`,
            },
          },
        },
      ],
      metadata: {
        event_id: input.event_id,
        signup_type: 'special_event',
        // Pass user info so the webhook can create the signup row
        user_name: name,
        user_email: email,
        amount_cents: String(validation.amount_cents),
        currency: validation.currency,
      },
      expires_at: Math.floor(Date.now() / 1000) + STRIPE_HOLD_MINUTES * 60,
      success_url: `${origin}/special-events/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/special-events/${input.event_id}?canceled=1`,
    })

    if (!checkout.url) throw new Error('Stripe returned no checkout URL')

    return { success: true, kind: 'stripe', checkoutUrl: checkout.url }
  } catch (err) {
    console.error('[special-events] stripe checkout error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'payment_unavailable' }
  }
}

/**
 * Cancel a user's pending (unpaid) special-event signup so the spot is
 * released immediately instead of waiting for the Stripe hold to expire.
 * Called server-side when the detail page loads with ?canceled=1.
 */
export async function cancelPendingSpecialEventSignupAction(eventId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const email = user.email!.toLowerCase()

  // Only cancel rows that are still pending with an active hold (i.e. Stripe
  // signups that were never completed).  Cash signups don't have a hold.
  await supabaseAdmin
    .from('special_event_signups')
    .update({ payment_status: 'cancelled', hold_expires_at: null, updated_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('email', email)
    .eq('payment_status', 'pending')
    .not('hold_expires_at', 'is', null)

  revalidateTag(SPECIAL_EVENTS_TAG, { expire: 0 })
}

/** Confirmation-page lookup. Supports lookup by signup ID (cash) or Stripe session ID. */
export async function getSpecialEventSignupSummaryAction(
  signupId?: string,
  stripeSessionId?: string,
): Promise<{
  status: string
  eventTitle: string
  eventDate: string
  startTime: string
  endTime: string
  paymentMethod: string
} | null> {
  if (!signupId && !stripeSessionId) return null
  if (signupId && !UUID_RE.test(signupId)) return null

  let query = supabaseAdmin
    .from('special_event_signups')
    .select('payment_status, payment_method, special_events(title_en, title_es, event_date, start_time, end_time)')

  if (signupId) {
    query = query.eq('id', signupId)
  } else {
    query = query.eq('stripe_session_id', stripeSessionId!)
  }

  const { data, error } = await query.maybeSingle()

  if (error || !data) return null

  const ev = data.special_events as unknown as
    | { title_en: string; title_es: string; event_date: string; start_time: string; end_time: string }
    | null

  return {
    status: data.payment_status,
    eventTitle: ev?.title_en ?? ev?.title_es ?? 'Special Event',
    eventDate: ev?.event_date ?? '',
    startTime: (ev?.start_time ?? '').slice(0, 5),
    endTime: (ev?.end_time ?? '').slice(0, 5),
    paymentMethod: data.payment_method,
  }
}

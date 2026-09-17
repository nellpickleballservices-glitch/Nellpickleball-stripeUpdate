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

  const { data, error } = await supabaseAdmin.rpc('book_special_event_spot', {
    p_event_id: input.event_id,
    p_name: name,
    p_email: email,
    p_phone: null,
    p_payment_method: input.payment_method,
    p_hold_minutes: input.payment_method === 'stripe' ? STRIPE_HOLD_MINUTES : null,
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

  // Fetch event details for email/checkout
  const { data: event } = await supabaseAdmin
    .from('special_events')
    .select('title_en, title_es, event_date, start_time, end_time')
    .eq('id', input.event_id)
    .single()

  const eventTitle = event?.title_en ?? event?.title_es ?? 'Special Event'

  if (input.payment_method === 'cash') {
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

  // Stripe path
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
            currency: signup.currency,
            unit_amount: signup.amount_cents,
            product_data: {
              name: eventTitle,
              description: `${event?.event_date ?? ''} · ${(event?.start_time ?? '').slice(0, 5)}–${(event?.end_time ?? '').slice(0, 5)}`,
            },
          },
        },
      ],
      metadata: {
        signup_id: signup.id,
        event_id: input.event_id,
        signup_type: 'special_event',
      },
      expires_at: Math.floor(Date.now() / 1000) + STRIPE_HOLD_MINUTES * 60,
      success_url: `${origin}/special-events/success?signup=${signup.id}`,
      cancel_url: `${origin}/special-events/${input.event_id}?canceled=1`,
    })

    if (!checkout.url) throw new Error('Stripe returned no checkout URL')

    await supabaseAdmin
      .from('special_event_signups')
      .update({ stripe_session_id: checkout.id, updated_at: new Date().toISOString() })
      .eq('id', signup.id)

    return { success: true, kind: 'stripe', checkoutUrl: checkout.url }
  } catch (err) {
    await supabaseAdmin
      .from('special_event_signups')
      .update({ payment_status: 'cancelled', hold_expires_at: null })
      .eq('id', signup.id)

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

/** Confirmation-page lookup. */
export async function getSpecialEventSignupSummaryAction(signupId: string): Promise<{
  status: string
  eventTitle: string
  eventDate: string
  startTime: string
  endTime: string
  paymentMethod: string
} | null> {
  if (!UUID_RE.test(signupId)) return null

  const { data, error } = await supabaseAdmin
    .from('special_event_signups')
    .select('payment_status, payment_method, special_events(title_en, title_es, event_date, start_time, end_time)')
    .eq('id', signupId)
    .maybeSingle()

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

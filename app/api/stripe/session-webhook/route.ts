// Stripe webhook for play-session payments.
//
// This endpoint — not the browser redirect — is the source of truth for whether
// a session was paid. A payer can close the tab before the success page loads,
// so treating the redirect as confirmation would lose real payments.

import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidateTag } from 'next/cache'
import { SESSIONS_TAG } from '@/lib/sessions'
import { sendSessionSignupEmails } from '@/lib/resend/emails'

// Signature verification needs the byte-exact body, so this must run on Node
// with no caching or body transformation in front of it.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[session-webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Raw text, never req.json() — parsing and re-serializing would change the
  // bytes the signature was computed over.
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(rawBody, signature, secret)
  } catch (err) {
    // An invalid signature means the request did not come from Stripe.
    console.error('[session-webhook] signature verification failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCompleted(event.data.object)
        break

      // The payer abandoned checkout, or our own hold window elapsed. Either
      // way the spot goes back to the pool.
      case 'checkout.session.expired':
        await handleExpired(event.data.object)
        break

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break
    }
  } catch (err) {
    // A 500 tells Stripe to retry with backoff, which is what we want for a
    // transient database failure — the payment already succeeded.
    console.error('[session-webhook] handler error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCompleted(checkout: Stripe.Checkout.Session): Promise<void> {
  const signupId = checkout.metadata?.signup_id
  if (!signupId) {
    console.error('[session-webhook] completed event with no signup_id metadata')
    return
  }

  // Only settle a spot once actual money moved. `checkout.session.completed`
  // also fires for async methods that can still fail later.
  if (checkout.payment_status !== 'paid') return

  const paymentIntent =
    typeof checkout.payment_intent === 'string'
      ? checkout.payment_intent
      : checkout.payment_intent?.id ?? null

  // Guarded on payment_status so a redelivered webhook can't re-send emails or
  // clobber a refund that was issued in the meantime.
  const { data, error } = await supabaseAdmin
    .from('session_signups')
    .update({
      payment_status: 'paid',
      stripe_payment_intent: paymentIntent,
      hold_expires_at: null, // paid spots are held permanently
      updated_at: new Date().toISOString(),
    })
    .eq('id', signupId)
    .eq('payment_status', 'pending')
    .select('id, name, email, phone, session_date, amount_cents, currency, play_sessions(title_en, title_es, start_time, end_time)')

  if (error) throw new Error(`marking paid failed: ${error.message}`)

  const row = data?.[0]
  if (!row) return // already processed — a duplicate delivery

  revalidateTag(SESSIONS_TAG, { expire: 0 })

  const session = row.play_sessions as unknown as
    | { title_en: string; title_es: string; start_time: string; end_time: string }
    | null

  void sendSessionSignupEmails({
    sessionTitle: session?.title_en ?? session?.title_es ?? 'Session',
    sessionDate: row.session_date,
    startTime: session?.start_time ?? '',
    endTime: session?.end_time ?? '',
    name: row.name,
    email: row.email,
    phone: row.phone,
    paymentMethod: 'stripe',
    amountCents: row.amount_cents,
    currency: row.currency,
  })
}

async function handleExpired(checkout: Stripe.Checkout.Session): Promise<void> {
  const signupId = checkout.metadata?.signup_id
  if (!signupId) return

  // Scoped to pending so a payment that landed just before expiry is untouched.
  const { error } = await supabaseAdmin
    .from('session_signups')
    .update({
      payment_status: 'cancelled',
      hold_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', signupId)
    .eq('payment_status', 'pending')

  if (error) throw new Error(`releasing expired hold failed: ${error.message}`)

  revalidateTag(SESSIONS_TAG, { expire: 0 })
}

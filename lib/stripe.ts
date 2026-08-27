// SERVER-ONLY: never import from a client component — STRIPE_SECRET_KEY must
// never reach the browser.
import 'server-only'
import Stripe from 'stripe'

let cached: Stripe | null = null

/**
 * Lazily constructed so importing this module doesn't throw at build time on
 * environments that have no Stripe keys (CI, preview branches). Callers that
 * actually need Stripe get a clear error instead of a cryptic 500.
 */
export function getStripe(): Stripe {
  if (cached) return cached

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  // apiVersion is intentionally omitted: this SDK version pins itself to the
  // API version it was built against, and its types reject any other value.
  // Upgrading the `stripe` package is therefore the deliberate act that moves
  // the API version, which is the behavior we want.
  cached = new Stripe(key, { typescript: true })
  return cached
}

/** Whether online payment is wired up at all. Used to hide the pay-online path. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/**
 * Absolute origin for building Stripe return URLs. Stripe rejects relative
 * paths, so this has to resolve to a real origin in every environment.
 */
export function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'
  )
}

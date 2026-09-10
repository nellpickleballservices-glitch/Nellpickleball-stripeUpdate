'use server'

import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { SPECIAL_EVENTS_TAG, type SpecialEvent } from '@/lib/types/special-events'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────

const fetchPublishedSpecialEvents = unstable_cache(
  async (): Promise<SpecialEvent[]> => {
    const { data, error } = await supabaseAdmin
      .from('special_events')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('event_date', { ascending: true })

    if (error) {
      console.error('[special-events] getPublishedSpecialEvents error:', error.message)
      return []
    }
    return (data ?? []) as SpecialEvent[]
  },
  ['published-special-events'],
  { tags: [SPECIAL_EVENTS_TAG], revalidate: 300 }
)

export interface SpecialEventWithTaken {
  event: SpecialEvent
  taken: number
  spotsLeft: number
  isFull: boolean
  /** Whether the promo price is currently active. */
  promoActive: boolean
  /** The effective price in cents right now. */
  effectivePriceCents: number
}

async function getTaken(eventId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('special_event_signups')
    .select('payment_status, hold_expires_at')
    .eq('event_id', eventId)
    .in('payment_status', ['pending', 'paid'])

  if (error) {
    console.error('[special-events] getTaken error:', error.message)
    return 0
  }

  const now = Date.now()
  let count = 0
  for (const row of data ?? []) {
    if (row.hold_expires_at && Date.parse(row.hold_expires_at) <= now) continue
    count++
  }
  return count
}

/**
 * Published special events that haven't passed yet, with live capacity.
 * Events whose date has passed are filtered out.
 */
export async function getPublicSpecialEventsAction(): Promise<SpecialEventWithTaken[]> {
  const events = await fetchPublishedSpecialEvents()
  const now = new Date()
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' }) // YYYY-MM-DD

  const results = await Promise.all(
    events
      .filter((e) => e.event_date >= todayStr)
      .map(async (event) => {
        const taken = await getTaken(event.id)
        const spotsLeft = Math.max(0, event.capacity - taken)

        const promoActive =
          event.promo_price_cents !== null &&
          event.promo_expires_at !== null &&
          now < new Date(event.promo_expires_at)

        const effectivePriceCents = promoActive
          ? event.promo_price_cents!
          : event.price_cents

        return {
          event,
          taken,
          spotsLeft,
          isFull: spotsLeft <= 0,
          promoActive,
          effectivePriceCents,
        }
      })
  )

  return results
}

export async function getPublicSpecialEventAction(
  id: string
): Promise<SpecialEventWithTaken | null> {
  if (!UUID_RE.test(id)) return null

  const { data, error } = await supabaseAdmin
    .from('special_events')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (error || !data) return null

  const event = data as SpecialEvent
  const taken = await getTaken(event.id)
  const spotsLeft = Math.max(0, event.capacity - taken)
  const now = new Date()

  const promoActive =
    event.promo_price_cents !== null &&
    event.promo_expires_at !== null &&
    now < new Date(event.promo_expires_at)

  return {
    event,
    taken,
    spotsLeft,
    isFull: spotsLeft <= 0,
    promoActive,
    effectivePriceCents: promoActive ? event.promo_price_cents! : event.price_cents,
  }
}
